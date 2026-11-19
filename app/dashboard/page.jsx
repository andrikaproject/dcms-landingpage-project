"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import DashboardToast from "./DashboardToast";
import ScamPumpSection from "./ScamPumpSection";
import AnalysisPanel from "./overview/AnalysisPanel";
import AnalyzeCoinModal from "./overview/AnalyzeCoinModal";
import LockedSignalsPanel, { formatLockedLevels } from "./overview/LockedSignalsPanel";
import TickerStrip from "./overview/TickerStrip";
import { readLastTimeframe, rememberTimeframe } from "./overview/analysis-timeframes";
import { formatPrice, pairLabel } from "./overview/ui";
import { useAnalysisTabs } from "./overview/useAnalysisTabs";
import { analysisKey } from "@/lib/signals/analysis-tabs";
import { lockSignalPlan } from "@/lib/signals/api";
import { LOCKED_ALERT, lockedAlerts } from "@/lib/signals/locked-track";
import { buildPartialTpPlan } from "@/lib/market/partial-tp";
import { apiRequest } from "@/lib/api/client";
import { useLockedSignals, useMarketDashboard } from "@/lib/market/dashboard";
import { describeDataHealth } from "@/lib/market/dashboard-core";
import { describeStatus } from "@/lib/signals/lifecycle";
import { describeLockedMovement, resolveLockedLifecycleStatus } from "@/lib/signals/locked";
import { useAuth } from "@/components/auth/AuthProvider";

// Slideout detail dimuat saat pertama kali dibuka saja.
const SignalDetailSideout = dynamic(() => import("./SignalDetailSideout"), { ssr: false });

const FONT_CHAKRA = "var(--font-chakra-petch), Chakra Petch, sans-serif";
const FIGMA_TEXT = {
    textBaseMediumWhite: {
        fontFamily: FONT_CHAKRA,
        fontSize: "clamp(0.875rem, 0.825rem + 0.25vw, 1rem)",
        fontWeight: 500,
        lineHeight: "24px",
        letterSpacing: 0,
        color: "#FFFFFF",
    },
    textXsBoldWhite: {
        fontFamily: FONT_CHAKRA,
        fontSize: "clamp(0.6875rem, 0.6625rem + 0.125vw, 0.75rem)",
        fontWeight: 700,
        lineHeight: "16px",
        letterSpacing: 0,
        color: "#FFFFFF",
    },
    textXsMedium: {
        fontFamily: FONT_CHAKRA,
        fontSize: "clamp(0.6875rem, 0.6625rem + 0.125vw, 0.75rem)",
        fontWeight: 500,
        lineHeight: "16px",
        letterSpacing: 0,
    },
};

function formatUsd(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    const number = Number(value);

    if (number >= 1000) {
        return `$${number.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: digits,
        })}`;
    }

    if (number >= 1) return `$${number.toFixed(digits)}`;
    return `$${number.toFixed(6)}`;
}

function formatSignedPercent(value) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function biasStyles(bias) {
    if (bias === "long") {
        return {
            badge: "bg-gradient-to-br from-[#8AEF5A] to-[#4ADE80] text-[#052e16]",
            metric: "text-[#a3e635]",
            label: "BIAS LONG",
        };
    }

    if (bias === "short") {
        return {
            badge: "bg-gradient-to-br from-[#f49062] to-[#fd371f] text-[#fef3f2]",
            metric: "text-[#f87171]",
            label: "BIAS SHORT",
        };
    }

    return {
        badge: "bg-gradient-to-br from-[#38bdf8] to-[#184BFF] text-white",
        metric: "text-[#38bdf8]",
        label: "NEUTRAL",
    };
}

function formatPriceLabel(value) {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? "-" : formatUsd(value);
}

function clampPercent(value) {
    return Math.max(0, Math.min(100, value));
}

function getRangePercent(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number) || max === min) return 0;
    return clampPercent((number - min) / (max - min) * 100);
}

