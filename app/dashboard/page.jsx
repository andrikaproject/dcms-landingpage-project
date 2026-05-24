import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getMarketDashboard } from "@/lib/market-dashboard";
import { lockSignalAction, removeLockedSignalAction } from "@/app/actions/lock-signal";
import { refreshLockedSignalsForUser } from "@/lib/locked-signals";
import { countPendingUsers } from "@/lib/users";
import ClearableSignalBoard from "@/components/ClearableSignalBoard";
import DashboardShell from "@/components/DashboardShell";
import LockSignalAutoRefresh from "@/components/LockSignalAutoRefresh";

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

function getSignalChange(signals, symbol) {
    const signal = signals.find((item) => item.symbol === symbol);
    const change = Number(signal?.change);
    return Number.isFinite(change) ? change : null;
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

function SignalCard({ signal }) {
    const styles = biasStyles(signal.bias);
    const isDex = signal.marketType === "DEX" || !signal.indicatorAvailable;
    const riskPercent = Number(signal.riskPercent || 0);
    const rewardPercent = Number(signal.rewardPercent || 0);
    const rrLabel = signal.riskReward ? `1:${Number(signal.riskReward).toFixed(1)}` : "-";
    const sinceEntry = Number(signal.sinceEntryPercent ?? signal.change ?? 0);
    const sinceEntryTone = sinceEntry >= 0 ? "text-[#a3e635]" : "text-[#f87171]";

    return (
        <article className="@container relative overflow-hidden rounded-lg bg-gradient-to-br from-[#374151] to-[#111827] p-4 shadow-[0_1px_2px_rgba(10,13,18,0.05)] sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%)]" />

            <div className="relative flex flex-col gap-4">
                <div className="flex w-full flex-col gap-4 @lg:flex-row @lg:items-center">
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                        <span className={`rounded-md px-2 py-[3px] uppercase ${styles.badge}`} style={FIGMA_TEXT.textXsBoldWhite}>
                            {styles.label}
                        </span>
                        <p className="min-w-full truncate" style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700 }}>
                            {signal.base}/{isDex ? "USD" : "USDT"}
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <p style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700 }}>{formatPriceLabel(signal.price)}</p>
                            <p className={sinceEntryTone} style={FIGMA_TEXT.textXsMedium}>
                                {formatSignedPercent(sinceEntry)} Since Entry From Signal
                            </p>
                        </div>
                        <p className="max-w-[48ch] text-[#f8fafc]" style={FIGMA_TEXT.textSmMedium}>
                            {isDex
                                ? "DEX token hanya menampilkan price, liquidity, dan volume karena data indikator belum tersedia."
                                : `Current masih dekat entry. Risk ke SL ${riskPercent.toFixed(2)}%, reward ke TP2 ${rewardPercent.toFixed(2)}%.`}
                        </p>
                    </div>

                    <div className="grid w-full shrink-0 grid-cols-2 gap-2 whitespace-nowrap @lg:w-[min(42%,180px)]">
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

                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    <form action={lockSignalAction} className="min-w-0 flex-1">
                        <SignalHiddenInputs signal={signal} />
                        <button
                            type="submit"
                            className="relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-white/10 bg-[#B7FB5B] px-3 py-2 shadow-[0_1px_2px_rgba(10,13,18,0.05),inset_0_-2px_0_rgba(10,13,18,0.05),inset_0_0_0_1px_rgba(10,13,18,0.18)] transition hover:bg-[#a8ec4c]"
                        >
                            <span className="text-black" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#000000" }}>Lock Signal</span>
                        </button>
                    </form>
                    <form action="/dashboard" method="get" className="min-w-0 flex-1">
                        <input type="hidden" name="timeframe" value={signal.timeframe || "15m"} />
                        <input type="hidden" name="symbol" value={signal.base} />
                        <input type="hidden" name="reanalyze" value={signal.symbol} />
                        <button
                            type="submit"
                            className="relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-white/10 bg-[#B7FB5B] px-3 py-2 shadow-[0_1px_2px_rgba(10,13,18,0.05),inset_0_-2px_0_rgba(10,13,18,0.05),inset_0_0_0_1px_rgba(10,13,18,0.18)] transition hover:bg-[#a8ec4c]"
                        >
                            <span className="text-black" style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#000000" }}>Re Analyze</span>
                        </button>
                    </form>
                    <Link
                        href="#lock-signal-list"
                        className="relative flex min-h-11 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-[#d5d7da] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(10,13,18,0.05),inset_0_-2px_0_rgba(10,13,18,0.05),inset_0_0_0_1px_rgba(10,13,18,0.18)] transition hover:bg-zinc-100"
                    >
                        <span style={{ ...FIGMA_TEXT.textSmBoldWhite, color: "#414651" }}>Check Detail</span>
                    </Link>
                </div>
            </div>
        </article>
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
        <div className="relative h-[112px] sm:h-[62px]">
            <div
                className="group relative h-5 w-full"
                aria-label={`${signal.base} progress from stop loss to targets. Current price ${formatPriceLabel(signal.price)}.`}
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

