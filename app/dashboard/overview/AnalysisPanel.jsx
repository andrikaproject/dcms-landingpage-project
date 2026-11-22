"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, CircleNotch, MagnifyingGlass, Pause, X } from "@phosphor-icons/react";
import { buildBiasFactors, summarizeFactors, VERDICT } from "@/lib/market/bias-factors";
import { calculateEntryZone } from "@/lib/market/entry-zone";
import { TAB_STATUS } from "@/lib/signals/analysis-tabs";
import { formatRelativeTime } from "@/lib/signals/format";
import BiasGauge from "./BiasGauge";
import ScrollRail, { EDGE_MASK_STYLE, EDGE_PX, scrollBehavior } from "./ScrollRail";
import { BiasPill, biasTone, CoinAvatar, formatPercent, formatPrice, formatTimeframe, Panel, SECTION_LABEL } from "./ui";

const VOTE_ORDER = [VERDICT.LONG, VERDICT.NEUTRAL, VERDICT.SHORT, null];
const SOURCE_LABEL = { BITUNIX: "Bitunix Futures", BYBIT: "Bybit" };
const QUICK_PICKS = ["BTC", "ETH", "SOL"];
const ANALYSIS_STEPS = [
    "Ambil data harga dan volume · Bitunix Futures",
    "Hitung indikator: EMA, RSI, Stoch, funding rate",
    "Menyusun bias dan skor keyakinan",
    "Hitung entry, SL, TP, dan risk : reward",
];
// Request analisis tunggal tidak melaporkan tahapannya. Checklist maju
// mengikuti waktu dan langkah terakhir baru selesai saat hasil tiba.
const STEP_INTERVAL_MS = 900;

const BUTTON_SECONDARY = "inline-flex h-9 items-center rounded-lg bg-[#1a1f24] px-3 font-chakra text-sm font-medium leading-5 text-[#f8fafc] shadow-[var(--shadow-button)] transition hover:bg-[#1e252b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:cursor-not-allowed disabled:opacity-40";
const BUTTON_PRIMARY = "inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#b8fb5c] px-3 font-chakra text-sm font-semibold leading-5 text-black shadow-[var(--shadow-primary)] transition hover:bg-[#a8ec4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:cursor-not-allowed disabled:opacity-40";

function useNow(intervalMs, enabled = true) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!enabled) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(timer);
    }, [intervalMs, enabled]);
    return now;
}

function tabDotClass(tab) {
    if (tab.status === TAB_STATUS.LOADING) return "bg-[#64748b] motion-safe:animate-pulse";
    if (tab.status === TAB_STATUS.ERROR) return "border border-[#f87171] bg-transparent";
    return biasTone(tab.signal?.bias).dot;
}