function IndicatorPill({ label, value, tone, wide = false }) {
    return (
        <div className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-[#374151] px-3 py-1 ${wide ? "col-span-2" : ""}`}>
            <p style={FIGMA_TEXT.textXsBoldWhite}>{label}</p>
            <p className={`max-w-full truncate ${tone}`} style={{ ...FIGMA_TEXT.textXsBoldWhite, fontSize: 13 }}>
                {value}
            </p>
        </div>
    );
}

function SignalLevel({ label, value, align = "left" }) {
    const alignClass = align === "right" ? "items-end text-right" : align === "center" ? "items-center text-center" : "items-start text-left";

    return (
        <div className={`flex min-w-0 flex-col gap-1 ${alignClass}`}>
            <p style={FIGMA_TEXT.textXsBoldWhite}>{label}</p>
            <p className="truncate" style={FIGMA_TEXT.textXsBoldWhite}>{value}</p>
        </div>
    );
}

function SignalProgress({ signal }) {
    const levels = [
        { key: "sl", label: "SL", value: signal.sl },
        { key: "entry", label: "Entry", value: signal.entry },
        { key: "tp1", label: "TP1", value: signal.tp1 },
        { key: "tp2", label: "TP2", value: signal.tp2 || signal.tp },
    ].filter((level) => Number.isFinite(Number(level.value)));

    if (levels.length < 2) {
        return (
            <div className="flex flex-col gap-3">
                <div className="h-2.5 w-full rounded-[5px] bg-[#334155]" />
                <div className="grid grid-cols-2 gap-4 text-white sm:grid-cols-4">
                    <SignalLevel label="SL" value={formatPriceLabel(signal.sl)} />
                    <SignalLevel label="Entry" value={formatPriceLabel(signal.entry)} />
                    <SignalLevel label="TP1" value={formatPriceLabel(signal.tp1)} />
                    <SignalLevel label="TP2" value={formatPriceLabel(signal.tp2 || signal.tp)} />
                </div>
            </div>
        );
    }

    const numericValues = levels.map((level) => Number(level.value));
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const currentPercent = getRangePercent(signal.price, min, max);
    const entryPercent = getRangePercent(signal.entry, min, max);
    const fillLeft = Math.min(entryPercent, currentPercent);
    const fillWidth = Math.max(2, Math.abs(currentPercent - entryPercent));
    const isWaitingEntry = signal.lifecycleStatus === "PENDING_ENTRY";
    const isProfit = signal.bias === "short"
        ? Number(signal.price) <= Number(signal.entry)
        : Number(signal.price) >= Number(signal.entry);
    const fillColor = isWaitingEntry ? "#38bdf8" : isProfit ? "#8aef5a" : "#f87171";
    const labelAlign = (percent) => {
        if (percent <= 8) return "left";
        if (percent >= 92) return "right";
        return "center";
    };

    return (
        <div className="relative h-[112px] sm:h-[62px]">
            <div
                className="group relative h-5 w-full"
                role="img"
                aria-label={isWaitingEntry
                    ? `${signal.base} masih menunggu entry. Harga saat ini ${formatPriceLabel(signal.price)}.`
                    : `${signal.base} progress from stop loss to targets. Current price ${formatPriceLabel(signal.price)}.`}
            >
                <div className="absolute left-0 right-0 top-1/2 h-2.5 -translate-y-1/2 rounded-[5px] bg-[#334155]" />
                <div
                    className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[5px] transition-all"
                    style={{ left: `${fillLeft}%`, width: `${fillWidth}%`, backgroundColor: fillColor }}
                />
                {levels.map((level) => {
                    const percent = getRangePercent(level.value, min, max);
                    const isEntry = level.key === "entry";

                    return (
                        <span
                            key={level.key}
                            className={`absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#111827] ${isEntry ? "bg-white" : "bg-[#8aef5a]"}`}
                            style={{ left: `${percent}%` }}
                            title={`${level.label}: ${formatPriceLabel(level.value)}`}
                        />
                    );
                })}
                <span
                    className="absolute top-1/2 z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#B7FB5B] shadow-[0_0_0_6px_rgba(183,251,91,0.16)] transition-transform"
                    style={{ left: `${currentPercent}%` }}
                    title={`Current: ${formatPriceLabel(signal.price)}`}
                />
                <span
                    className="pointer-events-none absolute -top-8 z-30 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 opacity-0 transition group-hover:opacity-100"
                    style={{ left: `${currentPercent}%`, ...FIGMA_TEXT.textXsBoldWhite }}
                >
                    Current {formatPriceLabel(signal.price)}
                </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-white sm:hidden">
                {levels.map((level) => (
                    <SignalLevel key={level.key} label={level.label} value={formatPriceLabel(level.value)} />
                ))}
            </div>

            {levels.map((level) => {
                const percent = getRangePercent(level.value, min, max);
                const align = labelAlign(percent);
                const edgeClass = align === "left" ? "translate-x-0" : align === "right" ? "-translate-x-full" : "-translate-x-1/2";

                return (
                    <div
                        key={level.key}
                        className={`absolute top-7 hidden w-[112px] sm:block ${edgeClass}`}
                        style={{ left: `${percent}%` }}
                    >
                        <SignalLevel label={level.label} value={formatPriceLabel(level.value)} align={align} />
                    </div>
                );
            })}
        </div>
    );
}

function LockedSignalList({ lockedSignals, onRefresh, onRetry, onDeleted, refreshing, loading, error }) {
    return (
        <section id="lock-signal-list" className="scroll-mt-24 rounded-2xl border border-[#232a30] bg-[#111417] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">Lock Signal</p>
                    <h2 className="mt-1 font-nebulica text-[clamp(1.25rem,1.1rem+0.75vw,1.5rem)] font-bold text-white">Rencana yang diikuti</h2>
                </div>
                <div className="flex items-center gap-3">
                    <p className="font-chakra text-xs text-zinc-400">Auto refresh setiap 5 menit.</p>
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 font-chakra text-[11px] font-bold text-zinc-400 transition hover:border-[#B7FB5B]/40 hover:text-[#B7FB5B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B] disabled:cursor-wait disabled:opacity-50"
                    >
                        {refreshing ? "Memperbarui…" : "Refresh harga"}
                    </button>
                </div>
            </div>

            {/* Lock signal punya keadaan memuat dan gagalnya sendiri; data market
                tetap tampil apa pun hasilnya di sini. */}
            {loading && lockedSignals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-5 font-chakra text-sm text-zinc-400">
                    Memuat lock signal…
                </div>
            ) : error && lockedSignals.length === 0 ? (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5 font-chakra text-sm text-red-200">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="min-h-11 rounded-md border border-red-400/40 px-3 font-bold text-red-100 underline transition hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                    >
                        Coba lagi
                    </button>
                </div>
            ) : lockedSignals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-5 font-chakra text-sm text-zinc-400">
                    Belum ada signal yang dipantau. Klik Pantau Signal pada kartu hasil analisis untuk mulai memantau statusnya.
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
                    {lockedSignals.map((signal) => (
                        <LockedSignalCard key={signal.id} signal={signal} onDeleted={onDeleted} />
                    ))}
                </div>
            )}
        </section>
    );
}