function LockedSignalList({ lockedSignals }) {
    return (
        <section id="lock-signal-list" className="mt-6 scroll-mt-28 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Lock Signal</p>
                    <h2 className="mt-1 font-nebulica text-[clamp(1.25rem,1.1rem+0.75vw,1.5rem)] font-bold text-white">Active Locked Signals</h2>
                </div>
                <p className="font-chakra text-xs text-zinc-500">Auto refresh setiap 5 menit. Hit TP/SL akan keluar dari list.</p>
            </div>

            {lockedSignals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-5 font-chakra text-sm text-zinc-500">
                    Belum ada sinyal yang di-lock. Klik tombol Lock Signal pada card sinyal untuk mulai tracking progress.
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
                    {lockedSignals.map((signal) => (
                        <LockedSignalCard key={signal.id} signal={signal} />
                    ))}
                </div>
            )}
        </section>
    );
}

function LockedSignalCard({ signal }) {
    const styles = biasStyles(signal.bias);
    const sinceEntry = Number(signal.sinceEntryPercent || 0);
    const sinceEntryTone = sinceEntry >= 0 ? "text-[#a3e635]" : "text-[#f87171]";

    return (
        <article className="@container relative overflow-hidden rounded-lg bg-gradient-to-br from-[#374151] to-[#111827] p-4 sm:p-5">
            <div className="relative flex flex-col gap-4">
                <div className="flex flex-col gap-3 @md:flex-row @md:items-start @md:justify-between">
                    <div className="min-w-0">
                        <span className={`rounded-md px-2 py-[3px] uppercase ${styles.badge}`} style={FIGMA_TEXT.textXsBoldWhite}>
                            {styles.label}
                        </span>
                        <h3 className="mt-2 truncate" style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700 }}>
                            {signal.base}/{signal.marketType === "DEX" ? "USD" : "USDT"}
                        </h3>
                        <p className={sinceEntryTone} style={FIGMA_TEXT.textXsMedium}>
                            {formatSignedPercent(sinceEntry)} Since Locked Signal
                        </p>
                    </div>
                    <div className="flex items-start justify-between gap-3 @md:justify-end @md:text-right">
                        <div>
                            <p style={FIGMA_TEXT.textXsBoldWhite}>Current</p>
                            <p style={{ ...FIGMA_TEXT.textBaseMediumWhite, fontWeight: 700 }}>{formatPriceLabel(signal.currentPrice)}</p>
                        </div>
                        <form action={removeLockedSignalAction}>
                            <input type="hidden" name="signalId" value={signal.id} />
                            <button
                                type="submit"
                                className="grid size-9 place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100 active:scale-95"
                                aria-label={`Remove locked signal ${signal.base}`}
                                title="Remove locked signal"
                            >
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
                            </button>
                        </form>
                    </div>
                </div>

                <SignalProgress
                    signal={{
                        ...signal,
                        price: signal.currentPrice,
                        tp: signal.tp2,
                    }}
                />

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