function AnalysisTabs({ tabs, activeKey, onSelect, onRemove, panelId }) {
    const listRef = useRef(null);

    const firstScrollRef = useRef(true);

    // Fokus tidak menggulir sendiri; tab aktif digeser masuk penuh, melewati tepi
    // yang memudar, supaya pindah tab lewat keyboard tidak meloncat kasar.
    useEffect(() => {
        const scroller = listRef.current;
        const chip = activeKey ? scroller?.querySelector(`[data-key="${CSS.escape(activeKey)}"]`)?.parentElement : null;
        if (!scroller || !chip) return;
        const edge = EDGE_PX;
        const view = scroller.getBoundingClientRect();
        const box = chip.getBoundingClientRect();
        const delta = box.left < view.left + edge ? box.left - view.left - edge : box.right > view.right - edge ? box.right - view.right + edge : 0;
        if (delta) scroller.scrollBy({ left: delta, behavior: firstScrollRef.current ? "auto" : scrollBehavior() });
        firstScrollRef.current = false;
    }, [activeKey, tabs.length]);

    function focusTab(key) {
        listRef.current?.querySelector(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
    }

    function handleKeyDown(event, index) {
        if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            onRemove(tabs[index].key);
            return;
        }
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        onSelect(next.key);
        focusTab(next.key);
    }

    return (
        <div className="-mt-1 flex flex-col">
            <div ref={listRef} role="tablist" aria-label="Koin yang sudah dianalisis" style={EDGE_MASK_STYLE} className="-mx-6 flex snap-x snap-proximity scroll-px-12 gap-2 overflow-x-auto overscroll-x-contain px-6 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tabs.map((tab, index) => {
                    const selected = tab.key === activeKey;
                    const label = `${tab.base}/USDT`;
                    return (
                        <div
                            key={tab.key}
                            role="presentation"
                            className={`group flex h-[33px] shrink-0 snap-start items-center rounded-[10px] border transition ${selected ? "border-[#334155] bg-[#161a1e]" : "border-[#232a30] hover:border-[#334155]"}`}
                        >
                            <button
                                type="button"
                                role="tab"
                                data-key={tab.key}
                                aria-selected={selected}
                                aria-controls={panelId}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => onSelect(tab.key)}
                                onKeyDown={(event) => handleKeyDown(event, index)}
                                className={`flex h-full items-center gap-2 rounded-[10px] py-[7px] pl-2.5 pr-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] ${selected ? "text-[#f8fafc]" : "text-[#94a3b8] hover:text-[#f8fafc]"}`}
                            >
                                <span className={`size-1.5 rounded-full ${tabDotClass(tab)}`} aria-hidden />
                                <span className="font-chakra text-[13px] font-semibold leading-[17px]">{label}</span>
                                <span className="font-mono text-[11px] font-medium leading-[14px] text-[#64748b]">{formatTimeframe(tab.timeframe)}</span>
                                <span className="sr-only">
                                    {tab.status === TAB_STATUS.LOADING ? ", sedang dianalisis" : tab.status === TAB_STATUS.ERROR ? ", gagal" : `, bias ${biasTone(tab.signal?.bias).word}`}
                                </span>
                            </button>
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => onRemove(tab.key)}
                                aria-label={`Tutup hasil ${label} ${formatTimeframe(tab.timeframe)}`}
                                title="Tutup tab (Delete)"
                                className="mr-1.5 grid size-5 place-items-center rounded text-[#64748b] opacity-60 transition hover:bg-white/[0.06] hover:text-[#f8fafc] group-hover:opacity-100"
                            >
                                <X size={12} aria-hidden />
                            </button>
                        </div>
                    );
                })}
            </div>
            <ScrollRail scrollerRef={listRef} />
        </div>
    );
}

function EmptyAnalysis({ onOpenModal }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
            <svg viewBox="0 0 128 70" className="h-[70px] w-32" aria-hidden>
                <path d="M8 66 A56 56 0 0 1 40 16" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
                <path d="M48 12 A56 56 0 0 1 80 12" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
                <path d="M88 16 A56 56 0 0 1 120 66" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
            </svg>
            <div>
                <h3 className="font-chakra text-xl font-bold leading-7 text-[#f8fafc]">Belum ada hasil analisis</h3>
                <p className="mx-auto mt-2 max-w-[420px] font-chakra text-sm leading-5 text-[#94a3b8]">
                    Cari koin dan pilih timeframe. Arah bias Long, Netral, atau Short akan tampil di sini.
                </p>
            </div>
            <div className="flex w-full max-w-[456px] flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={() => onOpenModal()}
                    className="flex h-10 flex-1 items-center gap-2.5 rounded-lg border border-[#334155] bg-[#0b0d0f] px-3.5 text-left font-chakra text-sm text-[#64748b] transition hover:border-[#475569] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]"
                >
                    <MagnifyingGlass size={16} className="shrink-0 text-[#94a3b8]" aria-hidden />
                    Cari koin, contoh: BTC, SOL, HIGH
                </button>
                <button type="button" onClick={() => onOpenModal()} className={`${BUTTON_PRIMARY} h-10 justify-center`}>
                    Analisis koin
                </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="font-chakra text-xs text-[#64748b]">Coba cepat</span>
                {QUICK_PICKS.map((base) => (
                    <button
                        key={base}
                        type="button"
                        onClick={() => onOpenModal(base)}
                        className="h-7 rounded-full border border-[#334155] px-3 font-mono text-[11px] font-medium text-[#cbd5e1] transition hover:border-[#475569] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]"
                    >
                        {base}/USDT
                    </button>
                ))}
            </div>
        </div>
    );
}

