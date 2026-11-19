"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowsOut, CaretLeft, Check, Function as FunctionIcon, LockSimple, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { buildBiasFactors, summarizeFactors } from "@/lib/market/bias-factors";
import {
    applyLivePrice,
    describeTimeframeTrend,
    dimLevels,
    distanceFromPrice,
    emaSeries,
    formatLevelsForClipboard,
    levelsFromAgentPlan,
    levelsFromAnalysis,
    levelsFromLocked,
    TIMEFRAME_SECONDS,
} from "@/lib/market/chart-levels";
import { useLockedSignals } from "@/lib/market/dashboard";
import { useLivePrices } from "@/lib/market/live-prices";
import { apiRequest } from "@/lib/api/client";
import { analysisKey, baseOf, TAB_STATUS } from "@/lib/signals/analysis-tabs";
import { lockSignalPlan } from "@/lib/signals/api";
import { formatRelativeTime } from "@/lib/signals/format";
import { describeLockedMovement } from "@/lib/signals/locked";
import { lockedTrackZones, TRACK_ZONE } from "@/lib/signals/locked-track";
import DashboardToast from "../DashboardToast";
import BiasGauge from "../overview/BiasGauge";
import { ANALYSIS_TIMEFRAMES } from "../overview/analysis-timeframes";
import { BiasPill, CoinAvatar, formatPercent, formatPrice, formatTimeframe, Panel, SECTION_LABEL } from "../overview/ui";
import { useAnalysisTabs } from "../overview/useAnalysisTabs";
import { useChartCandles } from "./useChartCandles";
import AiAgentPanel, { AiTabLabel } from "./AiAgentPanel";
import { FOCUS_OPTIONS } from "@/lib/ai/agent-chat";
import { DcmsHiddenCards, DcmsLayerMenu } from "./indicators/DcmsLayer";
import FunctionsDrawer from "./indicators/FunctionsDrawer";
import IndicatorMenu from "./indicators/IndicatorMenu";
import IndicatorSettingsModal from "./indicators/IndicatorSettingsModal";
import ScriptEditor from "./indicators/ScriptEditor";
import SidePanelResizer, { useSidePanelWidth } from "./SidePanelResizer";
import { useIndicatorController } from "./indicators/useIndicatorController";

const LiveChart = dynamic(() => import("./LiveChart"), {
    ssr: false,
    loading: () => <div className="size-full motion-safe:animate-pulse bg-[#161a1e]" />,
});

const BUTTON_SECONDARY = "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1a1f24] px-3 font-chakra text-sm font-medium text-[#f8fafc] shadow-[var(--shadow-button)] transition hover:bg-[#1e252b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:cursor-not-allowed disabled:opacity-40";
const BUTTON_PRIMARY = "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#b8fb5c] px-3 font-chakra text-sm font-semibold text-black shadow-[var(--shadow-primary)] transition hover:bg-[#a8ec4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:cursor-not-allowed disabled:opacity-40";
const UNDO_LOCK_MS = 8_000;
const NO_BARS = [];
const TRACK_STATUS = {
    [TRACK_ZONE.LOSS]: "Di bawah entry",
    [TRACK_ZONE.PROFIT]: "Menuju TP1",
    [TRACK_ZONE.PASSED]: "Menuju TP2",
};

function formatClock(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function useNow(intervalMs = 30_000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(timer);
    }, [intervalMs]);
    return now;
}

function useIsFullscreen(ref) {
    const [fullscreen, setFullscreen] = useState(false);
    useEffect(() => {
        const sync = () => setFullscreen(document.fullscreenElement === ref.current);
        document.addEventListener("fullscreenchange", sync);
        return () => document.removeEventListener("fullscreenchange", sync);
    }, [ref]);
    return fullscreen;
}

function dashboardHref({ open, timeframe, highlight } = {}) {
    const params = new URLSearchParams();
    if (open) params.set("open", open);
    if (timeframe) params.set("timeframe", timeframe);
    if (highlight) params.set("highlight", highlight);
    const query = params.toString();
    return query ? `/dashboard?${query}` : "/dashboard";
}

function Switch({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] ${checked ? "bg-[#2563eb]" : "bg-[#334155]"}`}
        >
            <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${checked ? "left-[18px]" : "left-0.5"}`} />
        </button>
    );
}

