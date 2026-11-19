"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowRight, ChartLine, Newspaper, Sparkle } from "@phosphor-icons/react";
import { apiDownload, apiRequest } from "@/lib/api/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAnalysisPrompt, describeAgentError, FOCUS_OPTIONS, splitReply, toAgentHistory } from "@/lib/ai/agent-chat";
import { describeSavedAt, historyKey, loadConversation, saveConversation } from "@/lib/ai/agent-history";
import { parseAgentPlan } from "@/lib/ai/agent-plan";
import { distanceFromPrice } from "@/lib/market/chart-levels";
import { formatPercent, formatPrice, Panel, SECTION_LABEL } from "../overview/ui";

const VIOLET = "#a78bfa";
const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]";
// Semua gerak memakai kurva --ai-ease dari globals.css. Tombol sedikit mengecil saat ditekan.
const MOTION = "transition-[scale,background-color,border-color,color,opacity,box-shadow] duration-150 ease-[var(--ease-out)]";
const PRESS = "active:scale-[0.97] disabled:active:scale-100";

// Hanya sumber yang benar-benar dibaca backend agent saat ini.
const DATA_SOURCES = [
    { icon: ChartLine, label: "Chart & indikator", detail: "Harga PERP live di beberapa timeframe" },
    { icon: Newspaper, label: "Berita", detail: "Pencarian berita terbaru di web" },
];

const SUGGESTIONS = ["Ringkas jadi 1 kalimat", "Ada berita terbaru?", "Kalau BTC turun 2%?"];

// Elemen dalam satu panel muncul berurutan, bukan sekaligus.
const stagger = (index, step = 50) => ({ animationDelay: `${index * step}ms` });