function CoinHeader({ tab, signal, now, onReanalyze }) {
    const loading = tab.status === TAB_STATUS.LOADING;
    const updatedLabel = formatRelativeTime(tab.analyzedAt, { now, placeholder: "" });
    const price = signal?.price;

    return (
        <div className="flex items-center gap-3 border-t border-[#232a30] px-6 py-4">
            <CoinAvatar label={tab.base} />
            <div className="min-w-0 flex-1">
                <p className="truncate font-chakra text-xl font-bold leading-[26px] text-[#f8fafc]">{tab.base}/USDT</p>
                <p className="truncate font-mono text-xs font-medium leading-4 text-[#94a3b8]">
                    {price !== undefined && price !== null ? `$${formatPrice(price)} · ` : ""}{formatTimeframe(tab.timeframe)} · {SOURCE_LABEL[signal?.source] || "Bitunix Futures"}
                </p>
            </div>
            {loading ? (
                <p className="shrink-0 font-mono text-[11px] font-medium text-[#b8fb5c]" role="status">Menganalisis…</p>
            ) : tab.status === TAB_STATUS.READY && (
                <div className="hidden shrink-0 items-center gap-2 font-mono text-[11px] font-medium leading-[14px] text-[#64748b] sm:flex">
                    {updatedLabel && <span>Diperbarui {updatedLabel.toLowerCase()}</span>}
                    <span aria-hidden>·</span>
                    <button type="button" onClick={onReanalyze} className="text-[#a3e635] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]">
                        Analisis ulang
                    </button>
                </div>
            )}
        </div>
    );
}

function AnalysisProgress({ tab, onCancel }) {
    const now = useNow(300);
    const elapsed = Math.max(0, now - (tab.requestedAt || now));
    const done = Math.min(ANALYSIS_STEPS.length - 1, Math.floor(elapsed / STEP_INTERVAL_MS));
    const progress = ((done + 0.5) / ANALYSIS_STEPS.length) * 100;

    return (
        <>
            <div className="flex flex-col items-center gap-8 border-t border-[#232a30] p-6 md:flex-row" aria-busy="true">
                <div className="flex shrink-0 flex-col items-center gap-3.5">
                    <div className="relative h-[166px] w-[264px]" aria-hidden>
                        <svg viewBox="0 0 264 166" className="absolute inset-0 size-full">
                            <path d="M22 140 A110 110 0 0 1 77 45" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
                            <path d="M96 36 A110 110 0 0 1 168 36" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
                            <path d="M187 45 A110 110 0 0 1 242 140" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-x-0 top-[72px] flex flex-col items-center gap-2 motion-safe:animate-pulse">
                            <span className="h-7 w-20 rounded bg-[#1e293b]" />
                            <span className="h-2 w-14 rounded bg-[#1e293b]" />
                        </div>
                    </div>
                    <p className="font-chakra text-xs text-[#64748b]">Menghitung skor bias…</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <p className={SECTION_LABEL}>Proses analisis</p>
                    <ol className="flex flex-col gap-3">
                        {ANALYSIS_STEPS.map((label, index) => {
                            const state = index < done ? "done" : index === done ? "active" : "todo";
                            return (
                                <li key={label} className="flex items-center gap-2.5 font-chakra text-sm">
                                    {state === "done" && <span className="grid size-[18px] place-items-center rounded-full bg-[#4ade80]/15 text-[#4ade80]"><Check size={11} weight="bold" aria-hidden /></span>}
                                    {state === "active" && <CircleNotch size={18} className="text-[#b8fb5c] motion-safe:animate-spin" aria-hidden />}
                                    {state === "todo" && <span className="size-[18px] rounded-full border border-dashed border-[#334155]" aria-hidden />}
                                    <span className={state === "active" ? "font-medium text-[#b8fb5c]" : state === "done" ? "text-[#f8fafc]" : "text-[#64748b]"}>{label}</span>
                                </li>
                            );
                        })}
                    </ol>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1e293b]">
                        <div className="h-full rounded-full bg-[#b8fb5c] transition-[width] duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[11px] text-[#64748b]">Langkah {done + 1} dari {ANALYSIS_STEPS.length} · biasanya beberapa detik</p>
                        <button type="button" onClick={onCancel} className="font-chakra text-xs font-semibold text-[#f8fafc] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]">
                            Batalkan
                        </button>
                    </div>
                </div>
            </div>
            <div className="border-t border-[#232a30] px-6 pb-5 pt-[18px]" aria-hidden>
                <p className={SECTION_LABEL}>Rencana trade</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[0, 1, 2, 3, 4].map((item) => <span key={item} className="h-11 rounded-lg bg-[#161a1e] motion-safe:animate-pulse" />)}
                </div>
            </div>
        </>
    );
}