function ToolbarChip({ active, onClick, children, dotColor }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[11px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] ${active ? "border-[#334155] bg-[#161a1e] text-[#f8fafc]" : "border-[#232a30] text-[#64748b] hover:text-[#cbd5e1]"}`}
        >
            {dotColor && <span className="size-1.5 rounded-full" style={{ background: active ? dotColor : "#475569" }} aria-hidden />}
            {children}
        </button>
    );
}

function TimeframeBanner({ sourceLabel, analysisTimeframe, chartTimeframe, trendText, canReanalyze, onBack, onReanalyze }) {
    return (
        <div className="absolute inset-x-3.5 bottom-[22%] z-10 flex flex-col gap-3 rounded-xl border border-[#fbbf24]/40 bg-[#1a160b]/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center" role="status">
            <WarningCircle size={20} className="shrink-0 text-[#fbbf24]" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="font-chakra text-sm font-semibold text-[#f8fafc]">Level di chart berasal dari {sourceLabel} {formatTimeframe(analysisTimeframe)}</p>
                <p className="font-chakra text-xs text-[#94a3b8]">{trendText}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
                <button type="button" onClick={onBack} className="font-chakra text-xs font-semibold text-[#cbd5e1] hover:text-white">
                    Kembali ke {formatTimeframe(analysisTimeframe)}
                </button>
                {canReanalyze && (
                    <button type="button" onClick={onReanalyze} className="h-8 rounded-lg bg-[#b8fb5c] px-3 font-chakra text-xs font-semibold text-black hover:bg-[#a8ec4c]">
                        Analisis ulang di {formatTimeframe(chartTimeframe)}
                    </button>
                )}
            </div>
        </div>
    );
}

function BiasCard({ tab, symbol, timeframe, now, onAnalyze }) {
    if (!tab || tab.status === TAB_STATUS.ERROR) {
        return (
            <Panel className="flex flex-col items-center gap-3 px-5 py-8 text-center">
                <p className="font-chakra text-sm font-semibold text-[#f8fafc]">
                    {tab ? "Analisis gagal" : `Belum ada hasil analisis ${baseOf(symbol)}/USDT · ${formatTimeframe(timeframe)}`}
                </p>
                <p className="font-chakra text-xs text-[#94a3b8]">{tab ? tab.error : "Jalankan analisis untuk menggambar entry, SL, dan TP di chart."}</p>
                <button type="button" onClick={onAnalyze} className={`${BUTTON_PRIMARY} mt-1 w-auto`}>Analisis sekarang</button>
            </Panel>
        );
    }
    if (tab.status === TAB_STATUS.LOADING) {
        return (
            <Panel className="flex flex-col items-center gap-3 px-5 py-10 text-center" aria-busy="true">
                <span className="h-24 w-48 rounded-t-full border-[14px] border-b-0 border-[#1e293b] motion-safe:animate-pulse" aria-hidden />
                <p className="font-mono text-xs text-[#b8fb5c]" role="status">Menganalisis {formatTimeframe(tab.timeframe)}…</p>
            </Panel>
        );
    }

    const signal = tab.signal;
    const summary = summarizeFactors(buildBiasFactors(signal, { formatPrice }), signal.bias);
    const updated = formatRelativeTime(tab.analyzedAt, { now, placeholder: "" }).toLowerCase();

    return (
        <Panel className="px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
                <p className={SECTION_LABEL}>Bias analisis</p>
                <p className="font-mono text-[11px] text-[#64748b]">{formatTimeframe(tab.timeframe)}{updated ? ` · ${updated}` : ""}</p>
            </div>
            <div className="mt-2 flex justify-center">
                <BiasGauge bias={signal.bias} score={signal.score} confidence={summary.confidence} />
            </div>
            <p className="mt-3 text-center font-chakra text-xs text-[#94a3b8]">
                {summary.confidence === null ? "Faktor terbelah, belum ada arah dominan" : `${summary.supporting} dari ${summary.available} faktor mendukung ${signal.bias === "short" ? "Short" : "Long"}`}
                {" "}
                <Link href={dashboardHref({ open: symbol, timeframe: tab.timeframe })} className="font-semibold text-[#a3e635] hover:underline">Lihat faktor</Link>
            </p>
        </Panel>
    );
}

function MonitorCard({ item, onReanalyze }) {
    const movement = describeLockedMovement(item);
    const zones = lockedTrackZones(item);
    const activeZone = zones.find((zone) => zone !== TRACK_ZONE.IDLE);
    const statusText = movement.kind === "distance" ? "Menunggu entry" : TRACK_STATUS[activeZone] || "Dipantau";
    const zoneClass = { idle: "bg-[#334155]", loss: "bg-[#f87171]", profit: "bg-[#4ade80]", passed: "bg-[#4ade80]/40" };
    const pnl = movement.kind === "return" ? movement.percent : null;

    return (
        <Panel className="flex flex-col gap-3 px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
                <p className={SECTION_LABEL}>Status pantauan</p>
                <p className="font-chakra text-[11px] font-semibold text-[#a3e635]">{statusText}</p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-[#232a30] bg-[#161a1e] p-3.5">
                <div className="flex items-center gap-2.5">
                    <CoinAvatar label={item.base} size="sm" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-chakra text-sm font-bold text-[#f8fafc]">{item.base}/USDT</p>
                        <p className="font-chakra text-[11px] text-[#64748b]">{formatTimeframe(item.timeframe)} · dikunci {formatClock(item.createdAt)}</p>
                    </div>
                    <BiasPill bias={item.bias} />
                </div>
                <div className="flex h-1 gap-[3px]" aria-hidden>
                    {zones.map((zone, index) => <span key={index} className={`h-full flex-1 rounded-sm ${zoneClass[zone]}`} />)}
                </div>
                <div className="grid grid-cols-3 font-mono text-[10px] text-[#64748b]" aria-hidden>
                    <span>SL</span><span className="text-[#94a3b8]">Entry</span><span className="flex justify-between"><span>TP1</span><span>TP2</span></span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-mono text-[11px] text-[#94a3b8]">Entry {formatPrice(item.entry)} → {formatPrice(item.currentPrice)}</p>
                    <p className={`font-mono text-[15px] font-semibold ${pnl === null ? "text-[#64748b]" : pnl >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                        {pnl === null ? "—" : formatPercent(pnl)}
                    </p>
                </div>
            </div>
            <div className="rounded-lg bg-[#161a1e] px-3.5 py-2.5">
                <p className="font-chakra text-xs text-[#94a3b8]">
                    Snapshot saat dikunci: {String(item.bias).toUpperCase()}, entry {formatPrice(item.entry)}{item.riskReward ? `, R:R 1 : ${Number(item.riskReward).toFixed(1)}` : ""}
                </p>
                <button type="button" onClick={onReanalyze} className="mt-1 font-chakra text-xs font-semibold text-[#a3e635] hover:underline">
                    Analisis ulang sekarang
                </button>
            </div>
        </Panel>
    );
}

