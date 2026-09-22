"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import DashboardSignalWorkspace from "./DashboardSignalWorkspace";
import { buildPartialTpPlan } from "@/lib/market/partial-tp";
import { apiRequest } from "@/lib/api/client";
import { useAdminSummary, useLockedSignals, useMarketDashboard } from "@/lib/market/dashboard";
import { describeDataHealth, describePendingTimeframe, formatTimeframeLabel } from "@/lib/market/dashboard-core";
import { describeStatus } from "@/lib/signals/lifecycle";
import { describeLockedMovement, resolveLockedLifecycleStatus } from "@/lib/signals/locked";
import { useAuth } from "@/components/auth/AuthProvider";

const FONT_NEBULICA = "Nebulica, sans-serif";
const FONT_CHAKRA = "var(--font-chakra-petch), Chakra Petch, sans-serif";
const FIGMA_TEXT = {
    text2xlBoldWhite: {
        fontFamily: FONT_NEBULICA,
        fontSize: "clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)",
        fontWeight: 700,
        lineHeight: "32px",
        letterSpacing: 0,
        color: "#FFFFFF",
    },
    textBaseRegularWhite: {
        fontFamily: FONT_CHAKRA,
        fontSize: "clamp(0.875rem, 0.825rem + 0.25vw, 1rem)",
        fontWeight: 400,
        lineHeight: "24px",
        letterSpacing: 0,
        color: "#FFFFFF",
    },
    textBaseMediumWhite: {
        fontFamily: FONT_CHAKRA,
        fontSize: "clamp(0.875rem, 0.825rem + 0.25vw, 1rem)",
        fontWeight: 500,
        lineHeight: "24px",
        letterSpacing: 0,
        color: "#FFFFFF",
    },
    textSmBoldWhite: {
        fontFamily: FONT_CHAKRA,
        fontSize: "clamp(0.8125rem, 0.7875rem + 0.125vw, 0.875rem)",
        fontWeight: 700,
        lineHeight: "20px",
        letterSpacing: 0,
        color: "#FFFFFF",
    },
    textSmMedium: {
        fontFamily: FONT_CHAKRA,
        fontSize: "clamp(0.8125rem, 0.7875rem + 0.125vw, 0.875rem)",
        fontWeight: 500,
        lineHeight: "20px",
        letterSpacing: 0,
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

function getSignalChange(signals, symbol) {
    const signal = signals.find((item) => item.symbol === symbol);
    const change = Number(signal?.change);
    return Number.isFinite(change) ? change : null;
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
                    className="absolute top-1/2 z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#B7FB5B] shadow-[0_0_0_6px_rgba(183,251,91,0.16)] transition-transform group-hover:scale-110"
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
        <section id="lock-signal-list" className="mt-6 scroll-mt-28 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
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
                            className="grid size-9 place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100 active:scale-95 disabled:opacity-50"
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

function DashboardIntro({ session, pendingCount }) {
    return (
        <section className="w-full rounded-xl bg-gradient-to-b from-[#222129] to-[#100f15] p-4 text-white sm:p-5 lg:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                    <h1 style={FIGMA_TEXT.text2xlBoldWhite}>Dashboard</h1>
                    <p className="mt-[7px]" style={FIGMA_TEXT.textBaseRegularWhite}>
                        Selamat datang, {session.user.name || session.user.email}. Dashboard ini hanya alat bantu, jadi tetap lakukan riset sendiri atas semua informasi di sini.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                        href="/dashboard/signals/history"
                        className="min-h-11 rounded-md border border-zinc-700/60 bg-zinc-800/40 px-3 py-2 font-chakra text-xs font-bold text-zinc-300 transition hover:bg-zinc-700/40 hover:text-white"
                    >
                        Riwayat signal
                    </Link>
                    {session.user.role === "ADMIN" && (
                        <Link
                            href="/dashboard/admin/users"
                            className="min-h-11 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 font-chakra text-xs font-bold text-blue-300 transition hover:bg-blue-500/20"
                        >
                            Review user ({pendingCount})
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}

function CoinBadge({ coin }) {
    const isBitcoin = coin === "BTC";
    const iconSrc = isBitcoin ? "/bitcoin-btc-logo.svg" : "/ethereum-eth-logo.svg";

    return (
        <div className={`grid size-9 shrink-0 place-items-center rounded-full ${isBitcoin ? "bg-[#fff9e9]" : "bg-[#d0cbff]"}`}>
            <Image
                src={iconSrc}
                alt=""
                width={isBitcoin ? 20 : 11}
                height={isBitcoin ? 20 : 16}
                className="object-contain"
            />
        </div>
    );
}

function CoinSummaryCard({ coin, name, value, change24h }) {
    const hasChange = change24h !== null && change24h !== undefined && Number.isFinite(Number(change24h));
    const change = Number(change24h || 0);
    const isPositive = change >= 0;

    return (
        <article
            className="relative min-h-[112px] min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#B7FB5B] via-[#45444a] to-[#B7FB5B] p-px"
            style={{ boxSizing: "border-box" }}
        >
            <div className="flex h-full flex-col justify-between rounded-[11px] bg-gradient-to-b from-[#222129] to-[#100f15] p-4">
                <div className="flex items-center gap-3">
                    <CoinBadge coin={coin} />
                    <div className="min-w-0 flex-1">
                        <p style={FIGMA_TEXT.textSmBoldWhite}>{coin}</p>
                        <p style={{ ...FIGMA_TEXT.textXsMedium, color: "#A1A1AA" }}>{name}</p>
                    </div>
                    {hasChange && (
                        <div className={`shrink-0 rounded-md border px-2 py-1 ${isPositive
                            ? "border-[#B7FB5B]/25 bg-[#B7FB5B]/10 text-[#B7FB5B]"
                            : "border-[#f87171]/25 bg-[#f87171]/10 text-[#f87171]"
                            }`}>
                            <p className="whitespace-nowrap" style={{ ...FIGMA_TEXT.textXsBoldWhite, color: "currentColor" }}>
                                {isPositive ? "↗" : "↘"} {formatSignedPercent(change)}
                            </p>
                            <p className="text-right uppercase tracking-[0.16em]" style={{ ...FIGMA_TEXT.textXsMedium, color: "currentColor", fontSize: 10 }}>
                                24H
                            </p>
                        </div>
                    )}
                </div>
                <p style={FIGMA_TEXT.text2xlBoldWhite}>{value}</p>
            </div>
        </article>
    );
}

function MiniMetricCard({ label, value, tone, meta }) {
    return (
        <div className="flex min-h-[54px] min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl bg-gradient-to-b from-[#222129] to-[#100f15] px-3 py-2">
            <p className="truncate" style={{ ...FIGMA_TEXT.textXsMedium, color: "#FFFFFF" }}>{label}</p>
            <p className={tone} style={FIGMA_TEXT.textXsMedium}>{value}</p>
            {meta && (
                <p className="truncate font-chakra text-[10px] font-bold uppercase leading-3 text-zinc-400">{meta}</p>
            )}
        </div>
    );
}

function TimeframeMenu({ current, pendingTimeframe, onChange }) {
    const options = ["1m", "15m", "1h", "4h", "1d"];
    const detailsRef = useRef(null);
    // Kontrol lain tetap bisa dipakai selama refresh, jadi tidak ada `disabled`
    // di sini: user boleh berpindah lagi tanpa menunggu request yang lambat.
    const label = pendingTimeframe ? describePendingTimeframe(pendingTimeframe) : formatTimeframeLabel(current);

    function closeMenu({ focusSummary = false } = {}) {
        const details = detailsRef.current;
        if (!details?.open) return;

        details.open = false;
        if (focusSummary) details.querySelector("summary")?.focus();
    }

    function handleSelect(option) {
        onChange(option);
        closeMenu({ focusSummary: true });
    }

    return (
        <details
            ref={detailsRef}
            className="group relative z-50 shrink-0"
            onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                closeMenu({ focusSummary: true });
            }}
            onBlur={(event) => {
                if (event.currentTarget.contains(event.relatedTarget)) return;
                closeMenu();
            }}
        >
            <summary
                aria-busy={pendingTimeframe ? "true" : undefined}
                className="flex min-h-11 w-[92px] cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-[#36353d] bg-[#d9f99d] px-2 py-2.5 shadow-[0_1px_2px_rgba(20,21,26,0.05)] transition duration-300 ease-out marker:hidden hover:bg-[#cff789] active:scale-[0.98] group-open:rounded-b-none group-open:border-[#B7FB5B]/70 [&::-webkit-details-marker]:hidden aria-busy:w-[128px]"
            >
                <span className="min-w-[2.25rem] truncate text-center uppercase" style={{ ...FIGMA_TEXT.textXsMedium, color: "#16161e" }}>{label}</span>
                <svg
                    className="size-4 shrink-0 text-[#16161e] transition-transform duration-300 ease-out group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M5 8l5 5 5-5" />
                </svg>
            </summary>
            <div className="absolute right-0 top-full z-50 flex w-[92px] origin-top flex-col overflow-hidden rounded-b-md border border-t-0 border-[#36353d] bg-[#17161c] opacity-0 shadow-xl transition duration-300 ease-out group-open:opacity-100 motion-safe:group-open:animate-[timeframe-menu_180ms_ease-out]">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => handleSelect(option)}
                        aria-current={option === current ? "true" : undefined}
                        className={`min-h-11 px-3 py-2 text-center uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#B7FB5B] ${option === current
                            ? "bg-[#d9f99d] text-[#16161e]"
                            : "text-[#949398] hover:bg-white/[0.04] hover:text-white"
                            }`}
                        style={FIGMA_TEXT.textXsMedium}
                    >
                        {option === pendingTimeframe ? describePendingTimeframe(option) : option}
                    </button>
                ))}
            </div>
        </details>
    );
}