function AnalysisError({ tab, onRetry, onRemove }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 border-t border-[#232a30] px-6 py-16 text-center" role="alert">
            <p className="font-chakra text-base font-bold text-[#f8fafc]">Analisis {tab.base}/USDT · {formatTimeframe(tab.timeframe)} gagal</p>
            <p className="max-w-[420px] font-chakra text-sm text-[#94a3b8]">{tab.error}</p>
            <div className="flex gap-2">
                <button type="button" onClick={onRemove} className={BUTTON_SECONDARY}>Tutup tab</button>
                <button type="button" onClick={onRetry} className={BUTTON_PRIMARY}>Coba lagi</button>
            </div>
        </div>
    );
}

function FactorList({ factors, summary }) {
    const votes = [...factors].sort((a, b) => VOTE_ORDER.indexOf(a.verdict) - VOTE_ORDER.indexOf(b.verdict));

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className={SECTION_LABEL}>Faktor pendukung bias</p>
                <p className="font-mono text-[11px] font-medium leading-[14px] text-[#94a3b8]">
                    {summary.long} Long · {summary.neutral} Netral · {summary.short} Short
                </p>
            </div>
            <div className="flex h-1.5 gap-[3px]" aria-hidden>
                {votes.map((factor) => (
                    <span key={factor.key} className={`h-full flex-1 rounded-[3px] ${factor.verdict ? biasTone(factor.verdict).dot : "bg-[#334155]"}`} />
                ))}
            </div>
            <ul className="flex flex-col">
                {factors.map((factor) => (
                    <li key={factor.key} className="flex items-center gap-3 border-b border-[#232a30] py-[11px] last:border-b-0">
                        <div className="min-w-0 flex-1">
                            <p className="font-chakra text-[13px] font-semibold leading-[17px] text-[#f8fafc]">{factor.label}</p>
                            <p className="mt-0.5 font-chakra text-xs leading-4 text-[#94a3b8]">{factor.detail}</p>
                        </div>
                        {factor.verdict
                            ? <BiasPill bias={factor.verdict} />
                            : <span className="font-mono text-[11px] font-medium text-[#64748b]">N/A</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function directionalPercent(level, entry, bias) {
    const value = Number(level);
    const base = Number(entry);
    if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return null;
    return ((value - base) / base) * 100 * (bias === "short" ? -1 : 1);
}

function TradeLevel({ label, value, sub, tone = "text-[#f8fafc]", subTone = "text-[#64748b]", first = false }) {
    return (
        <div className={`flex min-w-0 flex-col gap-1 py-0.5 ${first ? "pr-3" : "border-[#232a30] sm:border-l sm:pl-4 sm:pr-3"}`}>
            <p className="font-mono text-[10px] font-medium uppercase leading-[13px] tracking-[0.06em] text-[#64748b]">{label}</p>
            <p className={`truncate font-mono text-[15px] font-semibold leading-5 ${tone}`}>{value}</p>
            <p className={`truncate font-mono text-[11px] font-medium leading-[14px] ${subTone}`}>{sub}</p>
        </div>
    );
}

// Bias netral tidak punya rencana trade. Batas range 20 candle dari engine
// dipakai sebagai level pemicu untuk masing-masing arah.
function NoSetup({ signal }) {
    const timeframe = formatTimeframe(signal.timeframe);
    return (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/[0.05] px-4 py-3.5 sm:flex-row sm:items-center">
            <Pause size={22} weight="bold" className="shrink-0 rounded-full border border-[#fbbf24] p-1 text-[#fbbf24]" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="font-chakra text-sm font-semibold text-[#f8fafc]">Belum ada setup trade</p>
                <p className="font-chakra text-xs text-[#94a3b8]">Bias netral. Tunggu harga keluar dari range sebelum entry.</p>
            </div>
            <div className="shrink-0 font-mono text-xs font-medium leading-5 sm:text-right">
                <p className="text-[#4ade80]">Long jika close {timeframe} &gt; {formatPrice(signal.resistance)}</p>
                <p className="text-[#f87171]">Short jika close {timeframe} &lt; {formatPrice(signal.support)}</p>
            </div>
        </div>
    );
}

function TradePlan({ signal }) {
    const bias = String(signal.bias || "").toLowerCase();

    if (bias !== "long" && bias !== "short") {
        return (
            <div className="border-t border-[#232a30] px-6 pb-5 pt-[18px]">
                <p className={SECTION_LABEL}>Rencana trade</p>
                <NoSetup signal={signal} />
            </div>
        );
    }

    const zone = calculateEntryZone({
        bias,
        entry: Number(signal.entry),
        atr: Number(signal.atr),
        support: Number(signal.support),
        resistance: Number(signal.resistance),
        price: Number(signal.price),
    });
    const hasZone = zone && zone.status !== "invalid";
    const riskReward = Number(signal.riskReward);

    return (
        <div className="border-t border-[#232a30] px-6 pb-5 pt-[18px]">
            <p className={SECTION_LABEL}>Rencana trade</p>
            <div className="mt-3 grid grid-cols-2 gap-y-4 sm:grid-cols-[1.35fr_repeat(4,1fr)] sm:gap-y-0">
                <TradeLevel
                    first
                    label="Entry"
                    value={hasZone ? `${formatPrice(zone.low)}–${formatPrice(zone.high)}` : formatPrice(signal.entry)}
                    sub={hasZone ? "Range" : "Harga saat ini"}
                />
                <TradeLevel label="Stop loss" value={formatPrice(signal.sl)} sub={formatPercent(directionalPercent(signal.sl, signal.entry, bias))} tone="text-[#f87171]" subTone="text-[#f87171]" />
                <TradeLevel label="TP1" value={formatPrice(signal.tp1)} sub={formatPercent(directionalPercent(signal.tp1, signal.entry, bias))} tone="text-[#4ade80]" subTone="text-[#4ade80]" />
                <TradeLevel label="TP2" value={formatPrice(signal.tp2)} sub={formatPercent(directionalPercent(signal.tp2, signal.entry, bias))} tone="text-[#4ade80]" subTone="text-[#4ade80]" />
                <TradeLevel
                    label="Risk : Reward"
                    value={Number.isFinite(riskReward) && riskReward > 0 ? `1 : ${riskReward.toFixed(1)}` : "—"}
                    sub={signal.tradePlanValidForConservative ? "Setup valid" : "Candle belum tutup"}
                    tone="text-[#a3e635]"
                />
            </div>
        </div>
    );
}

function AnalysisActions({ tab, isLocked, onLock, onOpenDetail }) {
    const [locking, setLocking] = useState(false);
    const [error, setError] = useState("");
    const ready = tab.status === TAB_STATUS.READY && tab.signal;
    const bias = String(tab.signal?.bias || "").toLowerCase();
    const canLock = ready && (bias === "long" || bias === "short");

    async function handleLock() {
        if (locking || isLocked || !canLock) return;
        setLocking(true);
        setError("");
        try {
            await onLock(tab.signal);
        } catch (lockFailure) {
            setError(lockFailure?.message || "Lock sinyal gagal. Coba lagi.");
        } finally {
            setLocking(false);
        }
    }

    const note = !ready
        ? "Tombol aktif setelah analisis selesai."
        : isLocked
            ? "Sinyal ini sudah ada di pantauan."
            : !canLock
                ? "Bias netral belum punya setup, Lock dinonaktifkan."
                : "Bukan saran finansial. Selalu DYOR sebelum entry.";

    return (
        <div className="border-t border-[#232a30] bg-[#161a1e] px-6 py-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="font-chakra text-xs leading-4 text-[#64748b]">{note}</p>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => onOpenDetail(tab.signal)} disabled={!ready} className={BUTTON_SECONDARY}>
                        Detail informasi
                    </button>
                    {ready ? (
                        <Link href={`/dashboard/chart?symbol=${encodeURIComponent(tab.symbol)}&timeframe=${tab.timeframe}`} className={BUTTON_SECONDARY}>
                            Lihat chart
                        </Link>
                    ) : (
                        <button type="button" disabled className={BUTTON_SECONDARY}>Lihat chart</button>
                    )}
                    {isLocked ? (
                        <button type="button" disabled className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#4ade80]/40 bg-[#4ade80]/10 px-3 font-chakra text-sm font-semibold text-[#4ade80]">
                            <Check size={14} weight="bold" aria-hidden /> Terkunci
                        </button>
                    ) : (
                        <button type="button" onClick={handleLock} disabled={!canLock || locking} aria-busy={locking} className={BUTTON_PRIMARY}>
                            {locking ? "Mengunci…" : "Lock sinyal"}
                        </button>
                    )}
                </div>
            </div>
            {error && (
                <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 font-chakra text-xs text-red-200">{error}</p>
            )}
        </div>
    );
}

function AnalysisResult({ signal }) {
    const factors = buildBiasFactors(signal, { formatPrice });
    const summary = summarizeFactors(factors, signal.bias);
    const tone = biasTone(signal.bias);

    return (
        <>
            <div className="flex flex-col items-center gap-8 border-t border-[#232a30] p-6 md:flex-row md:items-center">
                <div className="flex shrink-0 flex-col items-center gap-3.5">
                    <BiasGauge bias={signal.bias} score={signal.score} confidence={summary.confidence} />
                    <p className="font-chakra text-xs leading-4 text-[#94a3b8]">
                        {summary.confidence === null
                            ? "Faktor terbelah, belum ada arah dominan"
                            : `${summary.supporting} dari ${summary.available} faktor mendukung ${tone.word}`}
                    </p>
                </div>
                <FactorList factors={factors} summary={summary} />
            </div>
            <TradePlan signal={signal} />
        </>
    );
}

export default function AnalysisPanel({ tabs, activeTab, lockedKeys, onSelect, onRemove, onCancel, onRetry, onReanalyze, onOpenModal, onLock, onOpenDetail }) {
    const panelId = useId();
    const now = useNow(30_000);
    const hasTabs = tabs.length > 0;

    return (
        <Panel className="flex min-h-[640px] flex-col" aria-labelledby={`${panelId}-title`}>
            <div className="flex flex-col gap-4 px-6 pb-4 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 id={`${panelId}-title`} className="font-chakra text-lg font-bold leading-6 text-[#f8fafc]">Hasil Analisis</h2>
                        <p className="mt-0.5 font-chakra text-xs leading-4 text-[#94a3b8]">
                            {hasTabs ? "Pilih koin yang sudah dianalisis untuk melihat arah bias-nya." : "Belum ada koin yang dianalisis."}
                        </p>
                    </div>
                    {hasTabs && (
                        <button
                            type="button"
                            onClick={() => onOpenModal()}
                            className="inline-flex h-8 items-center rounded-md border border-[#334155] bg-[#161a1e] px-3 font-chakra text-xs font-medium leading-4 text-[#f8fafc] shadow-[0_1px_2px_rgba(10,13,18,0.05)] transition hover:border-[#475569] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]"
                        >
                            + Analisis koin baru
                        </button>
                    )}
                </div>
                {hasTabs && <AnalysisTabs tabs={tabs} activeKey={activeTab?.key} onSelect={onSelect} onRemove={onRemove} panelId={panelId} />}
            </div>

            {!activeTab ? (
                <EmptyAnalysis onOpenModal={onOpenModal} />
            ) : (
                <div id={panelId} role="tabpanel" aria-label={`${activeTab.base}/USDT ${formatTimeframe(activeTab.timeframe)}`} className="flex flex-1 flex-col">
                    <CoinHeader tab={activeTab} signal={activeTab.signal} now={now} onReanalyze={() => onReanalyze(activeTab)} />
                    {activeTab.status === TAB_STATUS.LOADING && <AnalysisProgress key={activeTab.requestedAt} tab={activeTab} onCancel={() => onCancel(activeTab.key)} />}
                    {activeTab.status === TAB_STATUS.ERROR && <AnalysisError tab={activeTab} onRetry={() => onRetry(activeTab)} onRemove={() => onRemove(activeTab.key)} />}
                    {activeTab.status === TAB_STATUS.READY && activeTab.signal && <AnalysisResult signal={activeTab.signal} />}
                    <div className="mt-auto">
                        {/* `key` mereset status lock setiap kali tab berganti. */}
                        <AnalysisActions
                            key={activeTab.key}
                            tab={activeTab}
                            isLocked={lockedKeys.has(activeTab.key)}
                            onLock={onLock}
                            onOpenDetail={onOpenDetail}
                        />
                    </div>
                </div>
            )}
        </Panel>
    );
}