function prefersReducedMotion() {
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function AiTabLabel({ busy = false }) {
    return (
        <>
            <Sparkle size={14} weight="fill" color={VIOLET} aria-hidden className={`${MOTION}`} />
            AI Agent
            <span className="rounded px-[5px] py-px font-mono text-[9px] font-semibold text-[#a78bfa]" style={{ background: "rgba(167,139,250,0.2)" }}>BETA</span>
            {busy && (
                <>
                    <span className="ai-pop size-1.5 rounded-full bg-[#a78bfa] motion-safe:animate-pulse" aria-hidden />
                    <span className="sr-only">(sedang menganalisis)</span>
                </>
            )}
        </>
    );
}

function formatElapsed(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// Backend agent belum mengirim langkah kerjanya, jadi yang tampil hanya waktu
// berjalan dan progres tanpa angka, bukan daftar langkah.
function WorkingPanel({ pair, focusOption, startedAt, onCancel }) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [startedAt]);

    return (
        <Panel className="ai-rise flex flex-col gap-4 p-[18px]" role="status" aria-label="AI Agent sedang menganalisis">
            <div className="flex items-center gap-3">
                <span className="ai-glow grid size-10 shrink-0 place-items-center rounded-xl border" style={{ background: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.7)" }} aria-hidden>
                    <Sparkle size={20} weight="fill" color={VIOLET} className="motion-safe:animate-pulse" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-chakra text-[15px] font-bold text-[#f8fafc]">AI Agent sedang menganalisis</p>
                    <p className="font-chakra text-xs text-[#64748b]">{pair} · {focusOption?.label} {focusOption?.range}</p>
                </div>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-[#a78bfa]" aria-label={`${elapsed} detik berjalan`}>{formatElapsed(elapsed)}</span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-[3px] bg-[#232a30]" aria-hidden>
                <span className="ai-progress absolute inset-y-0 w-2/5 rounded-[3px] bg-gradient-to-r from-[#a78bfa]/40 via-[#a78bfa] to-[#a78bfa]/40" />
            </div>
            <p className="ai-rise font-chakra text-xs leading-[1.45] text-[#94a3b8]" style={stagger(2)}>
                Agent membaca chart dan berita {pair}. Biasanya selesai dalam 20 detik.
            </p>
            <div className="mt-auto flex flex-col gap-2.5 pt-40">
                <p className="font-chakra text-xs leading-[1.45] text-[#64748b]">Kamu tetap bisa memakai chart selama agent bekerja. Analisis yang dibatalkan bisa tetap memakai kuota.</p>
                <button type="button" onClick={onCancel}
                    className={`h-[41px] w-full rounded-[10px] border border-[#334155] bg-[#161a1e] font-chakra text-[13px] font-semibold text-[#f8fafc] hover:border-[#f87171]/50 hover:text-[#fecaca] ${MOTION} ${PRESS} ${FOCUS_RING}`}>
                    Batalkan analisis
                </button>
            </div>
        </Panel>
    );
}

function ReplyText({ text }) {
    return splitReply(text).map((block, index) => (block.type === "code" ? (
        <pre key={index} className="my-2 overflow-x-auto rounded-lg bg-[#0b0d0f] p-2.5 font-mono text-[11px] leading-relaxed text-[#cbd5e1]">{block.text}</pre>
    ) : (
        <p key={index} className="whitespace-pre-wrap">
            {block.spans.map((span, spanIndex) => (span.bold
                ? <strong key={spanIndex} className="font-semibold text-[#f8fafc]">{span.text}</strong>
                : <span key={spanIndex}>{span.text}</span>))}
        </p>
    )));
}

// Gambar chart butuh bearer, jadi diambil sebagai blob lalu ditampilkan lewat object URL.
function AgentChart({ name, pair }) {
    const [state, setState] = useState({ url: null, failed: false });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let url = null;
        let active = true;
        apiDownload(`/ai/charts/${encodeURIComponent(name)}`)
            .then(({ blob }) => {
                url = URL.createObjectURL(blob);
                if (active) setState({ url, failed: false });
                else URL.revokeObjectURL(url);
            })
            .catch(() => active && setState({ url: null, failed: true }));
        return () => {
            active = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [name]);

    if (state.failed) return <p className="ai-rise rounded-lg border border-[#232a30] px-3 py-2 font-mono text-[10px] text-[#64748b]">Chart sudah kedaluwarsa.</p>;
    return (
        <div className="relative overflow-hidden rounded-lg">
            {!loaded && <div className="aspect-[16/10] w-full rounded-lg bg-[#0b0d0f] motion-safe:animate-pulse" aria-label="Memuat chart" />}
            {state.url && (
                <a href={state.url} target="_blank" rel="noreferrer" title="Buka chart di tab baru"
                    className={`group block rounded-lg ${FOCUS_RING} ${loaded ? "" : "absolute inset-0"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- object URL dari blob, bukan aset statis */}
                    <img src={state.url} alt={`Chart ${pair} dari AI Agent`} onLoad={() => setLoaded(true)}
                        className={`w-full rounded-lg border border-[#232a30] transition-[opacity,transform,border-color] duration-500 ease-[var(--ai-ease)] group-hover:border-[#a78bfa]/50 ${loaded ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"}`} />
                </a>
            )}
        </div>
    );
}

function ChartSwitch({ checked, onChange, id }) {
    return (
        <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
            className={`group/switch relative h-5 w-9 shrink-0 rounded-full border ${MOTION} ${FOCUS_RING} ${checked ? "border-[#a78bfa] bg-[#a78bfa]" : "border-[#334155] bg-[#0b0e11] group-hover/row:border-[#475569]"}`}>
            {/* Thumb melebar sesaat saat ditekan, lalu meluncur. */}
            <span className={`absolute top-[1px] size-4 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[left,width,background-color] duration-200 ease-[var(--ai-ease)] group-active/switch:w-5 ${checked ? "left-[17px] bg-white group-active/switch:left-[13px]" : "left-[1px] bg-[#94a3b8]"}`} />
        </button>
    );
}

// Blok "Level dari AI" (Step 3) dengan saklar untuk menggambar lapisan AI di chart (Step 4).
function PlanCard({ plan, currentPrice, shown, onToggle }) {
    const switchId = useId();
    const rows = [
        ["TP2", plan.tp2],
        ["TP1", plan.tp1],
        [plan.entryLow ? "Entry (tengah zona)" : "Entry", plan.entry],
        ["Stop loss", plan.sl],
    ].filter(([, price]) => price !== null);
    return (
        <div className="ai-rise mt-1 border-t border-[#232a30] pt-2.5" style={stagger(3, 80)}>
            <p className={`${SECTION_LABEL} whitespace-nowrap`}>
                Level dari AI · <span className={plan.bias === "long" ? "text-[#4ade80]" : "text-[#f87171]"}>{plan.bias.toUpperCase()}</span>
            </p>
            <ul className="mt-2 flex flex-col gap-1">
                {rows.map(([label, price], index) => {
                    const distance = distanceFromPrice(price, currentPrice);
                    return (
                        <li key={label} style={stagger(index + 4, 60)}
                            className={`ai-rise flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors duration-300 ${shown ? "bg-[#a78bfa]/[0.1]" : "bg-[#111417] hover:bg-[#1a1f24]"}`}>
                            <span className={`border-t-2 border-[#a78bfa] transition-[width] duration-300 ease-[var(--ai-ease)] ${label === "Stop loss" ? "border-dotted" : "border-dashed"} ${shown ? "w-5" : "w-4"}`} aria-hidden />
                            <span className="flex-1 font-chakra text-xs text-[#f8fafc]">{label}</span>
                            <span className="font-mono text-xs font-semibold tabular-nums text-[#f8fafc]">{formatPrice(price)}</span>
                            {distance !== null && <span className={`w-14 text-right font-mono text-[11px] tabular-nums ${distance >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{formatPercent(distance)}</span>}
                        </li>
                    );
                })}
            </ul>
            {plan.entryLow && (
                <p className="mt-1.5 font-mono text-[10px] text-[#64748b]">Zona entry {formatPrice(plan.entryLow)}–{formatPrice(plan.entryHigh)}</p>
            )}
            {/* Satu baris penuh supaya teks tidak terlipat dan seluruh baris bisa diklik. */}
            <label htmlFor={switchId} style={stagger(rows.length + 4, 60)}
                className={`group/row ai-rise mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-2.5 py-2 ${MOTION} ${shown ? "border-[#a78bfa]/[0.45] bg-[#a78bfa]/[0.08]" : "border-[#232a30] hover:border-[#334155] hover:bg-[#1a1f24]"}`}>
                <span className={`font-chakra text-xs ${MOTION} ${shown ? "text-[#f8fafc]" : "text-[#94a3b8]"}`}>
                    Tampilkan di chart
                </span>
                <ChartSwitch id={switchId} checked={shown} onChange={onToggle} />
            </label>
        </div>
    );
}

function AiAvatar() {
    return (
        <span className="ai-pop grid size-[26px] shrink-0 place-items-center rounded-full" style={{ background: "rgba(167,139,250,0.18)" }} aria-hidden>
            <Sparkle size={14} weight="fill" color={VIOLET} />
        </span>
    );
}

function Message({ message, pair, currentPrice, shown, onTogglePlan }) {
    if (message.role === "user") {
        return (
            <li className="ai-rise-right flex justify-end">
                <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2.5 font-chakra text-[13px] leading-[1.45] text-[#f8fafc] transition-opacity duration-300 ${message.failed ? "bg-[#1e252b]/60 opacity-70" : "bg-[#1e252b]"}`}>{message.content}</p>
            </li>
        );
    }
    return (
        <li className="ai-rise flex gap-2">
            <AiAvatar />
            <div className={`flex min-w-0 flex-1 flex-col gap-2 break-words rounded-xl border bg-[#161a1e] p-3 font-chakra text-[13px] leading-[1.55] text-[#e2e8f0] transition-colors duration-300 ${shown ? "border-[#a78bfa]/40" : "border-[#232a30]"}`}>
                <ReplyText text={message.content} />
                {message.charts?.map((name) => <AgentChart key={name} name={name} pair={pair} />)}
                {message.plan && <PlanCard plan={message.plan} currentPrice={currentPrice} shown={shown} onToggle={onTogglePlan} />}
            </div>
        </li>
    );
}

function TypingBubble({ pair }) {
    return (
        <li className="ai-rise flex gap-2">
            <AiAvatar />
            <div className="flex flex-1 flex-col gap-2 rounded-xl border border-[#232a30] bg-[#161a1e] p-3" role="status">
                <span className="flex h-2 items-end gap-[5px]" aria-hidden>
                    {[0, 1, 2].map((index) => (
                        <span key={index} className="ai-typing-dot size-1.5 rounded-full bg-[#a78bfa]" style={{ animationDelay: `${index * 150}ms` }} />
                    ))}
                </span>
                <span className="font-mono text-[10px] font-medium text-[#a78bfa]">AI Agent sedang membaca data {pair}…</span>
            </div>
        </li>
    );
}

export default function AiAgentPanel({ symbol, pair, currentPrice, hideToken = 0, onBusyChange, onPlanChange }) {
    const { user } = useAuth();
    const storageKey = historyKey(user);
    // Panel dipasang ulang per pair, jadi riwayat cukup dibaca sekali saat mount.
    const [saved] = useState(() => loadConversation(storageKey, symbol));
    const [focus, setFocus] = useState(() => (FOCUS_OPTIONS.some((option) => option.key === saved?.focus) ? saved.focus : FOCUS_OPTIONS[0].key));
    const [messages, setMessages] = useState(() => saved?.messages ?? []);
    const [restoredAt, setRestoredAt] = useState(saved?.updatedAt ?? null);
    const savedMessagesRef = useRef(messages);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [remaining, setRemaining] = useState(null);
    const [startedAt, setStartedAt] = useState(0);
    // Indeks pesan yang levelnya sedang digambar di chart; hanya satu sekaligus.
    const [shownIndex, setShownIndex] = useState(null);
    // Tombol × di chip chart menaikkan hideToken; saklar di panel ikut mati.
    const [seenHideToken, setSeenHideToken] = useState(hideToken);
    if (hideToken !== seenHideToken) {
        setSeenHideToken(hideToken);
        setShownIndex(null);
    }
    const threadRef = useRef(null);
    const inputRef = useRef(null);
    const controllerRef = useRef(null);

    useEffect(() => {
        onBusyChange?.(busy);
    }, [busy, onBusyChange]);

    const shown = shownIndex === null ? null : messages[shownIndex];
    const shownPlan = shown?.plan ?? null;
    const shownFocus = shown?.focus ?? null;
    useEffect(() => {
        onPlanChange?.(shownPlan ? { plan: shownPlan, focus: shownFocus } : null);
    }, [shownPlan, shownFocus, onPlanChange]);

    // Pindah koin memasang panel baru; request lama tidak boleh menimpa apa pun.
    useEffect(() => () => {
        controllerRef.current?.abort();
        onBusyChange?.(false);
        onPlanChange?.(null);
    }, [onBusyChange, onPlanChange]);

    // Simpan setiap kali jawaban selesai. Riwayat yang baru dimuat tidak ditulis
    // ulang supaya waktu "terakhir" tetap waktu chat, bukan waktu dibuka.
    useEffect(() => {
        if (busy || messages === savedMessagesRef.current) return;
        savedMessagesRef.current = messages;
        saveConversation(storageKey, symbol, { focus, messages });
    }, [busy, focus, messages, storageKey, symbol]);

    useEffect(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }, [messages, busy, error]);

    async function ask(text, { retry = false } = {}) {
        const message = text.trim();
        if (!message || busy) return;
        // Coba lagi memakai bubble yang sudah ada, bukan menambah pertanyaan kembar.
        const base = retry ? messages.filter((item) => !item.failed) : messages;
        const history = toAgentHistory(base);
        setMessages([...base, { role: "user", content: message, at: Date.now() }]);
        setInput("");
        setError(null);
        setBusy(true);
        setStartedAt(Date.now());
        const controller = new AbortController();
        controllerRef.current = controller;
        try {
            const data = await apiRequest("/ai/chat", { method: "POST", body: { message, history }, signal: controller.signal });
            const plan = parseAgentPlan(data.reply, { currentPrice });
            setMessages((current) => [...current, { role: "assistant", content: data.reply, charts: data.charts || [], plan, focus, at: Date.now() }]);
            if (Number.isFinite(data.remaining)) setRemaining(data.remaining);
        } catch (requestError) {
            if (controller.signal.aborted) return;
            setMessages((current) => current.map((item, index) => (index === current.length - 1 ? { ...item, failed: true } : item)));
            setError({ id: Date.now(), text: describeAgentError(requestError), message, canRetry: requestError?.code !== "AI_QUOTA_EXCEEDED" });
        } finally {
            if (controllerRef.current === controller) {
                controllerRef.current = null;
                setBusy(false);
                inputRef.current?.focus();
            }
        }
    }

    // Membatalkan menghentikan tunggu di browser saja; agent di server bisa tetap jalan.
    function cancel() {
        controllerRef.current?.abort();
        controllerRef.current = null;
        setBusy(false);
        setMessages((current) => current.slice(0, -1));
    }

    // Mulai ulang juga menghapus riwayat pair ini dari browser.
    function restart() {
        setShownIndex(null);
        setRestoredAt(null);
        setMessages([]);
        setError(null);
        setInput("");
    }

    const focusOption = FOCUS_OPTIONS.find((option) => option.key === focus);
    const quotaText = remaining === null ? "Kuota AI dihitung per hari" : `Sisa ${remaining} pesan AI hari ini`;
    const started = messages.length > 0;
    const canSend = !busy && input.trim().length > 0;

    // Analisis pertama memakai panel progres (Step 2); pertanyaan lanjutan cukup bubble mengetik.
    if (busy && messages.length === 1) {
        return <WorkingPanel pair={pair} focusOption={focusOption} startedAt={startedAt} onCancel={cancel} />;
    }

    if (!started) {
        return (
            <Panel className="ai-rise flex flex-col gap-4 p-[18px]">
                <div className="flex items-center gap-3">
                    <span className="ai-pop grid size-11 shrink-0 place-items-center rounded-xl border" style={{ background: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.4)" }} aria-hidden>
                        <Sparkle size={22} weight="fill" color={VIOLET} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-chakra text-base font-bold text-[#f8fafc]">Analisis tambahan dari AI Agent</p>
                        <p className="font-chakra text-xs text-[#64748b]">{pair} · terpisah dari bias DCMS</p>
                    </div>
                </div>
                <p className="ai-rise font-chakra text-[13px] leading-[1.55] text-[#94a3b8]" style={stagger(1)}>
                    Agent membaca chart di beberapa timeframe dan berita terbaru, lalu memberi bias Long atau Short beserta alasan, level penting, dan risikonya.
                </p>

                <div className="ai-rise" style={stagger(2)}>
                    <p className={SECTION_LABEL}>Fokus waktu</p>
                    <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Fokus waktu">
                        {FOCUS_OPTIONS.map((option) => {
                            const active = option.key === focus;
                            return (
                                <button key={option.key} type="button" role="radio" aria-checked={active} onClick={() => setFocus(option.key)}
                                    className={`flex h-[50px] flex-col items-center justify-center rounded-[10px] border ${MOTION} ${PRESS} ${FOCUS_RING} ${active ? "border-[#a78bfa]/60 bg-[#a78bfa]/[0.12] shadow-[0_0_14px_rgba(167,139,250,0.15)]" : "border-[#334155] bg-[#161a1e] hover:border-[#475569]"}`}>
                                    <span className={`font-chakra text-[13px] font-semibold ${MOTION} ${active ? "text-[#f8fafc]" : "text-[#94a3b8]"}`}>{option.label}</span>
                                    <span className={`font-mono text-[10px] font-medium ${MOTION} ${active ? "text-[#a78bfa]" : "text-[#64748b]"}`}>{option.range}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="ai-rise" style={stagger(3)}>
                    <p className={SECTION_LABEL}>Yang dibaca agent</p>
                    <ul className="mt-2 flex flex-col gap-2">
                        {DATA_SOURCES.map(({ icon: Icon, label, detail }) => (
                            <li key={label} className={`group flex items-center gap-3 rounded-[10px] bg-[#161a1e] px-3 py-2 hover:bg-[#1a1f24] ${MOTION}`}>
                                <Icon size={18} color={VIOLET} aria-hidden className={`${MOTION}`} />
                                <div>
                                    <p className="font-chakra text-[13px] font-semibold text-[#f8fafc]">{label}</p>
                                    <p className="font-chakra text-[11px] text-[#64748b]">{detail}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="ai-rise mt-2 flex flex-col gap-2.5" style={stagger(4)}>
                    <button type="button" onClick={() => ask(buildAnalysisPrompt(pair, focus))} disabled={!symbol}
                        className={`group inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#a78bfa] font-chakra text-sm font-bold text-[#0b0d0f] hover:bg-[#b9a2fb] hover:shadow-[0_6px_20px_-6px_rgba(167,139,250,0.7)] disabled:cursor-not-allowed disabled:opacity-40 ${MOTION} ${PRESS} ${FOCUS_RING}`}>
                        <Sparkle size={16} weight="fill" aria-hidden />
                        Jalankan analisis AI
                    </button>
                    <div className="flex items-center justify-between font-mono text-[11px] font-medium">
                        <span className="text-[#94a3b8]">{quotaText}</span>
                        <span className="text-[#64748b]">± 20 detik</span>
                    </div>
                    <p className="font-chakra text-[11px] text-[#64748b]">AI bisa keliru. Hasilnya bukan saran finansial, selalu DYOR.</p>
                </div>
            </Panel>
        );
    }

    return (
        <Panel className="ai-rise flex flex-col gap-3 p-[18px]">
            <div className="flex items-center gap-2 rounded-[10px] border border-[#334155] bg-[#161a1e] px-3 py-2.5">
                <Sparkle size={14} weight="fill" color={VIOLET} aria-hidden />
                <span className="truncate font-chakra text-[13px] font-bold text-[#f8fafc]">{pair}</span>
                <span className="rounded-full px-1.5 font-mono text-[10px] font-semibold text-[#a78bfa]" style={{ background: "rgba(167,139,250,0.12)" }}>{focusOption?.label}</span>
                <button type="button" onClick={restart} disabled={busy}
                    className={`group ml-auto inline-flex items-center gap-1 rounded px-1 font-chakra text-xs font-semibold text-[#a78bfa] hover:text-[#c4b5fd] disabled:opacity-40 ${MOTION} ${PRESS} ${FOCUS_RING}`}>
                    <ArrowCounterClockwise size={12} aria-hidden /> Mulai ulang
                </button>
            </div>

            <ul ref={threadRef} className="flex max-h-[520px] min-h-[240px] flex-col gap-3 overflow-y-auto overscroll-contain pr-1" aria-live="polite" aria-label={`Percakapan AI Agent soal ${pair}`}>
                {restoredAt && (
                    <li className="ai-rise flex items-center gap-2 font-mono text-[10px] font-medium text-[#64748b]">
                        <span className="h-px flex-1 bg-[#232a30]" aria-hidden />
                        Chat terakhir · {describeSavedAt(restoredAt)}
                        <span className="h-px flex-1 bg-[#232a30]" aria-hidden />
                    </li>
                )}
                {messages.map((message, index) => (
                    <Message key={index} message={message} pair={pair} currentPrice={currentPrice}
                        shown={shownIndex === index} onTogglePlan={(on) => setShownIndex(on ? index : null)} />
                ))}
                {busy && <TypingBubble pair={pair} />}
                {error && (
                    <li key={error.id} className="ai-rise" role="alert">
                        <p className="ai-nudge rounded-xl border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2.5 font-chakra text-xs text-[#fecaca]" style={{ animationDelay: "200ms" }}>
                            {error.text}
                            {error.canRetry && (
                                <button type="button" onClick={() => ask(error.message, { retry: true })}
                                    className={`group ml-2 inline-flex items-center gap-1 font-semibold text-[#f8fafc] underline-offset-2 hover:underline ${PRESS} ${FOCUS_RING}`}>
                                    <ArrowCounterClockwise size={11} aria-hidden /> Coba lagi
                                </button>
                            )}
                        </p>
                    </li>
                )}
            </ul>

            <div className="mt-auto flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion, index) => (
                    <button key={suggestion} type="button" onClick={() => ask(suggestion)} disabled={busy} style={stagger(index, 60)}
                        className={`ai-rise rounded-full border border-[#a78bfa]/40 px-2.5 py-1.5 font-chakra text-xs text-[#a78bfa] hover:border-[#a78bfa]/70 hover:bg-[#a78bfa]/10 disabled:translate-y-0 disabled:opacity-40 ${MOTION} ${PRESS} ${FOCUS_RING}`}>
                        {suggestion}
                    </button>
                ))}
            </div>

            <form onSubmit={(event) => { event.preventDefault(); ask(input); }}
                className={`flex items-center gap-2 rounded-xl border border-[#334155] bg-[#161a1e] py-2 pl-3.5 pr-2 focus-within:border-[#a78bfa]/60 focus-within:shadow-[0_0_0_3px_rgba(167,139,250,0.12)] ${MOTION}`}>
                <label htmlFor="ai-agent-input" className="sr-only">Pertanyaan untuk AI Agent</label>
                <input id="ai-agent-input" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200}
                    placeholder={`Tanya soal ${pair}…`} autoComplete="off" disabled={busy}
                    className="min-w-0 flex-1 bg-transparent font-chakra text-[13px] text-[#f8fafc] placeholder:text-[#64748b] placeholder:transition-opacity focus:outline-none focus:placeholder:opacity-60 disabled:opacity-60" />
                <button type="submit" disabled={!canSend} aria-label="Kirim pertanyaan"
                    className={`group grid size-8 shrink-0 place-items-center rounded-lg text-[#0b0d0f] ${MOTION} ${PRESS} ${FOCUS_RING} ${canSend ? "scale-100 bg-[#a78bfa] hover:bg-[#b9a2fb] hover:shadow-[0_4px_14px_-4px_rgba(167,139,250,0.8)]" : "scale-95 bg-[#a78bfa]/40"}`}>
                    <ArrowRight size={16} weight="bold" aria-hidden className="transition-transform duration-200 ease-[var(--ai-ease)]" />
                </button>
            </form>
            <p className="font-mono text-[10px] font-medium text-[#64748b]">{quotaText} · AI bisa keliru, selalu DYOR</p>
        </Panel>
    );
}
