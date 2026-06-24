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

function formatTimeAgo(timestamp) {
    if (!timestamp) return null;
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m Ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h Ago`;
    return `${Math.floor(diff / 86_400_000)}d Ago`;
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

function entryZoneStatusStyle(status) {
    const map = {
        "valid":     { label: "Entry Zone Valid",  className: "border-[#8AEF5A]/30 bg-[#8AEF5A]/10 text-[#B7FB5B]" },
        "near-edge": { label: "Hampir Expired",    className: "border-yellow-400/30 bg-yellow-500/10 text-yellow-300" },
        "expired":   { label: "Setup Terlewat",    className: "border-zinc-600/30 bg-zinc-700/20 text-zinc-400" },
        "missed":    { label: "Setup Tidak Valid", className: "border-red-400/30 bg-red-500/10 text-red-300" },
        "invalid":   { label: "Zone Invalid",      className: "border-zinc-600/30 bg-zinc-700/20 text-zinc-500" },
    };
    return map[status] ?? map["invalid"];
}

function formatSignedPercent(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}%`;
}

function formatPriceLabel(value) {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? "-" : formatUsd(value);
}

function formatDetailTimeframe(value) {
    return String(value || "15m").toUpperCase();
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

// Terjemahan Indonesia untuk slSource / tp1Source / tp2Source.
const LEVEL_SOURCE_LABELS = {
    guardHVN: "HVN support",
    supportHVN: "HVN support",
    resistanceHVN: "HVN resistance",
    support: "Support",
    resistance: "Resistance",
    val: "Value Area Low",
    vah: "Value Area High",
    poc: "POC",
    nextResistance: "Resistance berikutnya",
    nextSupport: "Support berikutnya",
    runwayLVN: "Runway LVN",
    "atr-fallback": "Estimasi ATR",
};

function levelSourceLabel(source) {
    return LEVEL_SOURCE_LABELS[source] || null;
}

function SignalLevel({ label, value, align = "left", sublabel = null }) {
    const alignClass = align === "right" ? "items-end text-right" : align === "center" ? "items-center text-center" : "items-start text-left";

    return (
        <div className={`flex min-w-0 flex-col gap-1 ${alignClass}`}>
            <p style={FIGMA_TEXT.textXsBoldWhite}>{label}</p>
            <p className="truncate" style={FIGMA_TEXT.textXsBoldWhite}>{value}</p>
            {sublabel && (
                <p className="w-full truncate font-chakra text-[10px] font-normal text-zinc-500">{sublabel}</p>
            )}
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

    // Merge labels that are within 5% of the range — they'd visually occupy the same point.
    const MERGE_PCT = 5;
    const sortedForGroups = [...levels]
        .map((l) => ({ ...l, pct: getRangePercent(l.value, min, max) }))
        .sort((a, b) => a.pct - b.pct);
    const labelGroups = [];
    for (const item of sortedForGroups) {
        const last = labelGroups[labelGroups.length - 1];
        if (last && item.pct - last.anchorPct < MERGE_PCT) {
            last.members.push(item);
        } else {
            labelGroups.push({ anchorPct: item.pct, members: [item] });
        }
    }

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

            {labelGroups.map((group) => {
                const { anchorPct, members } = group;
                const align = labelAlign(anchorPct);
                const edgeClass = align === "left" ? "translate-x-0" : align === "right" ? "-translate-x-full" : "-translate-x-1/2";
                const labelText = members.length > 1
                    ? members.map((m) => m.label).join(" · ")
                    : members[0].label;
                const displayValue = formatPriceLabel(members[0].value);

                return (
                    <div
                        key={members.map((m) => m.key).join("-")}
                        className={`absolute top-7 hidden w-[112px] sm:block ${edgeClass}`}
                        style={{ left: `${anchorPct}%` }}
                    >
                        <SignalLevel label={labelText} value={displayValue} align={align} />
                    </div>
                );
            })}
        </div>
    );
}

function EntryZoneCompact({ entryZone }) {
    if (!entryZone) return null;
    const style = entryZoneStatusStyle(entryZone.status);
    return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2">
            <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-chakra text-[10px] font-bold uppercase ${style.className}`}>
                {style.label}
            </span>
            <p className="truncate font-chakra text-xs text-zinc-400">
                {formatPriceLabel(entryZone.low)} – {formatPriceLabel(entryZone.high)}
            </p>
        </div>
    );
}

function PartialTpPlanCompact({ partialTpPlan }) {
    if (!partialTpPlan || !partialTpPlan.isValid) return null;
    return (
        <div className="rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2">
            <p className="font-chakra text-[10px] font-bold uppercase text-zinc-400">Partial TP Plan</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                {partialTpPlan.legs.map((leg) => (
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
            <p className="mt-1 font-chakra text-[10px] text-zinc-500">
                Setelah TP1 hit → SL ke {formatPriceLabel(partialTpPlan.breakevenSL)} (breakeven)
            </p>
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

function CloseIcon() {
    return (
        <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function ArrowUpMiniIcon() {
    return (
        <svg
            className="size-3"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M6 9.5V2.5M6 2.5 2.75 5.75M6 2.5l3.25 3.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ArrowDownMiniIcon() {
    return (
        <svg
            className="size-3"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M6 2.5v7M6 9.5 2.75 6.25M6 9.5l3.25-3.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

const GATE_DISPLAY_LABELS = {
    direction: "Arah Signal",
    entry_safety: "Entry Safety",
    risk: "Risk Management",
    market_context: "Market Context",
    adaptive_evidence: "Histori Setup",
};

function gateResultStyles(result) {
    if (result === "LONG_VALID") {
        return {
            container: "border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.05]",
            badge: "border-[#B7FB5B]/30 bg-[#B7FB5B]/15 text-[#B7FB5B]",
            pillPass: "border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.08] text-[#B7FB5B]/80",
            icon: "✓",
        };
    }
    if (result === "SHORT_VALID") {
        return {
            container: "border-red-400/20 bg-red-500/[0.05]",
            badge: "border-red-400/30 bg-red-500/15 text-red-300",
            pillPass: "border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.08] text-[#B7FB5B]/80",
            icon: "✓",
        };
    }
    return {
        container: "border-yellow-400/15 bg-yellow-500/[0.04]",
        badge: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
        pillPass: "border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.08] text-[#B7FB5B]/80",
        icon: "✗",
    };
}

function ConservativeModePanel({ gate }) {
    if (!gate) {
        return (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-black/10 py-5">
                <p className="font-chakra text-xs text-zinc-500">Re-analyze untuk melihat Conservative Mode.</p>
            </div>
        );
    }

    const styles = gateResultStyles(gate.result);
    const isReady = gate.result !== "NOT_READY";
    const topItems = isReady ? (gate.warnings ?? []).slice(0, 2) : (gate.reasons ?? []).slice(0, 2);
    const checklistGates = Object.keys(GATE_DISPLAY_LABELS).filter(
        (g) => (gate.passedGates ?? []).includes(g) || (gate.failedGates ?? []).includes(g)
    );

    return (
        <div className={`rounded-lg border p-3 sm:p-4 ${styles.container}`}>
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-chakra text-xs font-bold ${styles.badge}`}>
                    {styles.icon} {gate.statusLabel}
                </span>
                {gate.evidence?.sampleSize ? (
                    <span className="font-chakra text-[10px] text-zinc-500">
                        {gate.evidence.sampleSize} histori · {gate.evidence.queryType === "broad" ? "lintas symbol" : "symbol ini"}
                    </span>
                ) : !gate.evidenceActive && isReady ? (
                    <span className="font-chakra text-[10px] text-zinc-500">Belum cukup histori</span>
                ) : null}
            </div>

            {topItems.length > 0 ? (
                <ul className="mt-2.5 space-y-1">
                    {topItems.map((item, i) => (
                        <li key={i} className="font-chakra text-xs leading-4 text-zinc-300">— {item}</li>
                    ))}
                </ul>
            ) : isReady ? (
                <p className="mt-2 font-chakra text-xs text-zinc-400">Setup memenuhi checklist konservatif.</p>
            ) : null}

            {checklistGates.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {checklistGates.map((gateName) => {
                        const passed = (gate.passedGates ?? []).includes(gateName);
                        return (
                            <span
                                key={gateName}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-chakra text-[10px] font-bold ${
                                    passed
                                        ? styles.pillPass
                                        : "border-red-400/20 bg-red-500/[0.08] text-red-300/80"
                                }`}
                            >
                                {passed ? "✓" : "✗"} {GATE_DISPLAY_LABELS[gateName]}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function HeaderChangeBadge({ value }) {
    const number = Number(value || 0);
    const isPositive = number >= 0;

    return (
        <span
            className={`inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full border px-2 font-chakra text-xs font-bold ${isPositive
                ? "border-[#BBF7D0]/30 bg-[#8AEF5A]/15 text-[#B7FB5B]"
                : "border-red-300/30 bg-red-500/15 text-red-200"
                }`}
        >
            {isPositive ? <ArrowUpMiniIcon /> : <ArrowDownMiniIcon />}
            {formatSignedPercent(number)}
        </span>
    );
}

function parseTimeframeMs(tf) {
    const str = String(tf || "15m").toLowerCase();
    const num = parseInt(str, 10) || 1;
    if (str.endsWith("d")) return num * 86400 * 1000;
    if (str.endsWith("h")) return num * 3600 * 1000;
    if (str.endsWith("m")) return num * 60 * 1000;
    if (str.endsWith("s")) return num * 1000;
    return 15 * 60 * 1000;
}

function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    if (h > 0) return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
    return `${mm}:${ss}`;
}

function CandleCountdown({ timeframe }) {
    const tfMs = parseTimeframeMs(timeframe);
    const [remaining, setRemaining] = useState(() => {
        const now = Date.now();
        return Math.ceil(now / tfMs) * tfMs - now;
    });

    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            setRemaining(Math.ceil(now / tfMs) * tfMs - now);
        };
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [tfMs]);

    return <span>Close in {formatCountdown(remaining)}</span>;
}

function DetailBadge({ children, tone = "neutral" }) {
    const toneClass = {
        short: "border-red-400/20 bg-red-500/10 text-red-300",
        long: "border-[#8AEF5A]/25 bg-[#8AEF5A]/10 text-[#B7FB5B]",
        success: "border-[#8AEF5A]/25 bg-[#8AEF5A]/10 text-[#B7FB5B]",
        neutral: "border-sky-400/20 bg-sky-500/10 text-sky-300",
        warning: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
        late: "border-orange-400/20 bg-orange-500/10 text-orange-300",
    }[tone] || "border-white/10 bg-white/[0.04] text-zinc-300";

    return (
        <span className={`inline-flex min-h-7 items-center rounded-full border px-3 font-chakra text-xs font-bold uppercase ${toneClass}`}>
            {children}
        </span>
    );
}

function SignalDetailTopHeader({ signal, onClose }) {
    const pairQuote = signal.marketType === "DEX" || !signal.indicatorAvailable ? "USD" : "USDT";
    const change = Number(signal.sinceEntryPercent ?? signal.change ?? 0);
    const sourceLabel = String(signal.source || "BITUNIX").replace(/\s*perp$/i, "").toUpperCase();

    return (
        <div className="relative h-[236px] shrink-0 overflow-hidden bg-gradient-to-r from-[#535862] to-[#717680]">
            <div className="absolute inset-x-6 bottom-0 top-6 overflow-hidden rounded-t-xl bg-[#141618] p-6">
                <div
                    className="pointer-events-none absolute inset-0 bg-[length:100%_100%] bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/bg-topheader.svg')" }}
                    aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="min-w-0 max-w-[58%] flex-1 truncate font-chakra text-4xl font-bold leading-10 text-white">
                            {signal.base}/{pairQuote}
                        </h2>
                        <div className="flex shrink-0 items-center gap-2">
                            <p className="font-chakra text-2xl font-bold leading-8 text-white">{formatPriceLabel(signal.price)}</p>
                            <HeaderChangeBadge value={change} />
                        </div>
                    </div>

                    <div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-chakra text-lg font-bold leading-7 text-white">
                            <span>{formatDetailTimeframe(signal.timeframe)}</span>
                            <span>{sourceLabel}</span>
                            <CandleCountdown timeframe={signal.timeframe} />
                        </div>
                        {formatTimeAgo(signal.updatedAt) && (
                            <p className="mt-36 font-chakra text-xs font-medium leading-4 text-white">
                                <span>Updated Signal </span>
                                <span className="font-bold text-[#3CCB7F]">{formatTimeAgo(signal.updatedAt)}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={onClose}
                className="absolute right-6 top-6 z-20 grid size-10 place-items-center rounded-lg border border-white/10 bg-[#1b2030]/80 text-zinc-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#B7FB5B]/50"
                aria-label="Tutup detail signal"
            >
                <CloseIcon />
            </button>
        </div>
    );
}

function DetailSectionHeader({ children }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h3 className="font-chakra text-sm font-bold text-white">{children}</h3>
            <ChevronDownIcon />
        </div>
    );
}

function DecisionItem({ label, value }) {
    return (
        <div className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="truncate font-chakra text-xs text-zinc-400">{label}</p>
                <span className="grid size-4 shrink-0 place-items-center rounded-full border border-zinc-600 text-[10px] text-zinc-500">
                    ?
                </span>
            </div>
            <p className="mt-2 truncate font-chakra text-xs font-medium text-white">{value}</p>
        </div>
    );
}

function TradePlanRow({ label, title, description, isLast = false }) {
    return (
        <div className={`grid gap-3 py-4 sm:grid-cols-[64px_1fr] ${isLast ? "" : "border-b border-white/[0.08]"}`}>
            <p className="font-chakra text-sm font-bold text-white">{label}</p>
            <div className="min-w-0">
                <p className="font-chakra text-sm font-bold text-white">{title}</p>
                <p className="mt-1 font-chakra text-sm leading-5 text-zinc-300">{description}</p>
            </div>
        </div>
    );
}

function ConfluenceRow({ label, value }) {
    return (
        <div className="flex min-h-9 items-center justify-between gap-4 border-b border-white/[0.06] py-2 last:border-b-0">
            <p className="font-chakra text-sm font-bold text-white">{label}</p>
            <p className="max-w-[52%] text-right font-chakra text-sm text-zinc-300">{value}</p>
        </div>
    );
}

function SignalDetailMiniProgress({ signal }) {
    const rrLabel = signal.riskReward ? `1:${Number(signal.riskReward).toFixed(1)}` : "1:2.0";
    const liveRR = Number(signal.liveRR);
    const liveRRLabel = Number.isFinite(liveRR) ? `1:${liveRR.toFixed(1)}` : null;
    const riskLabel = Number(signal.riskPercent || 0) > 3 ? "Medium" : "Low";
    const progressPercent = clampPercent(Number(signal.progressPercent ?? 10));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-white/[0.04] p-3">
                    <p className="font-chakra text-xs text-zinc-400">R:R</p>
                    <p className="mt-1 font-chakra text-xs font-medium text-white">{rrLabel}</p>
                    {liveRRLabel && (
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-500">Live {liveRRLabel}</p>
                    )}
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                    <p className="font-chakra text-xs text-zinc-400">Risk</p>
                    <p className="mt-1 font-chakra text-xs font-medium text-white">{riskLabel}</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                    <p className="font-chakra text-xs text-zinc-400">Status</p>
                    <p className="mt-1 font-chakra text-xs font-medium text-white">Waiting Trigger</p>
                </div>
            </div>

            <div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#334155]">
                    <div
                        className="h-full rounded-full bg-[#8AEF5A]"
                        style={{ width: `${Math.max(8, progressPercent)}%` }}
                    />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SignalLevel label="SL" value={formatPriceLabel(signal.sl)} sublabel={levelSourceLabel(signal.slSource)} />
                    <SignalLevel label="Entry" value={formatPriceLabel(signal.entry)} />
                    <SignalLevel label="TP1" value={formatPriceLabel(signal.tp1)} sublabel={levelSourceLabel(signal.tp1Source)} />
                    <SignalLevel label="TP2" value={formatPriceLabel(signal.tp2 || signal.tp)} sublabel={levelSourceLabel(signal.tp2Source)} />
                </div>
            </div>
        </div>
    );
}

function VpvrDetailSection({ signal }) {
    const price = Number(signal.price);
    const hvn = Array.isArray(signal.volumeNodes?.hvn) ? signal.volumeNodes.hvn : [];
    const lvn = Array.isArray(signal.volumeNodes?.lvn) ? signal.volumeNodes.lvn : [];
    const nodeEntry = signal.nodeEntry || null;
    const confluenceStyle = {
        strong: { label: "Konfluensi kuat", color: "text-[#B7FB5B]" },
        moderate: { label: "Konfluensi sedang", color: "text-amber-300" },
        none: { label: "Tanpa konfluensi", color: "text-zinc-400" },
    }[nodeEntry?.confluence] || null;

    const [period, setPeriod] = useState("24h");
    const [vpvrData, setVpvrData] = useState(null);
    const [loadingVpvr, setLoadingVpvr] = useState(true);
    const [hoveredBin, setHoveredBin] = useState(null);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
            if (!cancelled) {
                setLoadingVpvr(true);
                setHoveredBin(null);
            }
        });
        fetch(`/api/vpvr?symbol=${signal.symbol}&period=${period}`)
            .then((r) => r.json())
            .then((data) => { if (!cancelled) { setVpvrData(data); setLoadingVpvr(false); } })
            .catch(() => { if (!cancelled) setLoadingVpvr(false); });
        return () => { cancelled = true; };
    }, [signal.symbol, period]);

    const poc = Number(vpvrData?.poc ?? signal.poc);
    const vah = Number(vpvrData?.vah ?? signal.vah);
    const val = Number(vpvrData?.val ?? signal.val);
    const profile = Array.isArray(vpvrData?.volumeProfile) ? vpvrData.volumeProfile
        : (Array.isArray(signal.volumeProfile) ? signal.volumeProfile : []);
    const profileMin = Number(vpvrData?.profileMin ?? signal.profileMin);
    const profileMax = Number(vpvrData?.profileMax ?? signal.profileMax);

    const pocBin = profile.length > 0
        ? profile.reduce((best, v, i) => (v > profile[best] ? i : best), 0)
        : -1;

    const priceVsPoc = Number.isFinite(price) && Number.isFinite(poc)
        ? price > poc ? "above" : price < poc ? "below" : "at"
        : null;

    const priceVsPocColor = priceVsPoc === "above" ? "text-[#a3e635]" : priceVsPoc === "below" ? "text-[#f87171]" : "text-zinc-300";
    const priceVsPocLabel = priceVsPoc === "above" ? "Di atas POC ↑" : priceVsPoc === "below" ? "Di bawah POC ↓" : "Di POC";

    const hasRange = Number.isFinite(profileMin) && Number.isFinite(profileMax) && profileMax > profileMin;
    const profileStep = hasRange ? (profileMax - profileMin) / profile.length : 0;

    const periodLabel = period === "weekly"
        ? `~${vpvrData?.candleCount ?? "–"} minggu (${vpvrData?.rawDailyCount ?? "–"} hari)`
        : `${vpvrData?.candleCount ?? "–"} candle 15m · 24 jam terakhir`;

    function binPrice(i) {
        return profileMin + i * profileStep + profileStep / 2;
    }

    function binLabel(i) {
        const isPoc = i === pocBin;
        const inVA = hasRange
            ? binPrice(i) >= val && binPrice(i) <= vah
            : false;
        if (isPoc) return "POC";
        if (inVA) return "Value Area";
        return null;
    }

    return (
        <section className="mt-8">
            {/* Header + toggle */}
            <div className="flex items-center justify-between gap-3">
                <h3 className="font-chakra text-sm font-bold text-white">VPVR — Volume Profile</h3>
                <div className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-black/20 p-0.5">
                    {["24h", "weekly"].map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={`rounded px-2.5 py-1 font-chakra text-[10px] font-bold uppercase transition ${
                                period === p
                                    ? "bg-[#B7FB5B]/20 text-[#B7FB5B]"
                                    : "text-zinc-500 hover:text-zinc-300"
                            }`}
                        >
                            {p === "24h" ? "24H" : "Weekly"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 space-y-4">
                {/* Mini bar chart with hover */}
                {loadingVpvr ? (
                    <div className="flex flex-col-reverse gap-px overflow-hidden rounded-lg bg-white/[0.03] p-3" style={{ height: 196 }}>
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="flex items-center" style={{ height: 7 }}>
                                <div
                                    className="h-[5px] animate-pulse rounded-sm bg-white/[0.06]"
                                    style={{ width: `${24 + (i % 7) * 8}%` }}
                                />
                            </div>
                        ))}
                    </div>
                ) : profile.length > 0 && (
                    <div className="overflow-hidden rounded-lg bg-white/[0.03] p-3">
                        {/* Tooltip */}
                        <div className={`mb-2 flex items-center justify-between transition-opacity ${hoveredBin !== null ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ minHeight: 28 }}>
                            {hoveredBin !== null && (
                                <>
                                    <span className="font-chakra text-[10px] text-zinc-400">
                                        {binLabel(hoveredBin) && (
                                            <span className={`mr-1.5 rounded px-1 py-0.5 text-[9px] font-bold ${hoveredBin === pocBin ? "bg-[#B7FB5B]/20 text-[#B7FB5B]" : "bg-white/10 text-zinc-300"}`}>
                                                {binLabel(hoveredBin)}
                                            </span>
                                        )}
                                        Volume {profile[hoveredBin]}%
                                    </span>
                                    <span className="font-chakra text-xs font-bold text-white">
                                        {hasRange ? formatPriceLabel(binPrice(hoveredBin)) : "–"}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col-reverse" onMouseLeave={() => setHoveredBin(null)}>
                            {profile.map((pct, i) => {
                                const isPoc = i === pocBin;
                                const isHovered = hoveredBin === i;
                                return (
                                    <div
                                        key={i}
                                        className="flex cursor-crosshair items-center"
                                        style={{ height: 7 }}
                                        onMouseEnter={() => setHoveredBin(i)}
                                    >
                                        <div
                                            className={`h-[5px] rounded-sm transition-all duration-75 ${
                                                isPoc ? "bg-[#B7FB5B]"
                                                : isHovered ? "bg-[#8AEF5A]/80"
                                                : "bg-[#8AEF5A]/30"
                                            }`}
                                            style={{ width: `${Math.max(2, pct)}%` }}
                                        />
                                        {isHovered && (
                                            <div className="ml-1.5 h-px flex-1 border-t border-dashed border-white/10" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-2 font-chakra text-[10px] text-zinc-500">
                            ↕ {profile.length} bins · {periodLabel} · kuning = POC · hover untuk harga
                        </p>
                    </div>
                )}

                {/* POC / VAH / VAL grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white/[0.04] p-3">
                        <p className="font-chakra text-xs text-zinc-400">VAH</p>
                        <p className="mt-1 truncate font-chakra text-xs font-medium text-white">{formatPriceLabel(vah)}</p>
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-500">Value Area High</p>
                    </div>
                    <div className="rounded-lg border border-[#B7FB5B]/20 bg-[#B7FB5B]/5 p-3">
                        <p className="font-chakra text-xs text-[#B7FB5B]">POC</p>
                        <p className="mt-1 truncate font-chakra text-xs font-bold text-white">{formatPriceLabel(poc)}</p>
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-500">Point of Control</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-3">
                        <p className="font-chakra text-xs text-zinc-400">VAL</p>
                        <p className="mt-1 truncate font-chakra text-xs font-medium text-white">{formatPriceLabel(val)}</p>
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-500">Value Area Low</p>
                    </div>
                </div>

                {/* Current price vs POC */}
                {priceVsPoc && (
                    <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                        <p className="font-chakra text-xs text-zinc-400">Harga saat ini</p>
                        <p className={`font-chakra text-xs font-bold ${priceVsPocColor}`}>
                            {formatPriceLabel(price)} — {priceVsPocLabel}
                        </p>
                    </div>
                )}

                {/* Volume Nodes — HVN / LVN */}
                {(hvn.length > 0 || lvn.length > 0) && (
                    <div className="space-y-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between">
                            <p className="font-chakra text-xs font-medium text-zinc-300">Volume Nodes</p>
                            {confluenceStyle && (
                                <span className={`font-chakra text-[10px] font-bold ${confluenceStyle.color}`}>
                                    {confluenceStyle.label}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* HVN — support/resistance kuat */}
                            <div className="space-y-1.5">
                                <p className="font-chakra text-[10px] uppercase tracking-wide text-[#8AEF5A]">HVN · Magnet</p>
                                {hvn.length === 0 && <p className="font-chakra text-[10px] text-zinc-600">—</p>}
                                {hvn.map((n, i) => (
                                    <div key={`hvn-${i}`} className="flex items-center justify-between gap-2">
                                        <span className="font-chakra text-xs text-white">{formatPriceLabel(n.price)}</span>
                                        <span className="font-chakra text-[10px] text-zinc-500">{n.strength}%</span>
                                    </div>
                                ))}
                            </div>

                            {/* LVN — zona gerak cepat */}
                            <div className="space-y-1.5">
                                <p className="font-chakra text-[10px] uppercase tracking-wide text-amber-400">LVN · Runway</p>
                                {lvn.length === 0 && <p className="font-chakra text-[10px] text-zinc-600">—</p>}
                                {lvn.map((n, i) => (
                                    <div key={`lvn-${i}`} className="flex items-center justify-between gap-2">
                                        <span className="font-chakra text-xs text-white">{formatPriceLabel(n.price)}</span>
                                        <span className="font-chakra text-[10px] text-zinc-500">{n.strength}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {nodeEntry && (nodeEntry.guardHVN || nodeEntry.runwayLVN) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.04] pt-2 font-chakra text-[10px] text-zinc-400">
                                {nodeEntry.guardHVN && (
                                    <span>Pelindung HVN: <span className="text-white">{formatPriceLabel(nodeEntry.guardHVN)}</span></span>
                                )}
                                {nodeEntry.runwayLVN && (
                                    <span>Target runway LVN: <span className="text-white">{formatPriceLabel(nodeEntry.runwayLVN)}</span></span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

function EntryZoneDetailSection({ entryZone, currentPrice }) {
    const style = entryZoneStatusStyle(entryZone.status);
    const low = Number(entryZone.low);
    const high = Number(entryZone.high);
    const price = Number(currentPrice);
    const rangeMin = Math.min(low, Number.isFinite(price) ? price : low);
    const rangeMax = Math.max(high, Number.isFinite(price) ? price : high);
    const zoneLeftPct = getRangePercent(low, rangeMin, rangeMax);
    const zoneWidthPct = getRangePercent(high, rangeMin, rangeMax) - zoneLeftPct;
    const pricePct = getRangePercent(price, rangeMin, rangeMax);

    return (
        <section className="mt-8">
            <DetailSectionHeader>Entry Zone</DetailSectionHeader>
            <div className="mt-4 space-y-4">
                <span className={`inline-flex items-center rounded-full border px-3 py-0.5 font-chakra text-xs font-bold uppercase ${style.className}`}>
                    {style.label}
                </span>

                <div className="relative h-2.5 rounded-full bg-[#334155]">
                    <div
                        className="absolute h-full rounded-full bg-[#8AEF5A]/30"
                        style={{ left: `${zoneLeftPct}%`, width: `${Math.max(2, zoneWidthPct)}%` }}
                    />
                    {Number.isFinite(price) && (
                        <span
                            className="absolute top-1/2 z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#B7FB5B]"
                            style={{ left: `${pricePct}%` }}
                            title={`Current: ${formatPriceLabel(price)}`}
                        />
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white/[0.04] p-3">
                        <p className="font-chakra text-xs text-zinc-400">Low</p>
                        <p className="mt-1 truncate font-chakra text-xs font-medium text-white">{formatPriceLabel(entryZone.low)}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-3">
                        <p className="font-chakra text-xs text-zinc-400">Mid</p>
                        <p className="mt-1 truncate font-chakra text-xs font-medium text-white">{formatPriceLabel(entryZone.mid)}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-3">
                        <p className="font-chakra text-xs text-zinc-400">High</p>
                        <p className="mt-1 truncate font-chakra text-xs font-medium text-white">{formatPriceLabel(entryZone.high)}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function PartialTpPlanDetailSection({ plan }) {
    return (
        <section className="mt-8">
            <DetailSectionHeader>Partial TP Plan</DetailSectionHeader>

            {plan.warning === "SL_TOO_CLOSE" && (
                <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                    <p className="font-chakra text-xs font-bold text-yellow-300">⚠ SL terlalu dekat — pertimbangkan ulang risk management</p>
                </div>
            )}

            <div className="mt-3 space-y-2">
                {plan.legs.map((leg, index) => (
                    <div key={leg.level} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-4 py-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#8AEF5A]/15">
                            <span className="font-chakra text-xs font-bold text-[#8AEF5A]">{index + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-chakra text-xs font-bold text-white">
                                {leg.level.toUpperCase()} — Exit {leg.allocationPct}%
                            </p>
                            <p className="font-chakra text-xs text-zinc-400">{formatPriceLabel(leg.price)}</p>
                        </div>
                        {leg.level === "tp1" && (
                            <p className="shrink-0 text-right font-chakra text-[10px] text-zinc-500">
                                Setelah hit →<br />pindah SL ke BE
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                <p className="font-chakra text-xs text-zinc-400">
                    Breakeven SL:{" "}
                    <span className="font-bold text-white">{formatPriceLabel(plan.breakevenSL)}</span>
                    {" "}— aktif setelah TP1 tercapai
                </p>
            </div>
        </section>
    );
}

function deriveSignalBadges(signal) {
    const badges = [];
    const sinceEntry = Number(signal.sinceEntryPercent ?? 0);
    const rsi = Number(signal.rsi);
    const ezStatus = signal.entryZone?.status;
    if (ezStatus === "expired" || ezStatus === "missed" || Math.abs(sinceEntry) > 2) {
        badges.push({ label: "Late Entry", tone: "late" });
    } else if (ezStatus === "valid" || ezStatus === "near-edge") {
        badges.push({ label: "Wait Retest", tone: "warning" });
    }

    if (Number.isFinite(rsi)) {
        if (rsi > 70) badges.push({ label: "RSI Overbought", tone: "short" });
        else if (rsi < 30) badges.push({ label: "RSI Oversold", tone: "long" });
        else badges.push({ label: "RSI Neutral", tone: "neutral" });
    }

    return badges;
}

function deriveSignalNarrative(signal) {
    const isShort = signal.bias === "short";
    const isLong = signal.bias === "long";
    const rsi = Number(signal.rsi);
    const emaFast = Number(signal.emaFast);
    const emaSlow = Number(signal.emaSlow);
    const fastPeriod = signal.fastPeriod || 21;
    const slowPeriod = signal.slowPeriod || 50;
    const ezStatus = signal.entryZone?.status;

    const emaAligned = Number.isFinite(emaFast) && Number.isFinite(emaSlow)
        ? (isShort ? emaFast < emaSlow : emaFast > emaSlow)
        : null;

    const direction = isShort ? "Bearish" : isLong ? "Bullish" : "Neutral";

    const emaPart = emaAligned === null ? null
        : emaAligned
            ? `EMA${fastPeriod} aligned ${isShort ? "below" : "above"} EMA${slowPeriod} — structure confirms bias.`
            : `EMA${fastPeriod} still ${isShort ? "above" : "below"} EMA${slowPeriod} — wait for alignment.`;

    const rsiPart = Number.isFinite(rsi)
        ? isShort && rsi < 50 ? `RSI ${Math.round(rsi)} confirms bearish pressure.`
        : isShort && rsi >= 50 ? `RSI ${Math.round(rsi)} elevated — watch for reversal before shorting.`
        : isLong && rsi > 50 ? `RSI ${Math.round(rsi)} supports bullish continuation.`
        : isLong && rsi <= 50 ? `RSI ${Math.round(rsi)} — oversold zone, watch for bounce.`
        : `RSI ${Math.round(rsi)}.`
        : null;

    const pocPart = signal.poc
        ? `Price must hold ${isShort ? "below" : "above"} POC (${formatPriceLabel(signal.poc)}) for continuation.`
        : null;

    const entryPart = ezStatus === "valid" || ezStatus === "near-edge"
        ? isShort
            ? "Entry locked until retest rejection confirms seller control."
            : "Entry locked until breakout confirmation with buyer strength."
        : ezStatus === "expired" || ezStatus === "missed"
            ? "Setup may have been missed — monitor for next entry opportunity."
            : null;

    return [`${direction} continuation setup.`, emaPart, rsiPart, pocPart, entryPart]
        .filter(Boolean)
        .join(" ");
}

function deriveDecisionSummary(signal) {
    const isShort = signal.bias === "short";
    const isLong = signal.bias === "long";
    const rsi = Number(signal.rsi);
    const stochK = Number(signal.stochK);
    const stochD = Number(signal.stochD);
    const emaFast = Number(signal.emaFast);
    const emaSlow = Number(signal.emaSlow);
    const ezStatus = signal.entryZone?.status;

    const emaAligned = Number.isFinite(emaFast) && Number.isFinite(emaSlow)
        ? (isShort ? emaFast < emaSlow : emaFast > emaSlow)
        : true;

    let directAction = "Wait & Monitor";
    if (ezStatus === "expired" || ezStatus === "missed") directAction = "Stand Aside";
    else if (!emaAligned) directAction = "Wait EMA Alignment";
    else if (ezStatus === "valid") directAction = "Wait Trigger";

    const triggerNeeded = isShort ? "Retest Rejection"
        : isLong ? "Break Confirmation"
        : "Directional Signal";

    let score = 0;
    if (emaAligned) score++;
    if (ezStatus === "valid") score++;
    if (Number.isFinite(rsi)) {
        if (isShort && rsi > 40 && rsi < 70) score++;
        else if (isLong && rsi > 30 && rsi < 65) score++;
    }
    if (Number.isFinite(stochK) && Number.isFinite(stochD)) {
        if (isShort && stochK < stochD) score++;
        else if (isLong && stochK > stochD) score++;
    }
    const confidence = score >= 3 ? "High" : score >= 2 ? "Medium" : "Low";

    let mainConflict = "None Detected";
    if (!emaAligned) mainConflict = "EMA Not Aligned";
    else if (isShort && Number.isFinite(rsi) && rsi < 40) mainConflict = "RSI Oversold vs Short";
    else if (isLong && Number.isFinite(rsi) && rsi > 65) mainConflict = "RSI Overbought vs Long";
    else if (ezStatus === "expired") mainConflict = "Entry Zone Expired";
    else if (ezStatus === "missed") mainConflict = "Setup Missed";
    else if (Number.isFinite(stochK) && Number.isFinite(stochD)) {
        if (isShort && stochK > stochD) mainConflict = "Stoch Rising vs Short";
        else if (isLong && stochK < stochD) mainConflict = "Stoch Falling vs Long";
    }

    return { directAction, triggerNeeded, confidence, mainConflict };
}

function deriveTradePlanDescriptions(signal) {
    const isShort = signal.bias === "short";
    const isLong = signal.bias === "long";
    const tf = formatDetailTimeframe(signal.timeframe);
    const slSrc = levelSourceLabel(signal.slSource);
    const tp1Src = levelSourceLabel(signal.tp1Source);
    const tp2Src = levelSourceLabel(signal.tp2Source);

    const entryDesc = isShort
        ? `Wait for bearish rejection candle at retest zone with ${tf} momentum confirmation before executing short.`
        : isLong
            ? `Wait for bullish confirmation candle at support zone with ${tf} momentum alignment before entering long.`
            : `Monitor for directional bias confirmation before committing to entry.`;

    const slDesc = slSrc
        ? `Invalidation at ${slSrc}. Signal fails if price closes beyond this structure.`
        : `Signal invalid if price closes beyond the protected structure level.`;

    const hasPlan = signal.partialTpPlan?.isValid;
    const leg1Pct = signal.partialTpPlan?.legs?.[0]?.allocationPct;
    const tpDesc = hasPlan && leg1Pct
        ? `Exit ${leg1Pct}% at TP1, move SL to breakeven, let runner target TP2${tp2Src ? ` (${tp2Src})` : ""}.`
        : tp1Src && tp2Src
            ? `Partial exit at TP1 (${tp1Src}), full exit at TP2 (${tp2Src}).`
            : `Take partial profit at TP1 and let remaining position target TP2 if momentum holds.`;

    return { entryDesc, slDesc, tpDesc };
}

function deriveKeyConfluence(signal) {
    const isShort = signal.bias === "short";
    const isLong = signal.bias === "long";
    const rsi = Number(signal.rsi);
    const stochK = Number(signal.stochK);
    const stochD = Number(signal.stochD);
    const emaFast = Number(signal.emaFast);
    const emaSlow = Number(signal.emaSlow);
    const fastPeriod = signal.fastPeriod || 21;
    const slowPeriod = signal.slowPeriod || 50;
    const ezStatus = signal.entryZone?.status;

    let trendValue = "EMA data unavailable";
    if (Number.isFinite(emaFast) && Number.isFinite(emaSlow)) {
        const aligned = isShort ? emaFast < emaSlow : emaFast > emaSlow;
        trendValue = aligned
            ? `EMA${fastPeriod} ${isShort ? "below" : "above"} EMA${slowPeriod} — confirmed`
            : `EMA${fastPeriod} ${isShort ? "above" : "below"} EMA${slowPeriod} — conflict`;
    }

    let levelValue = "No zone data";
    if (ezStatus === "valid") levelValue = "Entry zone valid — await retest";
    else if (ezStatus === "near-edge") levelValue = "Entry zone near expiry";
    else if (ezStatus === "expired") levelValue = "Entry zone expired";
    else if (ezStatus === "missed") levelValue = "Setup missed";
    else if (signal.poc) levelValue = `POC reference: ${formatPriceLabel(signal.poc)}`;

    let momentumValue = "No data";
    if (Number.isFinite(rsi) && Number.isFinite(stochK)) {
        const stochDir = stochK > stochD ? "↑ rising" : "↓ falling";
        momentumValue = `RSI ${Math.round(rsi)} · Stoch ${Number(stochK).toFixed(1)} ${stochDir}`;
    } else if (Number.isFinite(rsi)) {
        momentumValue = `RSI ${Math.round(rsi)}`;
    }

    const emaAligned = Number.isFinite(emaFast) && Number.isFinite(emaSlow)
        ? (isShort ? emaFast < emaSlow : emaFast > emaSlow)
        : true;

    let conflictValue = "None detected";
    if (!emaAligned) conflictValue = "EMA structure misaligned";
    else if (isShort && Number.isFinite(rsi) && rsi < 40) conflictValue = "RSI oversold vs short bias";
    else if (isLong && Number.isFinite(rsi) && rsi > 65) conflictValue = "RSI overbought vs long bias";
    else if (ezStatus === "expired" || ezStatus === "missed") conflictValue = "Entry timing past";
    else if (Number.isFinite(stochK) && Number.isFinite(stochD)) {
        if (isShort && stochK > stochD) conflictValue = "Stoch momentum vs short";
        else if (isLong && stochK < stochD) conflictValue = "Stoch momentum vs long";
    }

    return { trendValue, levelValue, momentumValue, conflictValue };
}

function SignalDetailSideout({ signal, onClose }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape") onClose();
        }

        document.addEventListener("keydown", handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    if (!signal) return null;

    const styles = biasStyles(signal.bias);
    const signalTone = signal.bias === "long" ? "long" : signal.bias === "short" ? "short" : "neutral";
    const signalBadges = deriveSignalBadges(signal);
    const narrative = deriveSignalNarrative(signal);
    const decision = deriveDecisionSummary(signal);
    const tradePlan = deriveTradePlanDescriptions(signal);
    const confluence = deriveKeyConfluence(signal);
    const usdtDominanceWarnings = Array.isArray(signal.usdtDominanceTrend?.warnings)
        ? signal.usdtDominanceTrend.warnings.filter(Boolean)
        : [];

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-[sideout-backdrop_180ms_ease-out]"
            role="presentation"
            onMouseDown={onClose}
        >
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={`Detail signal ${signal.base}`}
                className="relative flex h-dvh w-full max-w-[514px] flex-col overflow-hidden bg-[#141618] shadow-[0_24px_48px_-12px_rgba(10,13,18,0.45)] animate-[sideout-panel_240ms_cubic-bezier(0.22,1,0.36,1)] sm:rounded-l-3xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <SignalDetailTopHeader signal={signal} onClose={onClose} />
                <section className="relative flex-1 overflow-hidden">
                    <div
                        className="h-full overflow-y-auto"
                        style={{
                            padding: "2rem 2rem",
                        }}
                    >
                        <div className="flex flex-wrap gap-2">
                            <DetailBadge tone={signalTone}>{styles.label}</DetailBadge>
                            {signalBadges.map((badge, i) => (
                                <DetailBadge key={i} tone={badge.tone}>{badge.label}</DetailBadge>
                            ))}
                        </div>

                        <section className="mt-6 border-l-[6px] border-[#9AE600] pl-5 bg-[#1E2125] rounded-[8px] p-4">
                            <p className="font-chakra text-xs font-bold text-white">Detail Signal</p>
                            <p className="mt-[4px] font-chakra text-xs leading-5 text-[#D5D7DA]">
                                {narrative}
                            </p>
                        </section>

                        {usdtDominanceWarnings.length > 0 && (
                            <section className="mt-4 rounded-lg border border-yellow-400/20 bg-yellow-500/10 p-3">
                                <p className="font-chakra text-xs font-bold uppercase text-yellow-300">USDT.D Context</p>
                                <ul className="mt-2 space-y-1">
                                    {usdtDominanceWarnings.slice(0, 2).map((warning, i) => (
                                        <li key={i} className="font-chakra text-xs leading-4 text-zinc-300">{warning}</li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <section className="mt-8">
                            <DetailSectionHeader>Decision Summary</DetailSectionHeader>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <DecisionItem label="Direct Action" value={decision.directAction} />
                                <DecisionItem label="Trigger Needed" value={decision.triggerNeeded} />
                                <DecisionItem label="Confidence" value={decision.confidence} />
                                <DecisionItem label="Main Conflict" value={decision.mainConflict} />
                            </div>
                        </section>

                        <section className="mt-8">
                            <DetailSectionHeader>Conditional Trade Plan</DetailSectionHeader>
                            <div className="mt-3">
                                <TradePlanRow
                                    label="Entry"
                                    title={`${formatPriceLabel(signal.entry)} retest confirmation`}
                                    description={tradePlan.entryDesc}
                                />
                                <TradePlanRow
                                    label="SL"
                                    title={`${formatPriceLabel(signal.sl)} invalidation area`}
                                    description={tradePlan.slDesc}
                                />
                                <TradePlanRow
                                    label="TP"
                                    title={`${formatPriceLabel(signal.tp1)} then ${formatPriceLabel(signal.tp2 || signal.tp)}`}
                                    description={tradePlan.tpDesc}
                                    isLast
                                />
                            </div>

                            <SignalDetailMiniProgress signal={signal} />
                        </section>

                        {signal.poc && (
                            <VpvrDetailSection signal={signal} />
                        )}
                        {signal.entryZone && (
                            <EntryZoneDetailSection entryZone={signal.entryZone} currentPrice={signal.price} />
                        )}
                        {signal.partialTpPlan?.isValid && (
                            <PartialTpPlanDetailSection plan={signal.partialTpPlan} />
                        )}

                        <section className="mt-8 pb-8">
                            <p className="font-chakra text-xs font-bold uppercase text-white">Key Confluence</p>
                            <div className="mt-4">
                                <ConfluenceRow label="Trend" value={confluence.trendValue} />
                                <ConfluenceRow label="Level" value={confluence.levelValue} />
                                <ConfluenceRow label="Momentum" value={confluence.momentumValue} />
                                <ConfluenceRow label="Conflict" value={confluence.conflictValue} />
                            </div>
                        </section>
                    </div>
                </section>
            </aside>
        </div>
    );
}

function SignalCard({ signal, selectedSymbol, cooldownRemaining, error, isConservativeMode, onReanalyze, onDelete, onCheckDetail, onToggleMode }) {
    const styles = biasStyles(signal.bias);
    const isDex = signal.marketType === "DEX" || !signal.indicatorAvailable;
    const riskPercent = Number(signal.riskPercent || 0);
    const rewardPercent = Number(signal.rewardPercent || 0);
    const rrLabel = signal.riskReward ? `1:${Number(signal.riskReward).toFixed(1)}` : "-";
    const sinceEntry = Number(signal.sinceEntryPercent ?? signal.change ?? 0);
    const sinceEntryTone = sinceEntry >= 0 ? "text-[#a3e635]" : "text-[#f87171]";
    const showConservative = isConservativeMode && !isDex;

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
                <div className="flex w-full flex-col gap-3 sm:gap-4 @lg:flex-row @lg:items-start">
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 pr-9 sm:gap-2 sm:pr-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md px-2 py-0.5 uppercase sm:py-[3px] ${styles.badge}`} style={{ ...FIGMA_TEXT.textXsBoldWhite, fontSize: "clamp(0.625rem, 0.6rem + 0.125vw, 0.75rem)" }}>
                                {styles.label}
                            </span>
                            {!isDex && (
                                <button
                                    type="button"
                                    onClick={() => onToggleMode?.(signal.symbol)}
                                    aria-pressed={showConservative}
                                    title={showConservative ? "Kembali ke Standard Mode" : "Lihat Conservative Mode"}
                                    className={`rounded border px-1.5 py-0.5 font-chakra text-[10px] font-bold transition ${
                                        showConservative
                                            ? "border-[#B7FB5B]/30 bg-[#B7FB5B]/15 text-[#B7FB5B]"
                                            : "border-zinc-700 bg-black/10 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                                    }`}
                                >
                                    {showConservative ? "◀ Std" : "Gate"}
                                </button>
                            )}
                        </div>
                        <p className="min-w-full truncate" style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700, lineHeight: "20px" }}>
                            {signal.base}/{isDex ? "USD" : "USDT"}
                        </p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4">
                            <p className="truncate" style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700, lineHeight: "20px" }}>{formatPriceLabel(signal.price)}</p>
                            <p className={sinceEntryTone} style={FIGMA_TEXT.textXsMedium}>
                                {formatSignedPercent(sinceEntry)} Since Entry From Signal
                            </p>
                        </div>
                        {!showConservative && (
                            <p className="hidden max-w-[48ch] text-[#f8fafc] sm:block" style={FIGMA_TEXT.textSmMedium}>
                                {isDex
                                    ? "DEX token hanya menampilkan price, liquidity, dan volume karena data indikator belum tersedia."
                                    : `Current masih dekat entry. Risk ke SL ${riskPercent.toFixed(2)}%, reward ke TP2 ${rewardPercent.toFixed(2)}%.`}
                            </p>
                        )}
                    </div>

                    {!showConservative && (
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
                    )}
                </div>

                {showConservative && <ConservativeModePanel gate={signal.conservativeGate} />}

                <SignalProgress signal={signal} />

                {!isDex && (signal.entryZone || (signal.partialTpPlan?.isValid)) && (
                    <div className="flex flex-col gap-2">
                        <EntryZoneCompact entryZone={signal.entryZone} />
                        <PartialTpPlanCompact partialTpPlan={signal.partialTpPlan} />
                    </div>
                )}

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
                    <button
                        type="button"
                        onClick={() => onCheckDetail(signal)}
                        className="relative flex min-h-10 min-w-0 items-center justify-center overflow-hidden rounded-md border border-[#d5d7da] bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(10,13,18,0.05),inset_0_-2px_0_rgba(10,13,18,0.05),inset_0_0_0_1px_rgba(10,13,18,0.18)] transition hover:bg-zinc-100 sm:min-h-11 sm:rounded-lg sm:px-3 sm:py-2"
                    >
                        <span className="truncate" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#414651", fontSize: "clamp(0.6875rem, 0.65rem + 0.2vw, 0.875rem)" }}>Check Detail</span>
                    </button>
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
    const [detailSignal, setDetailSignal] = useState(null);
    const [errors, setErrors] = useState({});
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [conservativeModes, setConservativeModes] = useState(() => {
        try {
            const stored = typeof window !== "undefined" && window.localStorage.getItem("dcms-conservative-modes");
            return new Set(JSON.parse(stored) || []);
        } catch {
            return new Set();
        }
    });

    function toggleConservativeMode(symbol) {
        setConservativeModes((prev) => {
            const next = new Set(prev);
            if (next.has(symbol)) {
                next.delete(symbol);
            } else {
                next.add(symbol);
            }
            try {
                window.localStorage.setItem("dcms-conservative-modes", JSON.stringify([...next]));
            } catch {
                // ignore
            }
            return next;
        });
    }
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
                action: "REANALYZE",
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

            onSignalUpdate(
                { ...payload.signal, conservativeGate: payload.conservativeGate ?? null },
                payload.updatedAt
            );
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

    return (
        <>
            {visibleSignals.map((signal) => (
                <SignalCard
                    key={signal.symbol}
                    signal={signal}
                    selectedSymbol={selectedSymbol}
                    cooldownRemaining={cooldownRemaining}
                    error={errors[signal.symbol]}
                    isConservativeMode={conservativeModes.has(signal.symbol)}
                    onReanalyze={handleReanalyze}
                    onDelete={onSignalDelete}
                    onCheckDetail={setDetailSignal}
                    onToggleMode={toggleConservativeMode}
                />
            ))}

            {detailSignal && (
                <SignalDetailSideout
                    signal={detailSignal}
                    onClose={() => setDetailSignal(null)}
                />
            )}
        </>
    );
}
