"use client";

import { useEffect, useMemo, useState } from "react";
import { lockSignalAction } from "@/app/actions/lock-signal";

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

function formatVolume(value) {
    const number = Number(value || 0);
    if (number >= 1_000_000_000) return `$${(number / 1_000_000_000).toFixed(1)}B`;
    if (number >= 1_000_000) return `$${(number / 1_000_000).toFixed(1)}M`;
    if (number >= 1_000) return `$${(number / 1_000).toFixed(1)}K`;
    return `$${number.toFixed(0)}`;
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

function formatSignedPercent(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}%`;
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
        <div className={`flex min-h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md bg-[#374151]/90 px-2 py-1 sm:min-h-12 sm:rounded-lg sm:px-3 ${wide ? "col-span-2" : ""}`}>
            <p style={FIGMA_TEXT.textXsBoldWhite}>{label}</p>
            <p className={`max-w-full truncate ${tone}`} style={{ ...FIGMA_TEXT.textXsBoldWhite, fontSize: "clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem)" }}>
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

function MobileSignalLevel({ label, value }) {
    return (
        <div className="min-w-0 rounded-md border border-white/[0.06] bg-black/15 px-2.5 py-2">
            <p className="truncate uppercase text-zinc-400" style={{ ...FIGMA_TEXT.textXsBoldWhite, fontSize: 10 }}>
                {label}
            </p>
            <p className="mt-0.5 truncate text-white" style={{ ...FIGMA_TEXT.textXsBoldWhite, fontSize: 12 }}>
                {value}
            </p>
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
            <div className="flex flex-col gap-2 sm:gap-3">
                <div className="h-1.5 w-full rounded-[5px] bg-[#334155] sm:h-2.5" />
                <div className="grid grid-cols-2 gap-2 text-white sm:grid-cols-4 sm:gap-4">
                    <MobileSignalLevel label="SL" value={formatPriceLabel(signal.sl)} />
                    <MobileSignalLevel label="Entry" value={formatPriceLabel(signal.entry)} />
                    <MobileSignalLevel label="TP1" value={formatPriceLabel(signal.tp1)} />
                    <MobileSignalLevel label="TP2" value={formatPriceLabel(signal.tp2 || signal.tp)} />
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
    const isProfit = signal.bias === "short"
        ? Number(signal.price) <= Number(signal.entry)
        : Number(signal.price) >= Number(signal.entry);
    const fillColor = isProfit ? "#8aef5a" : "#f87171";
    const labelAlign = (percent) => {
        if (percent <= 8) return "left";
        if (percent >= 92) return "right";
        return "center";
    };

    return (
        <div className="relative sm:h-[62px]">
            <div
                className="group relative h-4 w-full sm:h-5"
                aria-label={`${signal.base} progress from stop loss to targets. Current price ${formatPriceLabel(signal.price)}.`}
            >
                <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-[5px] bg-[#334155] sm:h-2.5" />
                <div
                    className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-[5px] transition-all sm:h-2.5"
                    style={{ left: `${fillLeft}%`, width: `${fillWidth}%`, backgroundColor: fillColor }}
                />
                {levels.map((level) => {
                    const percent = getRangePercent(level.value, min, max);
                    const isEntry = level.key === "entry";

                    return (
                        <span
                            key={level.key}
                            className={`absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#111827] sm:size-3 ${isEntry ? "bg-white" : "bg-[#8aef5a]"}`}
                            style={{ left: `${percent}%` }}
                            title={`${level.label}: ${formatPriceLabel(level.value)}`}
                        />
                    );
                })}
                <span
                    className="absolute top-1/2 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#B7FB5B] shadow-[0_0_0_4px_rgba(183,251,91,0.14)] transition-transform group-hover:scale-110 sm:size-4 sm:shadow-[0_0_0_6px_rgba(183,251,91,0.16)]"
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

            <div className="mt-2 grid grid-cols-2 gap-2 text-white sm:hidden">
                {levels.map((level) => (
                    <MobileSignalLevel key={level.key} label={level.label} value={formatPriceLabel(level.value)} />
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

function SignalHiddenInputs({ signal }) {
    const fields = {
        symbol: signal.symbol,
        base: signal.base,
        timeframe: signal.timeframe || "15m",
        bias: signal.bias || "neutral",
        source: signal.source || "",
        marketType: signal.marketType || "CEX",
        entry: signal.entry,
        price: signal.price,
        sl: signal.sl,
        tp1: signal.tp1,
        tp2: signal.tp2 || signal.tp,
        rsi: signal.rsi,
        emaFast: signal.emaFast,
        emaSlow: signal.emaSlow,
        fastPeriod: signal.fastPeriod,
        slowPeriod: signal.slowPeriod,
        stochK: signal.stochK,
        stochD: signal.stochD,
        riskPercent: signal.riskPercent,
        rewardPercent: signal.rewardPercent,
        riskReward: signal.riskReward,
        sinceEntryPercent: signal.sinceEntryPercent,
        progressPercent: signal.progressPercent,
    };

    return Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value ?? ""} />
    ));
}

function ReanalyzeButton({ signal, selectedSymbol, cooldownRemaining, onReanalyze }) {
    const isSelected = selectedSymbol === signal.symbol;
    const isCooldown = cooldownRemaining > 0;
    const isBusy = Boolean(selectedSymbol) || isCooldown;

    return (
        <button
            type="button"
            disabled={isBusy}
            aria-busy={isSelected || isCooldown}
            onClick={() => onReanalyze(signal)}
            className="relative flex min-h-10 w-full items-center justify-center overflow-hidden rounded-md border-2 border-white/10 bg-[#B7FB5B] px-2 py-1.5 shadow-[0_1px_2px_rgba(10,13,18,0.05),inset_0_-2px_0_rgba(10,13,18,0.05),inset_0_0_0_1px_rgba(10,13,18,0.18)] transition hover:bg-[#a8ec4c] disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-11 sm:rounded-lg sm:px-3 sm:py-2"
        >
            {isSelected ? (
                <span className="flex min-w-0 items-center gap-1.5 text-black sm:gap-2" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#000000", fontSize: "clamp(0.6875rem, 0.65rem + 0.2vw, 0.875rem)" }}>
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current/25 border-t-current motion-safe:animate-spin sm:h-4 sm:w-4" />
                    Loading...
                </span>
            ) : isCooldown ? (
                <span className="truncate text-black" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#000000", fontSize: "clamp(0.6875rem, 0.65rem + 0.2vw, 0.875rem)" }}>
                    Coba lagi {cooldownRemaining}s
                </span>
            ) : (
                <span className="truncate text-black" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#000000", fontSize: "clamp(0.6875rem, 0.65rem + 0.2vw, 0.875rem)" }}>
                    Re-analyze
                </span>
            )}
        </button>
    );
}

function TrashIcon() {
    return (
        <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="m19 6-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
        </svg>
    );
}

function SignalCard({ signal, selectedSymbol, cooldownRemaining, error, onReanalyze, onDelete }) {
    const styles = biasStyles(signal.bias);
    const isDex = signal.marketType === "DEX" || !signal.indicatorAvailable;
    const riskPercent = Number(signal.riskPercent || 0);
    const rewardPercent = Number(signal.rewardPercent || 0);
    const rrLabel = signal.riskReward ? `1:${Number(signal.riskReward).toFixed(1)}` : "-";
    const sinceEntry = Number(signal.sinceEntryPercent ?? signal.change ?? 0);
    const sinceEntryTone = sinceEntry >= 0 ? "text-[#a3e635]" : "text-[#f87171]";

    return (
        <article className="group @container relative overflow-hidden rounded-lg bg-gradient-to-br from-[#374151] to-[#111827] p-3.5 shadow-[0_1px_2px_rgba(10,13,18,0.05)] sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%)]" />
            <button
                type="button"
                onClick={() => onDelete?.(signal)}
                className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-md border border-white/10 bg-black/15 text-red-200/70 transition hover:border-red-300/40 hover:bg-red-500/15 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-300/40 sm:right-4 sm:top-4 sm:size-10 sm:rounded-lg sm:border-red-400/25 sm:bg-red-500/15 sm:text-red-200 sm:opacity-0 sm:shadow-lg sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                aria-label={`Hapus signal ${signal.base || signal.symbol} dari Signal Board`}
                title="Hapus signal"
            >
                <TrashIcon />
            </button>

            <div className="relative flex flex-col gap-3 sm:gap-4">
                <div className="flex w-full flex-col gap-3 sm:gap-4 @lg:flex-row @lg:items-center">
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 pr-9 sm:gap-2 sm:pr-0">
                        <span className={`rounded-md px-2 py-0.5 uppercase sm:py-[3px] ${styles.badge}`} style={{ ...FIGMA_TEXT.textXsBoldWhite, fontSize: "clamp(0.625rem, 0.6rem + 0.125vw, 0.75rem)" }}>
                            {styles.label}
                        </span>
                        <p className="min-w-full truncate" style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700, lineHeight: "20px" }}>
                            {signal.base}/{isDex ? "USD" : "USDT"}
                        </p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4">
                            <p className="truncate" style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700, lineHeight: "20px" }}>{formatPriceLabel(signal.price)}</p>
                            <p className={sinceEntryTone} style={FIGMA_TEXT.textXsMedium}>
                                {formatSignedPercent(sinceEntry)} Since Entry From Signal
                            </p>
                        </div>
                        <p className="hidden max-w-[48ch] text-[#f8fafc] sm:block" style={FIGMA_TEXT.textSmMedium}>
                            {isDex
                                ? "DEX token hanya menampilkan price, liquidity, dan volume karena data indikator belum tersedia."
                                : `Current masih dekat entry. Risk ke SL ${riskPercent.toFixed(2)}%, reward ke TP2 ${rewardPercent.toFixed(2)}%.`}
                        </p>
                    </div>

                    <div className="grid w-full shrink-0 grid-cols-2 gap-1.5 whitespace-nowrap sm:gap-2 @lg:w-[min(42%,180px)]">
                        <IndicatorPill label="RSI" value={signal.rsi ? Math.round(signal.rsi) : "-"} tone={styles.metric} />
                        <IndicatorPill label="R:R" value={rrLabel} tone="text-[#a3e635]" />
                        <IndicatorPill label={`EMA${signal.fastPeriod || 21}`} value={formatPriceLabel(signal.emaFast)} tone="text-[#f8fafc]" />
                        <IndicatorPill label={`EMA${signal.slowPeriod || 50}`} value={formatPriceLabel(signal.emaSlow)} tone="text-[#f8fafc]" />
                        <IndicatorPill
                            label="STOCH RSI"
                            value={signal.stochK ? Number(signal.stochK).toFixed(1) : "-"}
                            tone={signal.stochK > signal.stochD ? "text-[#a3e635]" : "text-[#f87171]"}
                            wide
                        />
                    </div>
                </div>

                <SignalProgress signal={signal} />

                {isDex && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">DEX Data Only</p>
                        <p className="mt-1 text-sm text-zinc-300">
                            Liquidity {formatUsd(signal.liquidityUsd)} · Volume {formatVolume(signal.volume24h)}
                        </p>
                    </div>
                )}

                {error && (
                    <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 font-chakra text-xs text-red-200">
                        {error}
                    </p>
                )}

                <div className="grid w-full grid-cols-3 gap-2 sm:gap-4">
                    <form action={lockSignalAction} className="min-w-0 flex-1">
                        <SignalHiddenInputs signal={signal} />
                        <button
                            type="submit"
                            className="relative flex min-h-10 w-full items-center justify-center overflow-hidden rounded-md border-2 border-white/10 bg-[#B7FB5B] px-2 py-1.5 shadow-[0_1px_2px_rgba(10,13,18,0.05),inset_0_-2px_0_rgba(10,13,18,0.05),inset_0_0_0_1px_rgba(10,13,18,0.18)] transition hover:bg-[#a8ec4c] sm:min-h-11 sm:rounded-lg sm:px-3 sm:py-2"
                        >
                            <span className="truncate text-black" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#000000", fontSize: "clamp(0.6875rem, 0.65rem + 0.2vw, 0.875rem)" }}>Lock Signal</span>
                        </button>
                    </form>
                    <div className="min-w-0 flex-1">
                        <ReanalyzeButton
                            signal={signal}
                            selectedSymbol={selectedSymbol}
                            cooldownRemaining={cooldownRemaining}
                            onReanalyze={onReanalyze}
                        />
                    </div>
                    <a
                        href="#lock-signal-list"
                        className="relative flex min-h-10 min-w-0 items-center justify-center overflow-hidden rounded-md border border-[#d5d7da] bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(10,13,18,0.05),inset_0_-2px_0_rgba(10,13,18,0.05),inset_0_0_0_1px_rgba(10,13,18,0.18)] transition hover:bg-zinc-100 sm:min-h-11 sm:rounded-lg sm:px-3 sm:py-2"
                    >
                        <span className="truncate" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#414651", fontSize: "clamp(0.6875rem, 0.65rem + 0.2vw, 0.875rem)" }}>Check Detail</span>
                    </a>
                </div>
            </div>
        </article>
    );
}

function normalizeSearchKeyword(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getNumericValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function getDistanceToLevel(signal, mode) {
    const price = getNumericValue(signal.price);
    if (price === null) return Number.POSITIVE_INFINITY;

    const levelValues = {
        "near-target": [signal.tp1, signal.tp2 || signal.tp],
        "near-sl": [signal.sl],
        "near-entry": [signal.entry],
    }[mode] || [];

    const distances = levelValues
        .map((value) => getNumericValue(value))
        .filter((value) => value !== null)
        .map((value) => Math.abs(price - value) / Math.max(Math.abs(price), 1));

    return distances.length > 0
        ? Math.min(...distances)
        : Number.POSITIVE_INFINITY;
}

function applySignalFilter(signals, filterMode) {
    if (filterMode === "bias-short") {
        return signals.filter((signal) => signal.bias === "short");
    }

    if (filterMode === "bias-long") {
        return signals.filter((signal) => signal.bias === "long");
    }

    if (filterMode === "bias-neutral") {
        return signals.filter((signal) => signal.bias === "neutral");
    }

    if (["near-target", "near-sl", "near-entry"].includes(filterMode)) {
        return signals
            .map((signal, index) => ({
                signal,
                index,
                distance: getDistanceToLevel(signal, filterMode),
            }))
            .sort((a, b) => {
                if (a.distance !== b.distance) return a.distance - b.distance;
                return a.index - b.index;
            })
            .map((item) => item.signal);
    }

    return signals;
}

function EmptySignalState({ searchKeyword, filterMode }) {
    const hasActiveFilter = filterMode && filterMode !== "all";

    return (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 p-4 font-chakra text-sm text-zinc-500 sm:p-6">
            {searchKeyword
                ? `Tidak ada signal yang cocok dengan "${searchKeyword}". Coba gunakan symbol coin seperti BTC, ETH, SOL, atau PEPE.`
                : hasActiveFilter
                    ? "Tidak ada signal yang cocok dengan filter ini. Reset filter untuk melihat semua signal."
                : "Belum ada signal yang bisa ditampilkan."}
        </div>
    );
}

export default function DashboardSignalBoard({ signals, searchKeyword = "", filterMode = "all", onSignalUpdate, onSignalDelete, onToast }) {
    const [selectedSymbol, setSelectedSymbol] = useState("");
    const [errors, setErrors] = useState({});
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [now, setNow] = useState(Date.now());
    const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
    const normalizedKeyword = normalizeSearchKeyword(searchKeyword);
    const visibleSignals = useMemo(() => {
        const keywordFilteredSignals = normalizedKeyword
            ? signals.filter((signal) => {
            const symbol = normalizeSearchKeyword(signal.symbol);
            const base = normalizeSearchKeyword(signal.base);

            return symbol.includes(normalizedKeyword) || base.includes(normalizedKeyword);
        })
            : signals;

        return applySignalFilter(keywordFilteredSignals, filterMode);
    }, [filterMode, normalizedKeyword, signals]);

    useEffect(() => {
        if (cooldownUntil <= Date.now()) return undefined;

        const timer = window.setInterval(() => {
            const nextNow = Date.now();
            setNow(nextNow);

            if (cooldownUntil <= nextNow) {
                window.clearInterval(timer);
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [cooldownUntil]);

    async function handleReanalyze(signal) {
        const activeSymbol = signal.symbol;
        const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

        if (remaining > 0) {
            setNow(Date.now());
            return;
        }

        setSelectedSymbol(activeSymbol);
        setErrors((current) => ({ ...current, [activeSymbol]: "" }));

        try {
            const searchParams = new URLSearchParams({
                symbol: activeSymbol,
                timeframe: signal.timeframe || "15m",
            });
            const response = await fetch(`/api/market-signal?${searchParams.toString()}`, {
                cache: "no-store",
            });
            const payload = await response.json();

            if (!response.ok) {
                if (response.status === 429 && payload.retryAfter) {
                    const nextCooldownUntil = Date.now() + Number(payload.retryAfter) * 1000;
                    setCooldownUntil((currentUntil) => Math.max(currentUntil, nextCooldownUntil));
                    setNow(Date.now());
                }

                if (response.status === 429) return;

                throw new Error(payload.error || "Re-analyze gagal.");
            }

            onSignalUpdate(payload.signal, payload.updatedAt);
            onToast?.("success", `${payload.signal.base} berhasil di-re-analyze.`);
        } catch (error) {
            const message = error.message || "Re-analyze gagal.";
            setErrors((current) => ({
                ...current,
                [activeSymbol]: message,
            }));
            onToast?.("error", message);
        } finally {
            setSelectedSymbol("");
        }
    }

    if (visibleSignals.length === 0) {
        return <EmptySignalState searchKeyword={searchKeyword} filterMode={filterMode} />;
    }

    return visibleSignals.map((signal) => (
        <SignalCard
            key={signal.symbol}
            signal={signal}
            selectedSymbol={selectedSymbol}
            cooldownRemaining={cooldownRemaining}
            error={errors[signal.symbol]}
            onReanalyze={handleReanalyze}
            onDelete={onSignalDelete}
        />
    ));
}