function LockedPartialTpPlan({ signal }) {
    const plan = buildPartialTpPlan({
        bias: signal.bias,
        entry: Number(signal.entry),
        sl: Number(signal.sl),
        tp1: Number(signal.tp1),
        tp2: Number(signal.tp2),
    });

    if (!plan || !plan.isValid) return null;

    return (
        <div className="rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2">
            <p style={{ ...FIGMA_TEXT.textXsBoldWhite, fontSize: 10, color: "#71717a", textTransform: "uppercase" }}>
                Partial TP Plan
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                {plan.legs.map((leg) => (
                    <div key={leg.level} className="flex items-center gap-1.5">
                        <span className="rounded bg-[#8AEF5A]/15 px-1.5 py-0.5 font-chakra text-[10px] font-bold text-[#8AEF5A]">
                            {leg.allocationPct}%
                        </span>
                        <span className="font-chakra text-xs text-white">
                            {leg.level.toUpperCase()} {formatPriceLabel(leg.price)}
                        </span>
                    </div>
                ))}
            </div>
            <p className="mt-1 font-chakra text-[10px] text-zinc-400">
                Setelah TP1 hit → SL ke {formatPriceLabel(plan.breakevenSL)} (breakeven)
            </p>
        </div>
    );
}

function LockedSignalCard({ signal, onDeleted }) {
    const styles = biasStyles(signal.bias);
    const lifecycleStatus = resolveLockedLifecycleStatus(signal);
    const lifecycle = describeStatus(lifecycleStatus);
    const movement = describeLockedMovement(signal);
    const movementTone = movement.kind === "return"
        ? movement.percent >= 0 ? "text-[#a3e635]" : "text-[#f87171]"
        : movement.kind === "distance" ? "text-sky-300" : "text-zinc-400";
    const movementLabel = movement.kind === "return"
        ? `${formatSignedPercent(movement.percent)} Sejak Entry`
        : movement.kind === "distance"
            ? movement.position === "at"
                ? "Harga berada di level entry"
                : `${movement.percent.toFixed(2)}% ${movement.position === "above" ? "di atas" : "di bawah"} entry`
            : "Belum ada performa trade";
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    async function handleDelete() {
        if (deleting) return;

        // Hapus lock signal permanen di server dan tidak bisa di-undo, jadi
        // dikonfirmasi dulu lewat dialog bawaan browser.
        const confirmed = window.confirm(
            `Hapus lock signal ${signal.base}? Pantauan harga untuk rencana ini berhenti dan tidak bisa dikembalikan.`,
        );

        if (!confirmed) return;

        setDeleting(true);
        setDeleteError("");
        try {
            await apiRequest(`/signals/locked/${encodeURIComponent(signal.id)}`, { method: "DELETE" });
            onDeleted(signal.id);
        } catch (error) {
            setDeleteError(error.message || "Lock signal gagal dihapus. Periksa koneksi lalu coba lagi.");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <article className="@container relative overflow-hidden rounded-lg bg-gradient-to-br from-[#374151] to-[#111827] p-4 sm:p-5">
            <div className="relative flex flex-col gap-4">
                <div className="flex flex-col gap-3 @md:flex-row @md:items-start @md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md px-2 py-[3px] uppercase ${styles.badge}`} style={FIGMA_TEXT.textXsBoldWhite}>
                                {styles.label}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 font-chakra text-[10px] font-bold ${lifecycle.className}`}>
                                {lifecycle.label}
                            </span>
                        </div>
                        <h3 className="mt-2 truncate" style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700 }}>
                            {signal.base}/{signal.marketType === "DEX" ? "USD" : "USDT"}
                        </h3>
                        <p className={movementTone} style={FIGMA_TEXT.textXsMedium}>
                            {movementLabel}
                        </p>
                    </div>
                    <div className="flex items-start justify-between gap-3 @md:justify-end @md:text-right">
                        <div>
                            <p style={FIGMA_TEXT.textXsBoldWhite}>Current</p>
                            <p style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700 }}>{formatPriceLabel(signal.currentPrice)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="grid size-9 place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100 active:scale-[0.97] disabled:opacity-50"
                            aria-label={`Remove locked signal ${signal.base}`}
                            title="Remove locked signal"
                        >
                            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="m19 6-1 14H6L5 6" />
                                <path d="M10 11v5" />
                                <path d="M14 11v5" />
                            </svg>
                        </button>
                    </div>
                </div>

                {deleteError && (
                    <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 font-chakra text-xs text-red-200">
                        {deleteError}
                    </p>
                )}

                <SignalProgress
                    signal={{
                        ...signal,
                        price: signal.currentPrice,
                        tp: signal.tp2,
                        lifecycleStatus,
                    }}
                />

                <LockedPartialTpPlan signal={signal} />

                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,120px),1fr))] gap-2">
                    <IndicatorPill label="RSI" value={signal.rsi ? Math.round(signal.rsi) : "-"} tone={styles.metric} />
                    <IndicatorPill label="R:R" value={signal.riskReward ? `1:${Number(signal.riskReward).toFixed(1)}` : "-"} tone="text-[#a3e635]" />
                    <IndicatorPill label={`EMA${signal.fastPeriod || 21}`} value={formatPriceLabel(signal.emaFast)} tone="text-[#f8fafc]" />
                    <IndicatorPill label="STOCH RSI" value={signal.stochK ? Number(signal.stochK).toFixed(1) : "-"} tone={signal.stochK > signal.stochD ? "text-[#a3e635]" : "text-[#f87171]"} />
                </div>
            </div>
        </article>
    );
}

function DashboardIntro({ session, signals, onSelectTicker }) {
    return (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="min-w-0">
                <h1 className="font-chakra text-[22px] font-bold leading-7 text-[#f8fafc]">
                    Selamat datang, {session.user.name || session.user.email}
                </h1>
                <p className="mt-1 font-chakra text-sm leading-5 text-[#94a3b8]">
                    Dashboard ini hanya tools, selalu DYOR dengan segala informasi yang diberikan.
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-chakra text-xs font-semibold">
                    <Link href="/dashboard/signals/history" className="text-[#94a3b8] underline-offset-4 hover:text-[#f8fafc] hover:underline">
                        Riwayat signal
                    </Link>
                    {session.user.role === "ADMIN" && (
                        <Link href="/dashboard/admin" className="text-sky-300 underline-offset-4 hover:underline">
                            Panel admin
                        </Link>
                    )}
                </div>
            </div>
            <TickerStrip signals={signals} onSelect={onSelectTicker} />
        </section>
    );
}

const LOCKED_POLL_MS = 30_000;
const UNDO_LOCK_MS = 8_000;
const HIGHLIGHT_MS = 8_000;

export default function DashboardPage() {
    const { user } = useAuth();
    const isSignedIn = Boolean(user);
    // Data dashboard sekarang hanya mengisi ticker BTC/ETH/SOL (perubahan 24 jam
    // dan sparkline). Hasil analisis berasal dari koin yang dipilih user.
    const market = useMarketDashboard({ enabled: isSignedIn });
    const locked = useLockedSignals({ enabled: isSignedIn, pollMs: LOCKED_POLL_MS });
    const analysis = useAnalysisTabs();
    const [modal, setModal] = useState(null);
    const [detailSignal, setDetailSignal] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [highlightId, setHighlightId] = useState(null);
    // Sinyal yang dihapus user sendiri tidak dilaporkan sebagai "keluar dari pantauan".
    const removedIdsRef = useRef(new Set());
    const alertSnapshotRef = useRef(null);

    const { dashboard, error } = market;
    const dataHealth = describeDataHealth(dashboard?.meta);
    const session = { user: user || {} };
    const lockedKeys = new Set(locked.items.map((item) => analysisKey(item.symbol, item.timeframe)));

    const dismissToast = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
    const showToast = useCallback((type, message, extra = {}) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((current) => [...current.slice(-2), { id, type, message, ...extra }]);
    }, []);

    useEffect(() => {
        if (!highlightId) return undefined;
        const timer = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
        return () => window.clearTimeout(timer);
    }, [highlightId]);

    // Kembali dari Live chart: `open` mengaktifkan tab koin yang sama dan
    // `highlight` menyorot sinyal yang baru dikunci di sana. Dibaca sekali.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const open = params.get("open");
        const timeframe = params.get("timeframe");
        const highlight = params.get("highlight");
        if (!open && !highlight) return;
        if (open && timeframe) {
            const key = analysisKey(open, timeframe);
            if (analysis.tabs.some((tab) => tab.key === key)) analysis.select(key);
            else analysis.analyze(open, timeframe);
        }
        if (highlight) setHighlightId(highlight);
        window.history.replaceState(window.history.state, "", window.location.pathname);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Bandingkan setiap pembacaan daftar aktif dengan sebelumnya untuk
    // memberi tahu TP1 tersentuh atau sinyal yang selesai dipantau.
    const lockedItems = locked.items;
    const lockedLoading = locked.loading;
    useEffect(() => {
        if (lockedLoading) return;
        const { alerts, snapshot } = lockedAlerts(alertSnapshotRef.current, lockedItems, { ignoreIds: removedIdsRef.current });
        alertSnapshotRef.current = snapshot;
        for (const alert of alerts) {
            const pair = pairLabel(alert.signal);
            if (alert.kind === LOCKED_ALERT.TP1) {
                const movement = describeLockedMovement(alert.signal);
                const pnl = movement.kind === "return" ? `PnL ${formatSignedPercent(movement.percent)}. ` : "";
                showToast("success", `${pair} · TP1 tersentuh. ${pnl}Pertimbangkan geser SL ke entry.`, {
                    action: { label: "Lihat", onClick: () => openLockedItem(alert.signal) },
                    autoDismissMs: 15_000,
                });
            } else {
                showToast("info", `${pair} selesai dipantau: TP2, SL, atau masa berlakunya tercapai. Detailnya ada di Riwayat signal.`);
            }
        }
        // openLockedItem cukup diambil dari render terbaru; tidak perlu memicu ulang.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lockedItems, lockedLoading, showToast]);

    function openModal(query = "") {
        setModal({ query, timeframe: readLastTimeframe() });
    }

    function handleAnalyzeSubmit(symbol, timeframe) {
        rememberTimeframe(timeframe);
        setModal(null);
        analysis.analyze(symbol, timeframe);
    }

    function openLockedItem(signal) {
        const key = analysisKey(signal.symbol, signal.timeframe);
        if (analysis.tabs.some((tab) => tab.key === key)) analysis.select(key);
        else analysis.analyze(signal.symbol, signal.timeframe);
        document.getElementById("analysis-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function deleteLocked(signal) {
        removedIdsRef.current.add(signal.id);
        await apiRequest(`/signals/locked/${encodeURIComponent(signal.id)}`, { method: "DELETE" });
        locked.setItems((items) => items.filter((item) => item.id !== signal.id));
    }

    async function handleLock(signal) {
        // Lock mengikuti signalId begitu backend menerbitkannya; hasil analisis
        // per koin mengirim levelnya sendiri.
        const payload = await lockSignalPlan({ signalId: signal.signalId ?? null }, signal);
        const item = payload?.signal;
        if (!item) return;
        locked.setItems((items) => [item, ...items.filter((existing) => existing.id !== item.id)]);
        setHighlightId(item.id);
        showToast("success", `${pairLabel(item)} · ${String(item.bias).toUpperCase()} dikunci. Harga snapshot $${formatPrice(item.currentPrice ?? item.entry)}.`, {
            action: {
                label: "Batalkan",
                onClick: () => deleteLocked(item).catch((undoError) => {
                    removedIdsRef.current.delete(item.id);
                    showToast("error", undoError?.message || "Lock gagal dibatalkan. Hapus lewat menu sinyal.");
                }),
            },
            autoDismissMs: UNDO_LOCK_MS,
        });
    }

    async function handleDeleteItem(signal) {
        const pair = pairLabel(signal);
        // Hapus permanen di server, jadi dikonfirmasi lewat dialog bawaan browser.
        if (!window.confirm(`Hapus ${pair} dari pantauan? Pemantauan harga untuk rencana ini berhenti.`)) return;
        try {
            await deleteLocked(signal);
            showToast("success", `${pair} dihapus dari pantauan.`);
        } catch (deleteError) {
            removedIdsRef.current.delete(signal.id);
            showToast("error", deleteError?.message || `${pair} gagal dihapus. Coba lagi.`);
        }
    }

    async function handleCopyItem(signal) {
        try {
            await navigator.clipboard.writeText(formatLockedLevels(signal));
            showToast("success", `Level ${pairLabel(signal)} disalin.`);
        } catch {
            showToast("error", "Clipboard tidak bisa diakses browser ini.");
        }
    }

    return (
        <DashboardShell>
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:pt-7">
                <DashboardIntro
                    session={session}
                    signals={dashboard?.signals}
                    onSelectTicker={(base) => openModal(base)}
                />

                {/* Ticker gagal dimuat tidak menghalangi analisis; pesannya tetap ditulis. */}
                {error && !dashboard && (
                    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-chakra text-sm text-red-200">
                        <span>Data ticker gagal dimuat: {error}</span>
                        <button type="button" onClick={market.retry} className="font-bold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300">
                            Coba lagi
                        </button>
                    </div>
                )}
                {dataHealth.text && (
                    <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 font-chakra text-sm text-amber-200">
                        {dataHealth.text}
                    </p>
                )}

                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div id="analysis-panel" className="min-w-0 scroll-mt-6">
                        <AnalysisPanel
                            tabs={analysis.tabs}
                            activeTab={analysis.activeTab}
                            lockedKeys={lockedKeys}
                            onSelect={analysis.select}
                            onRemove={analysis.remove}
                            onCancel={analysis.cancel}
                            onRetry={(tab) => analysis.analyze(tab.symbol, tab.timeframe)}
                            onReanalyze={(tab) => analysis.analyze(tab.symbol, tab.timeframe, { reanalyze: true })}
                            onOpenModal={openModal}
                            onLock={handleLock}
                            onOpenDetail={setDetailSignal}
                        />
                    </div>
                    <LockedSignalsPanel
                        items={locked.items}
                        meta={locked.meta}
                        loading={locked.loading}
                        error={locked.error}
                        highlightId={highlightId}
                        onRetry={locked.retry}
                        onOpenItem={openLockedItem}
                        onCopyItem={handleCopyItem}
                        onDeleteItem={handleDeleteItem}
                    />
                </div>

                {locked.items.length > 0 && (
                    <LockedSignalList
                        lockedSignals={locked.items}
                        loading={locked.loading}
                        error={locked.error}
                        refreshing={locked.refreshing}
                        onRefresh={locked.refresh}
                        onRetry={locked.retry}
                        onDeleted={(id) => {
                            removedIdsRef.current.add(id);
                            locked.setItems((items) => items.filter((item) => item.id !== id));
                        }}
                    />
                )}

                <ScamPumpSection onToast={showToast} />
            </div>

            <DashboardToast toasts={toasts} onDismiss={dismissToast} />
            {modal && (
                <AnalyzeCoinModal
                    initialQuery={modal.query}
                    defaultTimeframe={modal.timeframe}
                    onClose={() => setModal(null)}
                    onSubmit={handleAnalyzeSubmit}
                />
            )}
            {detailSignal && <SignalDetailSideout signal={detailSignal} onClose={() => setDetailSignal(null)} />}
        </DashboardShell>
    );
}