const SIDE_TABS = [
    { key: "dcms", label: () => "Analisis DCMS" },
    { key: "ai", label: ({ aiBusy }) => <AiTabLabel busy={aiBusy} /> },
];

// Indikator tab meluncur ke tab aktif dan berganti warna: netral untuk DCMS, violet untuk AI.
function SideTabs({ active, onChange, aiBusy }) {
    const aiActive = active === "ai";
    return (
        <div role="tablist" aria-label="Panel analisis" className="relative grid grid-cols-2 gap-1 rounded-xl border border-[#232a30] bg-[#111417] p-1">
            <span aria-hidden
                className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-6px)] rounded-[9px] border transition-[translate,background-color,border-color] duration-300 ease-[var(--ai-ease)] ${aiActive ? "translate-x-[calc(100%+4px)] border-[#a78bfa]/[0.45] bg-[#a78bfa]/[0.12]" : "translate-x-0 border-[#334155] bg-[#1e252b]"}`} />
            {SIDE_TABS.map((tab) => {
                const selected = tab.key === active;
                return (
                    <button key={tab.key} type="button" role="tab" aria-selected={selected} onClick={() => onChange(tab.key)}
                        className={`group relative inline-flex h-[35px] items-center justify-center gap-1.5 rounded-[9px] px-2.5 font-chakra text-[13px] font-semibold transition-[color,scale] duration-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa] ${selected ? "text-[#f8fafc]" : "text-[#94a3b8] hover:text-[#f8fafc]"}`}>
                        {tab.label({ aiBusy })}
                    </button>
                );
            })}
        </div>
    );
}

function LevelPanel({ levels, hidden, currentPrice, onToggle }) {
    return (
        <Panel className="px-5 pb-2 pt-5">
            <div className="flex items-center justify-between gap-3">
                <p className={SECTION_LABEL}>Level di chart</p>
                <p className="font-chakra text-[11px] text-[#64748b]">dari harga sekarang</p>
            </div>
            {levels.length === 0 ? (
                <p className="py-4 font-chakra text-xs text-[#94a3b8]">Belum ada level untuk digambar.</p>
            ) : (
                <ul className="mt-2 flex flex-col">
                    {levels.map((level) => {
                        const visible = !hidden.has(level.key);
                        const distance = level.kind === "zone" ? null : distanceFromPrice(level.price, currentPrice);
                        return (
                            <li key={level.key} className={`flex items-center gap-3 border-b border-[#232a30] py-3 transition last:border-b-0 ${visible ? "" : "opacity-45"}`}>
                                <span className="w-4 shrink-0 border-t-2 border-dashed" style={{ borderColor: level.color }} aria-hidden />
                                <div className="min-w-0 flex-1">
                                    <p className="font-chakra text-sm font-medium text-[#f8fafc]">{level.label}</p>
                                    <p className="font-mono text-[11px] text-[#94a3b8]">
                                        {level.kind === "zone" ? `${formatPrice(level.low)}–${formatPrice(level.high)}` : formatPrice(level.price)}
                                        {distance !== null && (
                                            <span className={`ml-1.5 ${distance >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{formatPercent(distance)}</span>
                                        )}
                                    </p>
                                </div>
                                <Switch checked={visible} onChange={() => onToggle(level.key)} label={`Tampilkan ${level.label} di chart`} />
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

export default function ChartWorkspace({ symbol, analysisTimeframe, lockedId }) {
    const router = useRouter();
    const analysis = useAnalysisTabs();
    const locked = useLockedSignals({ enabled: true, pollMs: 30_000 });
    const [chartTimeframe, setChartTimeframe] = useState(analysisTimeframe);
    const [hidden, setHidden] = useState(() => new Set());
    const [menuOpen, setMenuOpen] = useState(false);
    const [dcmsMenuOpen, setDcmsMenuOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sideTab, setSideTab] = useState("dcms");
    const [aiBusy, setAiBusy] = useState(false);
    const [aiLayer, setAiLayer] = useState(null);
    const [aiHideToken, setAiHideToken] = useState(0);
    const [resetToken, setResetToken] = useState(0);
    const [locking, setLocking] = useState(false);
    const [toasts, setToasts] = useState([]);
    const now = useNow();
    const chartCardRef = useRef(null);
    const fullscreen = useIsFullscreen(chartCardRef);

    const mode = lockedId ? "monitor" : "analysis";
    const tab = analysis.tabs.find((item) => item.key === analysisKey(symbol, analysisTimeframe)) || null;
    const signal = tab?.status === TAB_STATUS.READY ? tab.signal : tab?.previous?.signal ?? null;
    const lockedItem = lockedId
        ? locked.items.find((item) => String(item.id) === String(lockedId)) || null
        : locked.items.find((item) => item.symbol === symbol && item.timeframe === analysisTimeframe) || null;

    const candles = useChartCandles(symbol, chartTimeframe);
    const livePairs = useMemo(() => [{ symbol }], [symbol]);
    const live = useLivePrices(livePairs, { enabled: Boolean(symbol) });
    const livePrice = Number(live.prices[symbol]) || null;
    const currentPrice = livePrice ?? candles.data?.currentPrice ?? null;
    const chartCandles = useMemo(
        () => applyLivePrice(candles.data?.candles || [], livePrice, { nowSeconds: Math.floor(now / 1000), timeframe: chartTimeframe }),
        [candles.data, livePrice, chartTimeframe, now],
    );

    const levels = useMemo(
        () => (mode === "monitor" ? levelsFromLocked(lockedItem) : levelsFromAnalysis(signal, candles.data?.keyLevels)),
        [mode, lockedItem, signal, candles.data?.keyLevels],
    );
    const bias = mode === "monitor" ? lockedItem?.bias : signal?.bias;
    const isLocked = Boolean(lockedItem);
    const pair = `${baseOf(symbol)}/USDT`;
    const sameTimeframe = chartTimeframe === analysisTimeframe;

    const dismissToast = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
    const showToast = useCallback((type, message, extra = {}) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((current) => [...current.slice(-2), { id, type, message, ...extra }]);
    }, []);

    // Indikator script dihitung dari set candle dasar (tanpa tick live) supaya
    // tidak dijalankan ulang setiap 10 detik.
    const controller = useIndicatorController({
        candles: candles.data?.candles || NO_BARS,
        volume: candles.data?.volume || NO_BARS,
        timeframe: chartTimeframe,
        symbol,
        showToast,
    });
    const indicators = controller.preferences.toggles;
    const dcms = controller.preferences.dcmsLayer;
    const editorOpen = controller.editor.open;
    const sideWidth = useSidePanelWidth();
    const layoutRef = useRef(null);
    const setToggle = (key) => controller.updatePreferences((current) => ({ ...current, toggles: { ...current.toggles, [key]: !current.toggles[key] } }));
    const updateDcms = (patch) => controller.updatePreferences((current) => ({ ...current, dcmsLayer: { ...current.dcmsLayer, ...patch } }));
    const dcmsLevelsVisible = dcms.visible && dcms.levels;
    // Lapisan AI digambar di atas level DCMS yang diredupkan (desain Step 4).
    const chartLevels = useMemo(() => {
        const base = dcmsLevelsVisible ? levels : NO_BARS;
        if (!aiLayer) return base;
        return [...dimLevels(base), ...levelsFromAgentPlan(aiLayer.plan)];
    }, [dcmsLevelsVisible, levels, aiLayer]);
    const aiFocusLabel = FOCUS_OPTIONS.find((option) => option.key === aiLayer?.focus)?.label;

    // Garis "Dikunci" ditempel ke candle tempat waktu lock jatuh.
    const lockMarker = useMemo(() => {
        if (!lockedItem?.createdAt) return null;
        const span = TIMEFRAME_SECONDS[chartTimeframe];
        const seconds = Math.floor(new Date(lockedItem.createdAt).getTime() / 1000);
        if (!span || !Number.isFinite(seconds)) return null;
        return { time: Math.floor(seconds / span) * span, label: `Dikunci ${formatClock(lockedItem.createdAt)} · ${formatPrice(lockedItem.entry)}` };
    }, [lockedItem, chartTimeframe]);

    // Penanda struktur hanya relevan di timeframe tempat struktur dihitung.
    const structureMarker = useMemo(() => {
        const trend = signal?.structure?.trend;
        if (mode !== "analysis" || !sameTimeframe || (trend !== "up" && trend !== "down")) return null;
        const recent = chartCandles.slice(-11, -1);
        if (!recent.length) return null;
        const pick = trend === "up"
            ? recent.reduce((low, candle) => (candle.low < low.low ? candle : low))
            : recent.reduce((high, candle) => (candle.high > high.high ? candle : high));
        return trend === "up"
            ? { time: pick.time, text: "Higher low" }
            : { time: pick.time, text: "Lower high" };
    }, [signal, mode, sameTimeframe, chartCandles]);

    const trendText = useMemo(() => {
        const fast = emaSeries(chartCandles, 21).at(-1)?.value;
        const slow = emaSeries(chartCandles, 50).at(-1)?.value;
        return describeTimeframeTrend({ emaFast: fast, emaSlow: slow, timeframe: formatTimeframe(chartTimeframe) });
    }, [chartCandles, chartTimeframe]);

    function toggleLevel(key) {
        setHidden((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    async function copyText(text, successMessage) {
        try {
            await navigator.clipboard.writeText(text);
            showToast("success", successMessage);
        } catch {
            showToast("error", "Clipboard tidak bisa diakses browser ini.");
        }
    }

    function copyLevels() {
        copyText(
            formatLevelsForClipboard({ pair, bias, timeframe: formatTimeframe(analysisTimeframe), levels, formatPrice }),
            `Level ${pair} disalin.`,
        );
    }

    function openAnalysisMode(timeframe) {
        analysis.analyze(symbol, timeframe, { reanalyze: true });
        router.replace(`/dashboard/chart?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
    }

    async function handleLock() {
        if (!signal || locking) return;
        setLocking(true);
        try {
            // Yang dikunci selalu level dari hasil analisis, berapa pun timeframe chart-nya.
            const payload = await lockSignalPlan({ signalId: signal.signalId ?? null }, signal);
            const item = payload?.signal;
            if (item) locked.setItems((items) => [item, ...items.filter((existing) => existing.id !== item.id)]);
            showToast("success", `${pair} · ${String(signal.bias).toUpperCase()} dikunci. Masuk ke Sinyal Terkunci di Dashboard.`, {
                autoDismissMs: UNDO_LOCK_MS,
                action: item ? {
                    label: "Batalkan",
                    onClick: () => apiRequest(`/signals/locked/${encodeURIComponent(item.id)}`, { method: "DELETE" })
                        .then(() => locked.setItems((items) => items.filter((existing) => existing.id !== item.id)))
                        .catch((undoError) => showToast("error", undoError?.message || "Lock gagal dibatalkan.")),
                } : undefined,
                secondaryAction: { label: "Lihat di Dashboard", onClick: () => router.push(dashboardHref({ highlight: item?.id })) },
            });
        } catch (lockError) {
            showToast("error", lockError?.message || "Lock sinyal gagal. Coba lagi.");
        } finally {
            setLocking(false);
        }
    }

    async function handleDelete() {
        if (!lockedItem) return;
        if (!window.confirm(`Hapus ${pair} dari pantauan? Pemantauan harga untuk rencana ini berhenti.`)) return;
        try {
            await apiRequest(`/signals/locked/${encodeURIComponent(lockedItem.id)}`, { method: "DELETE" });
            router.push("/dashboard");
        } catch (deleteError) {
            showToast("error", deleteError?.message || `${pair} gagal dihapus. Coba lagi.`);
        }
    }

    function toggleFullscreen() {
        const card = chartCardRef.current;
        if (!card) return;
        if (document.fullscreenElement) document.exitFullscreen?.();
        else card.requestFullscreen?.();
    }

    const subtitle = mode === "analysis" && !dcms.visible
        ? "Bitunix Futures · Perp · mode indikator pribadi"
        : mode === "monitor" && lockedItem
        ? `Bitunix Futures · Perp · dikunci ${formatClock(lockedItem.createdAt)}, ${formatRelativeTime(lockedItem.createdAt, { now, placeholder: "" }).toLowerCase()}`
        : tab?.analyzedAt
            ? `Bitunix Futures · Perp · hasil analisis ${formatTimeframe(analysisTimeframe)}, ${formatRelativeTime(tab.analyzedAt, { now, placeholder: "" }).toLowerCase()}`
            : "Bitunix Futures · Perp";
    const movement = lockedItem ? describeLockedMovement({ ...lockedItem, currentPrice: currentPrice ?? lockedItem.currentPrice }) : null;
    const priceChange = mode === "monitor" && movement?.kind === "return"
        ? { value: movement.percent, label: "sejak dikunci" }
        : candles.data?.change24h !== null && candles.data?.change24h !== undefined
            ? { value: candles.data.change24h, label: "24j" }
            : null;
    const monitorMissing = mode === "monitor" && !locked.loading && !lockedItem;
    const levelSourceLabel = mode === "monitor"
        ? `Dari sinyal terkunci ${formatTimeframe(analysisTimeframe)}`
        : `Dari analisis ${formatTimeframe(analysisTimeframe)}${tab?.analyzedAt ? `, ${formatRelativeTime(tab.analyzedAt, { now, placeholder: "" }).toLowerCase()}` : ""}`;

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:pt-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <Link href={dashboardHref({ open: symbol, timeframe: analysisTimeframe })} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#334155] px-3 font-chakra text-sm text-[#cbd5e1] transition hover:border-[#475569] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]">
                        <CaretLeft size={14} aria-hidden /> Dashboard
                    </Link>
                    <span className="hidden h-8 w-px bg-[#232a30] sm:block" aria-hidden />
                    <CoinAvatar label={baseOf(symbol)} />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-chakra text-xl font-bold leading-[26px] text-[#f8fafc]">{pair}</h1>
                            {bias && dcms.visible && <BiasPill bias={bias} />}
                            {isLocked && (
                                <span className="inline-flex h-6 items-center gap-1 rounded-full border border-[#b8fb5c]/40 bg-[#b8fb5c]/10 px-2.5 font-mono text-[10px] font-semibold tracking-[0.06em] text-[#b8fb5c]">
                                    <LockSimple size={11} weight="bold" aria-hidden /> TERKUNCI
                                </span>
                            )}
                        </div>
                        <p className="truncate font-chakra text-xs text-[#64748b]">{subtitle}</p>
                    </div>
                </div>
                <div className="text-left sm:text-right">
                    <p className="font-mono text-[22px] font-semibold leading-7 text-[#f8fafc]">{currentPrice ? `$${formatPrice(currentPrice)}` : "—"}</p>
                    {priceChange && (
                        <p className={`font-mono text-xs ${priceChange.value >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                            {formatPercent(priceChange.value)} {priceChange.label}
                        </p>
                    )}
                </div>
            </header>

            {/* Panel kanan bisa digeser lebarnya; chart selalu menyisakan minimal 480px. */}
            <div ref={layoutRef} style={{ "--side-width": `${sideWidth}px` }}
                className={`grid grid-cols-1 items-start gap-5 ${editorOpen ? "" : "lg:grid-cols-[minmax(0,1fr)_20px_min(var(--side-width),max(280px,calc(100%_-_500px)))] lg:gap-x-0"}`}>
                <div className="flex min-w-0 flex-col gap-4">
                <section ref={chartCardRef} aria-label={`Chart ${pair}`} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#232a30] bg-[#111417]">
                    <div className="flex flex-wrap items-center gap-2 border-b border-[#232a30] px-3.5 py-2.5">
                        <div className="flex items-center gap-1" role="group" aria-label="Timeframe chart">
                            {ANALYSIS_TIMEFRAMES.map((option) => {
                                const active = option === chartTimeframe;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setChartTimeframe(option)}
                                        aria-pressed={active}
                                        title={option === analysisTimeframe ? "Timeframe analisis" : undefined}
                                        className={`inline-flex h-7 items-center gap-1 rounded-md border px-2.5 font-mono text-[11px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] ${active ? "border-[#b8fb5c] bg-[#b8fb5c]/15 text-[#b8fb5c]" : "border-transparent text-[#94a3b8] hover:text-white"}`}
                                    >
                                        {option === analysisTimeframe && !active && <span className="size-1.5 rounded-full bg-[#b8fb5c]" aria-hidden />}
                                        {formatTimeframe(option)}
                                    </button>
                                );
                            })}
                        </div>
                        <span className="h-5 w-px bg-[#232a30]" aria-hidden />
                        <ToolbarChip active={indicators.ema21} dotColor="#60a5fa" onClick={() => setToggle("ema21")}>EMA 21</ToolbarChip>
                        <ToolbarChip active={indicators.ema50} dotColor="#c084fc" onClick={() => setToggle("ema50")}>EMA 50</ToolbarChip>
                        <ToolbarChip active={indicators.volume} dotColor="#94a3b8" onClick={() => setToggle("volume")}>Volume</ToolbarChip>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setMenuOpen((value) => !value)}
                                aria-expanded={menuOpen}
                                className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[11px] font-medium transition ${menuOpen || controller.chartIndicators.length ? "border-[#b8fb5c]/60 bg-[#b8fb5c]/10 text-[#b8fb5c]" : "border-[#232a30] text-[#cbd5e1] hover:text-white"}`}
                            >
                                <FunctionIcon size={13} aria-hidden /> Indikator
                            </button>
                            {menuOpen && (
                                <IndicatorMenu
                                    onClose={() => setMenuOpen(false)}
                                    toggles={indicators}
                                    activeKeys={controller.activeKeys}
                                    saved={controller.workspace.saved}
                                    syncMode={controller.workspace.syncMode}
                                    {...controller.menuHandlers}
                                    onEditSaved={(item) => {
                                        setMenuOpen(false);
                                        controller.menuHandlers.onEditSaved(item);
                                    }}
                                    onCreate={() => {
                                        setMenuOpen(false);
                                        controller.menuHandlers.onCreate();
                                    }}
                                />
                            )}
                        </div>
                        {mode === "analysis" && (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setDcmsMenuOpen((value) => !value)}
                                    aria-expanded={dcmsMenuOpen}
                                    className={`inline-flex h-7 items-center rounded-md border px-2.5 font-mono text-[11px] font-medium transition ${dcms.visible ? "border-[#232a30] text-[#cbd5e1] hover:text-white" : "border-[#fbbf24]/50 text-[#fbbf24]"}`}
                                >
                                    {dcms.visible ? "Analisis DCMS" : "Analisis DCMS · off"}
                                </button>
                                {dcmsMenuOpen && <DcmsLayerMenu layer={dcms} onChange={updateDcms} onClose={() => setDcmsMenuOpen(false)} />}
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            <button type="button" onClick={() => setResetToken((value) => value + 1)} className="font-chakra text-xs font-medium text-[#cbd5e1] hover:text-white">Reset zoom</button>
                            <button type="button" onClick={toggleFullscreen} className="grid size-7 place-items-center rounded text-[#cbd5e1] hover:bg-white/[0.06] hover:text-white" aria-label={fullscreen ? "Keluar dari layar penuh" : "Layar penuh"}>
                                <ArrowsOut size={16} aria-hidden />
                            </button>
                        </div>
                    </div>

                    <div className={`relative ${fullscreen ? "h-[calc(100dvh-49px)]" : editorOpen ? "h-[440px]" : "h-[520px] lg:h-[max(560px,calc(100dvh-260px))]"}`}>
                        {candles.data ? (
                            <LiveChart
                                pair={pair}
                                timeframeLabel={formatTimeframe(chartTimeframe)}
                                candles={chartCandles}
                                volume={candles.data.volume}
                                currentPrice={currentPrice}
                                levels={chartLevels}
                                legendExtra={aiLayer && (
                                    <span className="ai-pop pointer-events-auto flex w-fit items-center gap-1.5 rounded-md border border-[#a78bfa]/60 bg-[#111417]/90 px-2 py-0.5 text-[#a78bfa]">
                                        <Sparkle size={11} weight="fill" aria-hidden />
                                        AI Agent{aiFocusLabel ? ` · ${aiFocusLabel}` : ""} · {aiLayer.plan.bias.toUpperCase()}
                                        <button type="button" onClick={() => setAiHideToken((token) => token + 1)} aria-label="Sembunyikan lapisan AI" className="ml-1 rounded px-1 text-[#94a3b8] transition-[color,background-color,scale] duration-200 hover:bg-[#a78bfa]/15 hover:text-[#f8fafc] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a78bfa]">×</button>
                                    </span>
                                )}
                                hiddenLevels={hidden}
                                showEma21={indicators.ema21}
                                showEma50={indicators.ema50}
                                showVolume={indicators.volume}
                                structureMarker={dcms.visible && dcms.structure ? structureMarker : null}
                                lockMarker={dcms.visible ? lockMarker : null}
                                indicators={controller.chartIndicators}
                                newPaneUid={controller.newPaneUid}
                                onIndicatorAction={controller.indicatorAction}
                                levelSourceLabel={levelSourceLabel}
                                resetToken={resetToken}
                                onHideLevel={toggleLevel}
                                onCopyLevel={(level) => copyText(formatPrice(level.price), `${level.label} ${formatPrice(level.price)} disalin.`)}
                            />
                        ) : candles.error ? (
                            <div className="grid size-full place-items-center p-6 text-center" role="alert">
                                <div>
                                    <p className="font-chakra text-sm text-[#f8fafc]">Data chart gagal dimuat.</p>
                                    <p className="mt-1 font-chakra text-xs text-[#94a3b8]">{candles.error}</p>
                                    <button type="button" onClick={candles.retry} className="mt-3 font-chakra text-xs font-semibold text-[#b8fb5c] underline">Coba lagi</button>
                                </div>
                            </div>
                        ) : (
                            <div className="size-full motion-safe:animate-pulse bg-[#161a1e]" aria-label="Memuat chart" />
                        )}
                        {aiBusy && (
                            <p className="ai-pop pointer-events-none absolute left-1/2 top-14 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#a78bfa]/50 bg-[#111417]/90 px-3 py-1 font-mono text-[11px] font-medium text-[#a78bfa]" role="status">
                                <Sparkle size={12} weight="fill" aria-hidden className="motion-safe:animate-pulse" /> AI Agent sedang membaca chart {pair}
                            </p>
                        )}
                        {candles.data && candles.loading && (
                            <p className="absolute right-20 top-3 z-10 font-mono text-[11px] text-[#b8fb5c]" role="status">Memuat {formatTimeframe(chartTimeframe)}…</p>
                        )}
                        {!sameTimeframe && dcmsLevelsVisible && levels.length > 0 && (
                            <TimeframeBanner
                                sourceLabel={mode === "monitor" ? "sinyal terkunci" : "analisis"}
                                analysisTimeframe={analysisTimeframe}
                                chartTimeframe={chartTimeframe}
                                trendText={trendText}
                                canReanalyze={mode === "analysis"}
                                onBack={() => setChartTimeframe(analysisTimeframe)}
                                onReanalyze={() => openAnalysisMode(chartTimeframe)}
                            />
                        )}
                    </div>
                </section>

                {editorOpen && (
                    <ScriptEditor
                        tabs={controller.editor.tabs}
                        activeTabId={controller.editor.activeTabId}
                        runs={controller.runs}
                        saving={controller.editor.saving}
                        onSelectTab={controller.editor.setActiveTabId}
                        onNewTab={controller.editor.createTab}
                        onCloseTab={controller.editor.closeTab}
                        onChangeSource={controller.editor.changeSource}
                        onMarkChecked={controller.editor.markChecked}
                        onSave={controller.editor.save}
                        onAddToChart={controller.editor.addToChart}
                        onClose={() => controller.editor.setOpen(false)}
                        onOpenReference={() => setDrawerOpen(true)}
                    />
                )}
                </div>

                {/* Editor terbuka: panel kanan disembunyikan supaya chart dan kode lebih lebar. */}
                {!editorOpen && <SidePanelResizer gridRef={layoutRef} width={sideWidth} />}
                {!editorOpen && (
                <aside className="flex min-w-0 flex-col gap-3" aria-label="Ringkasan sinyal">
                    <SideTabs active={sideTab} onChange={setSideTab} aiBusy={aiBusy} />
                    {/* Tetap terpasang saat tab lain dibuka supaya percakapan tidak hilang. Animasi
                        ai-rise terputar ulang setiap kali wrapper keluar dari display:none. */}
                    <div className={sideTab === "ai" ? "ai-rise" : "hidden"}>
                        <AiAgentPanel key={symbol} symbol={symbol} pair={pair} currentPrice={currentPrice} hideToken={aiHideToken} onBusyChange={setAiBusy} onPlanChange={setAiLayer} />
                    </div>
                    {sideTab === "dcms" && (<div className="ai-rise flex flex-col gap-3">{mode === "analysis" && !dcms.visible ? (
                        <DcmsHiddenCards
                            onShow={() => updateDcms({ visible: true })}
                            activeIndicators={controller.chartIndicators}
                            toggles={indicators}
                            onToggleIndicator={(uid) => controller.indicatorAction(uid, "toggle-visible")}
                            onToggleVolume={() => setToggle("volume")}
                            onOpenMenu={() => setMenuOpen(true)}
                        />
                    ) : (
                    <>
                    {mode === "monitor" ? (
                        monitorMissing ? (
                            <Panel className="px-5 py-8 text-center">
                                <p className="font-chakra text-sm font-semibold text-[#f8fafc]">Sinyal ini tidak lagi dipantau</p>
                                <p className="mt-1 font-chakra text-xs text-[#94a3b8]">TP2, SL, atau masa berlakunya mungkin sudah tercapai.</p>
                                <Link href="/dashboard/signals/history" className="mt-3 inline-block font-chakra text-xs font-semibold text-[#a3e635] hover:underline">Buka Riwayat signal</Link>
                            </Panel>
                        ) : lockedItem ? (
                            <MonitorCard item={{ ...lockedItem, currentPrice: currentPrice ?? lockedItem.currentPrice }} onReanalyze={() => openAnalysisMode(analysisTimeframe)} />
                        ) : (
                            <Panel className="h-48 motion-safe:animate-pulse" aria-label="Memuat sinyal terkunci" />
                        )
                    ) : dcms.biasCard && (
                        <BiasCard tab={tab} symbol={symbol} timeframe={analysisTimeframe} now={now} onAnalyze={() => analysis.analyze(symbol, analysisTimeframe)} />
                    )}

                    {(mode === "monitor" || dcms.levels) && (
                        <LevelPanel levels={levels} hidden={hidden} currentPrice={currentPrice} onToggle={toggleLevel} />
                    )}

                    {mode === "monitor" ? (
                        <div className="flex flex-col gap-2">
                            <Link href={dashboardHref({ open: symbol, timeframe: analysisTimeframe })} className={BUTTON_SECONDARY}>Buka hasil analisis</Link>
                            <button type="button" onClick={copyLevels} disabled={!levels.length} className={BUTTON_SECONDARY}>Salin level entry, SL, TP</button>
                            <button type="button" onClick={handleDelete} disabled={!lockedItem} className={`${BUTTON_SECONDARY} border-[#f87171]/40 text-[#f87171] hover:border-[#f87171]`}>
                                Hapus dari pantauan
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {isLocked ? (
                                <button type="button" disabled className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#4ade80]/40 bg-[#4ade80]/10 font-chakra text-sm font-semibold text-[#4ade80]">
                                    <Check size={14} weight="bold" aria-hidden /> Terkunci
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleLock}
                                    disabled={!signal || locking || (signal.bias !== "long" && signal.bias !== "short")}
                                    title={signal && signal.bias !== "long" && signal.bias !== "short" ? "Bias netral belum punya setup" : undefined}
                                    className={BUTTON_PRIMARY}
                                >
                                    {locking ? "Mengunci…" : "Lock sinyal"}
                                </button>
                            )}
                            <button type="button" onClick={copyLevels} disabled={!levels.length} className={BUTTON_SECONDARY}>Salin level entry, SL, TP</button>
                        </div>
                    )}
                    </>
                    )}</div>)}
                </aside>
                )}
            </div>

            {controller.settings.indicator && (
                <IndicatorSettingsModal
                    key={controller.settings.uid}
                    indicator={controller.settings.indicator}
                    source={controller.settings.source}
                    onApply={controller.settings.apply}
                    onClose={controller.settings.close}
                />
            )}
            {drawerOpen && <FunctionsDrawer onClose={() => setDrawerOpen(false)} />}
            <DashboardToast toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