function Icon({ name }) {
    const iconProps = {
        width: 20,
        height: 20,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
    };

    const paths = {
        dashboard: (
            <>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
            </>
        ),
        chart: (
            <>
                <path d="M3 3v18h18" />
                <path d="m7 15 4-4 3 3 5-7" />
            </>
        ),
        ebook: (
            <>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
            </>
        ),
        bot: (
            <>
                <rect x="5" y="8" width="14" height="10" rx="3" />
                <path d="M12 8V4" />
                <path d="M9 13h.01" />
                <path d="M15 13h.01" />
                <path d="M8 20h8" />
            </>
        ),
        bell: (
            <>
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </>
        ),
        logout: (
            <>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
            </>
        ),
        menu: (
            <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
            </>
        ),
    };

    return <svg {...iconProps}>{paths[name]}</svg>;
}

function LogoutForm({ compact = false }) {
    return (
        <form
            action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/login" });
            }}
        >
            <button
                className={`grid place-items-center rounded-lg border border-[#36353d] bg-gradient-to-b from-[#25242a] to-[#17161c] text-[#949398] transition hover:text-white ${compact ? "size-10" : "size-8"}`}
                aria-label="Logout"
            >
                <Icon name="logout" />
            </button>
        </form>
    );
}

function DashboardIntro({ session, pendingCount }) {
    return (
        <section className="w-full rounded-xl bg-gradient-to-b from-[#222129] to-[#100f15] p-4 text-white sm:p-5 lg:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                    <h1 style={FIGMA_TEXT.text2xlBoldWhite}>Dashboard</h1>
                    <p className="mt-[7px]" style={FIGMA_TEXT.textBaseRegularWhite}>
                        Selamat datang {session.user.name || session.user.email}, Dashboard ini hanya tools, selalu DYOR dengan segala informasi yang diberikan
                    </p>
                </div>

                {session.user.role === "ADMIN" && (
                    <Link
                        href="/dashboard/admin/users"
                        className="min-h-11 shrink-0 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 font-chakra text-xs font-bold text-blue-300 transition hover:bg-blue-500/20"
                    >
                        Review User ({pendingCount})
                    </Link>
                )}
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
                        <p style={{ ...FIGMA_TEXT.textXsMedium, color: "#535862" }}>{name}</p>
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

function MiniMetricCard({ label, value, tone }) {
    return (
        <div className="flex min-h-[54px] min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl bg-gradient-to-b from-[#222129] to-[#100f15] px-3 py-2">
            <p className="truncate" style={{ ...FIGMA_TEXT.textXsMedium, color: "#FFFFFF" }}>{label}</p>
            <p className={tone} style={FIGMA_TEXT.textXsMedium}>{value}</p>
        </div>
    );
}

function TimeframeMenu({ current, symbol }) {
    const options = ["1m", "15m", "1h", "4h", "1d"];

    return (
        <details className="group relative z-50 shrink-0">
            <summary className="flex min-h-11 w-[92px] cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-[#36353d] bg-[#d9f99d] px-2 py-2.5 shadow-[0_1px_2px_rgba(20,21,26,0.05)] transition duration-300 ease-out marker:hidden hover:bg-[#cff789] active:scale-[0.98] group-open:rounded-b-none group-open:border-[#B7FB5B]/70 [&::-webkit-details-marker]:hidden">
                <span className="min-w-[2.25rem] text-center uppercase" style={{ ...FIGMA_TEXT.textXsMedium, color: "#16161e" }}>{current}</span>
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
            <div className="absolute right-0 top-full z-50 flex w-[92px] origin-top flex-col overflow-hidden rounded-b-md border border-t-0 border-[#36353d] bg-[#17161c] opacity-0 shadow-xl transition duration-300 ease-out group-open:opacity-100 group-open:animate-[timeframe-menu_180ms_ease-out]">
                {options.map((option) => (
                    <Link
                        key={option}
                        href={`/dashboard?timeframe=${option}${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ""}`}
                        className={`px-3 py-2 text-center uppercase transition ${option === current
                            ? "bg-[#d9f99d] text-[#16161e]"
                            : "text-[#949398] hover:bg-white/[0.04] hover:text-white"
                            }`}
                        style={FIGMA_TEXT.textXsMedium}
                    >
                        {option}
                    </Link>
                ))}
            </div>
        </details>
    );
}

function DashboardOverview({ marketDashboard, session, pendingCount, symbol }) {
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
                        <MiniMetricCard label="USDT.D" value={`${marketDashboard.usdtDominance.value.toFixed(2)}%`} tone="text-[#bef264]" />
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
                            <p style={FIGMA_TEXT.textBaseMediumWhite}>Market REGIME</p>
                            <h2 className="mt-[7px] text-balance" style={FIGMA_TEXT.text2xlBoldWhite}>
                                Market its Still {regimeText}
                            </h2>
                        </div>
                        <TimeframeMenu current={marketDashboard.timeframe} symbol={symbol} />
                    </div>
                </article>
            </section>
        </div>
    );
}

export default async function DashboardPage({ searchParams }) {
    const session = await auth();

    if (!session) redirect("/login");

    const params = await searchParams;
    const timeframe = params?.timeframe || "15m";
    const symbol = params?.symbol || "";
    const reanalyze = params?.reanalyze || "";

    const [marketDashboard, pendingCount, lockedSignals] = await Promise.all([
        getMarketDashboard({ timeframe, symbol, reanalyze }),
        session.user.role === "ADMIN"
            ? countPendingUsers()
            : 0,
        refreshLockedSignalsForUser(session.user.email),
    ]);

    return (
        <DashboardShell
            user={{
                name: session.user.name,
                email: session.user.email,
                uuidBitunix: session.user.uuidBitunix,
                role: session.user.role,
            }}
            logoutSlot={<LogoutForm compact />}
        >
            <LockSignalAutoRefresh />
            <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <DashboardOverview
                    marketDashboard={marketDashboard}
                    session={session}
                    pendingCount={pendingCount}
                    symbol={symbol}
                />

                <LockedSignalList lockedSignals={lockedSignals} />

                <section className="mb-6 mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
                    <form action="/dashboard" className="flex flex-col gap-3 md:flex-row md:items-center">
                        <input type="hidden" name="timeframe" value={marketDashboard.timeframe} />
                        <div className="flex-1">
                            <label htmlFor="symbol-search" className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-600">
                                Search Coin
                            </label>
                            <input
                                id="symbol-search"
                                name="symbol"
                                defaultValue={symbol}
                                placeholder="BTC, ETH, SOL, PEPE..."
                                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 font-chakra text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#B7FB5B]/50 focus:ring-2 focus:ring-[#B7FB5B]/10"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:flex md:pt-7">
                            <button
                                type="submit"
                                className="h-12 rounded-xl bg-[#B7FB5B] px-5 text-sm font-black text-black transition hover:bg-[#a8ec4c] active:scale-95"
                            >
                                Analyze
                            </button>
                            {symbol && (
                                <Link
                                    href={`/dashboard?timeframe=${marketDashboard.timeframe}`}
                                    className="grid h-12 place-items-center rounded-xl border border-zinc-800 bg-black px-5 text-sm font-bold text-zinc-400 transition hover:text-white"
                                >
                                    Clear
                                </Link>
                            )}
                        </div>
                    </form>
                    {marketDashboard.searchedSymbol && !marketDashboard.signals.some((signal) => signal.symbol === marketDashboard.searchedSymbol) && (
                        <p className="mt-3 text-sm text-red-300">
                            Symbol {marketDashboard.searchedSymbol} tidak ditemukan di Binance, Bybit, maupun Dexscreener.
                        </p>
                    )}
                </section>

                <ClearableSignalBoard
                    updatedAt={new Date(marketDashboard.updatedAt).toLocaleTimeString("id-ID")}
                    signalCount={marketDashboard.signals.length}
                >
                    {marketDashboard.signals.map((signal) => (
                        <SignalCard key={signal.symbol} signal={signal} />
                    ))}
                </ClearableSignalBoard>
            </div>
        </DashboardShell>
    );
}