function DashboardOverview({ marketDashboard, session, pendingCount, pendingTimeframe, onTimeframeChange }) {
    const usdtDominanceTrendRegime = marketDashboard.usdtDominanceTrend?.regime || "UNKNOWN";
    const regimeText = marketDashboard.usdtDominance.market
        ? marketDashboard.usdtDominance.market.toLowerCase().replace(/^market\s*/, "")
        : "neutral";
    const btcChange = getSignalChange(marketDashboard.signals, "BTCUSDT");
    const ethChange = getSignalChange(marketDashboard.signals, "ETHUSDT");

    return (
        <div className="flex flex-col items-stretch gap-4">
            <DashboardIntro session={session} pendingCount={pendingCount} />

            <section className="relative z-10 grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] items-stretch gap-4 overflow-visible">
                <CoinSummaryCard coin="BTC" name="Bitcoin" value={formatUsd(marketDashboard.tickers.btc, 0)} change24h={btcChange} />
                <CoinSummaryCard coin="ETH" name="Ethereum" value={formatUsd(marketDashboard.tickers.eth, 0)} change24h={ethChange} />

                <div
                    className="grid min-h-[112px] min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:col-span-2 xl:col-span-1"
                    style={{ boxSizing: "border-box" }}
                >
                    <div className="contents">
                        <MiniMetricCard
                            label="USDT.D"
                            value={`${marketDashboard.usdtDominance.value.toFixed(2)}%`}
                            tone="text-[#bef264]"
                            meta={usdtDominanceTrendRegime}
                        />
                        <MiniMetricCard label="LONG" value={marketDashboard.stats.long} tone="text-[#6ee7b7]" />
                        <MiniMetricCard label="NEUTRAL" value={marketDashboard.stats.neutral} tone="text-[#38bdf8]" />
                        <MiniMetricCard label="SHORT" value={marketDashboard.stats.short} tone="text-[#fca5a5]" />
                    </div>
                </div>

                <article
                    className="relative flex min-h-[112px] min-w-0 items-center overflow-visible rounded-xl bg-gradient-to-b from-[#222129] to-[#100f15] px-4 py-4 sm:px-6 md:col-span-2"
                    style={{ boxSizing: "border-box" }}
                >
                    <div className="flex w-full flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-center">
                        <div className="min-w-0 flex-1 text-white">
                            <p style={FIGMA_TEXT.textBaseMediumWhite}>Market regime</p>
                            <h2 className="mt-[7px] text-balance" style={FIGMA_TEXT.text2xlBoldWhite}>
                                Market masih {regimeText}
                            </h2>
                        </div>
                        <TimeframeMenu
                            current={marketDashboard.timeframe}
                            pendingTimeframe={pendingTimeframe}
                            onChange={onTimeframeChange}
                        />
                    </div>
                </article>
            </section>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const isSignedIn = Boolean(user);
    const market = useMarketDashboard({ enabled: isSignedIn });
    const locked = useLockedSignals({ enabled: isSignedIn });
    const admin = useAdminSummary({ enabled: isSignedIn && user?.role === "ADMIN" });

    const { dashboard, pendingTimeframe, displayedTimeframe, initialLoading, refreshing, error } = market;
    const dataHealth = describeDataHealth(dashboard?.meta);
    const session = { user: user || {} };

    return (
        <DashboardShell>
            <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                {initialLoading && !dashboard && (
                    <div className="grid min-h-[50vh] place-items-center font-chakra text-sm text-zinc-400">Memuat data market…</div>
                )}

                {/* Kegagalan memperbarui tidak menghapus board. Pesannya menyebut
                    timeframe yang diminta dan yang masih ditampilkan. */}
                {error && (
                    <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 font-chakra text-sm text-red-200">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={market.retry}
                            className="min-h-11 rounded-md border border-red-400/40 px-3 font-bold text-red-100 underline transition hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                        >
                            Coba lagi
                        </button>
                    </div>
                )}

                {dashboard && (
                    <div aria-busy={refreshing ? "true" : "false"}>
                        {/* Status data ditulis sebagai teks, bukan hanya warna. */}
                        {dataHealth.text && (
                            <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 font-chakra text-sm text-amber-200">
                                {dataHealth.text}
                            </p>
                        )}

                        <DashboardOverview
                            marketDashboard={dashboard}
                            session={session}
                            pendingCount={admin.pendingCount}
                            pendingTimeframe={pendingTimeframe}
                            onTimeframeChange={market.selectTimeframe}
                        />

                        <LockedSignalList
                            lockedSignals={locked.items}
                            loading={locked.loading}
                            error={locked.error}
                            refreshing={locked.refreshing}
                            onRefresh={locked.refresh}
                            onRetry={locked.retry}
                            onDeleted={(id) => locked.setItems((items) => items.filter((item) => item.id !== id))}
                        />

                        {/* Tanpa `key` timeframe: workspace menerima data baru lewat
                            props dan menyimpan state yang tidak terkait timeframe. */}
                        <DashboardSignalWorkspace
                            initialSignals={dashboard.signals}
                            initialSearchKeyword={market.symbol}
                            timeframe={displayedTimeframe}
                            updatedAt={dashboard.updatedAt}
                            lockedSignalPlanIds={locked.items.map((signal) => signal.signalPlanId).filter(Boolean)}
                            onLocked={(lockedSignal) => locked.setItems((items) => [
                                lockedSignal,
                                ...items.filter((item) => item.id !== lockedSignal.id),
                            ])}
                        />
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
