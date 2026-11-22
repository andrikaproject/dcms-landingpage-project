"use client";

import { useEffect, useId, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import SignalEventTimeline from "./signals/pending/SignalEventTimeline";

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
        "invalid":   { label: "Zone Invalid",      className: "border-zinc-600/30 bg-zinc-700/20 text-zinc-400" },
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

function hasNumericValue(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function hasActiveTradePlan(signal) {
    return hasNumericValue(signal?.entry)
        && hasNumericValue(signal?.sl)
        && hasNumericValue(signal?.tp1)
        && hasNumericValue(signal?.tp2 ?? signal?.tp);
}

function NoTradeSetup({ detail = false }) {
    return (
        <div className={`rounded-lg border border-sky-400/20 bg-sky-500/10 ${detail ? "p-4" : "p-3"}`}>
            <p className="font-chakra text-xs font-bold uppercase tracking-wide text-sky-300">Belum ada setup entry</p>
            <p className="mt-1 font-chakra text-xs leading-5 text-zinc-300">
                Signal masih netral. Entry, stop loss, TP1, dan TP2 akan tersedia setelah arah market terkonfirmasi.
            </p>
        </div>
    );
}

function normalizeVolumeProfile(rawProfile, profileMin, profileMax) {
    if (!Array.isArray(rawProfile)) return [];

    const min = Number(profileMin);
    const max = Number(profileMax);
    const step = Number.isFinite(min) && Number.isFinite(max) && max > min
        ? (max - min) / rawProfile.length
        : 0;

    return rawProfile.map((row, index) => {
        const isObject = row !== null && typeof row === "object" && !Array.isArray(row);
        const volume = Number(isObject ? row.volume : row);
        const apiPrice = Number(isObject ? row.price : null);
        const fallbackPrice = step ? min + step * (index + 0.5) : null;

        return {
            price: Number.isFinite(apiPrice) ? apiPrice : fallbackPrice,
            volume: Number.isFinite(volume) ? volume : 0,
            isLegacyPercent: !isObject,
        };
    });
}

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
                <p className="w-full truncate font-chakra text-[10px] font-normal text-zinc-400">{sublabel}</p>
            )}
        </div>
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

function ChevronDownIcon({ className = "" }) {
    return (
        <svg
            className={`size-5 ${className}`}
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

// Pilihan buka/tutup diingat per section, jadi sinyal berikutnya terbuka dengan
// susunan yang sama. Storage yang ditolak browser cukup diabaikan.
const SECTION_STORAGE_KEY = "dcms:signal-detail:collapsed";

function readCollapsed() {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(SECTION_STORAGE_KEY) || "[]");
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
}

function writeCollapsed(id, collapsed) {
    try {
        const set = readCollapsed();
        if (collapsed) set.add(id);
        else set.delete(id);
        window.localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify([...set]));
    } catch {
        // Mode privat atau storage penuh: pilihan hanya berlaku sampai sideout ditutup.
    }
}

// Section yang bisa dibuka-tutup. Seluruh baris judul adalah tombolnya; isi
// dilipat lewat grid-template-rows supaya tingginya mengikuti konten. Saat
// terbuka penuh overflow dilepas agar penanda yang keluar batas tidak terpotong.
function DetailSection({ id, title, className = "mt-8", children }) {
    const contentId = useId();
    const [open, setOpen] = useState(() => !readCollapsed().has(id));
    const [settled, setSettled] = useState(true);

    function toggle() {
        const next = !open;
        setOpen(next);
        setSettled(false);
        writeCollapsed(id, !next);
    }

    return (
        <section className={className}>
            <h3>
                <button
                    type="button"
                    data-press="surface"
                    aria-expanded={open}
                    aria-controls={contentId}
                    onClick={toggle}
                    className="-mx-2 -my-2 flex min-h-9 w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-md px-2 text-left font-chakra text-sm font-bold text-white hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#b8fb5c] pointer-coarse:-my-3 pointer-coarse:min-h-11"
                >
                    {title}
                    <ChevronDownIcon className={`shrink-0 text-zinc-400 transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
                </button>
            </h3>
            <div
                id={contentId}
                inert={!open}
                onTransitionEnd={(event) => {
                    if (event.target === event.currentTarget && event.propertyName === "grid-template-rows") setSettled(true);
                }}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
                <div className={`min-h-0 ${open && settled ? "" : "overflow-hidden"}`}>{children}</div>
            </div>
        </section>
    );
}

function DecisionItem({ label, value }) {
    return (
        <div className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="truncate font-chakra text-xs text-zinc-400">{label}</p>
                <span className="grid size-4 shrink-0 place-items-center rounded-full border border-zinc-600 text-[10px] text-zinc-400">
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
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-400">Live {liveRRLabel}</p>
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
        apiRequest("/market/vpvr", { query: { symbol: signal.symbol, period } })
            .then((data) => { if (!cancelled) { setVpvrData(data); setLoadingVpvr(false); } })
            .catch(() => { if (!cancelled) setLoadingVpvr(false); });
        return () => { cancelled = true; };
    }, [signal.symbol, period]);

    const poc = Number(vpvrData?.poc ?? signal.poc);
    const vah = Number(vpvrData?.vah ?? signal.vah);
    const val = Number(vpvrData?.val ?? signal.val);
    const profileMin = Number(vpvrData?.profileMin ?? signal.profileMin);
    const profileMax = Number(vpvrData?.profileMax ?? signal.profileMax);
    const rawProfile = Array.isArray(vpvrData?.volumeProfile) ? vpvrData.volumeProfile
        : (Array.isArray(signal.volumeProfile) ? signal.volumeProfile : []);
    const profile = normalizeVolumeProfile(rawProfile, profileMin, profileMax);
    const peakVolume = Math.max(0, ...profile.map((bin) => bin.volume));

    const pocBin = profile.length > 0
        ? profile.reduce((best, bin, index) => (bin.volume > profile[best].volume ? index : best), 0)
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
        return profile[i]?.price ?? profileMin + i * profileStep + profileStep / 2;
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
                                    : "text-zinc-400 hover:text-zinc-300"
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
                                    className="h-[5px] motion-safe:animate-pulse rounded-sm bg-white/[0.06]"
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
                                        Volume {profile[hoveredBin]?.isLegacyPercent
                                            ? `${profile[hoveredBin].volume}%`
                                            : formatVolume(profile[hoveredBin]?.volume)}
                                    </span>
                                    <span className="font-chakra text-xs font-bold text-white">
                                        {hasRange ? formatPriceLabel(binPrice(hoveredBin)) : "–"}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col-reverse" onMouseLeave={() => setHoveredBin(null)}>
                            {profile.map((bin, i) => {
                                const isPoc = i === pocBin;
                                const isHovered = hoveredBin === i;
                                const width = peakVolume > 0 ? bin.volume / peakVolume * 100 : 0;
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
                                            style={{ width: `${Math.max(2, width)}%` }}
                                        />
                                        {isHovered && (
                                            <div className="ml-1.5 h-px flex-1 border-t border-dashed border-white/10" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-2 font-chakra text-[10px] text-zinc-400">
                            ↕ {profile.length} bins · {periodLabel} · kuning = POC · hover untuk harga
                        </p>
                    </div>
                )}

                {/* POC / VAH / VAL grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white/[0.04] p-3">
                        <p className="font-chakra text-xs text-zinc-400">VAH</p>
                        <p className="mt-1 truncate font-chakra text-xs font-medium text-white">{formatPriceLabel(vah)}</p>
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-400">Value Area High</p>
                    </div>
                    <div className="rounded-lg border border-[#B7FB5B]/20 bg-[#B7FB5B]/5 p-3">
                        <p className="font-chakra text-xs text-[#B7FB5B]">POC</p>
                        <p className="mt-1 truncate font-chakra text-xs font-bold text-white">{formatPriceLabel(poc)}</p>
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-400">Point of Control</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-3">
                        <p className="font-chakra text-xs text-zinc-400">VAL</p>
                        <p className="mt-1 truncate font-chakra text-xs font-medium text-white">{formatPriceLabel(val)}</p>
                        <p className="mt-0.5 font-chakra text-[10px] text-zinc-400">Value Area Low</p>
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
                                {hvn.length === 0 && <p className="font-chakra text-[10px] text-zinc-400">—</p>}
                                {hvn.map((n, i) => (
                                    <div key={`hvn-${i}`} className="flex items-center justify-between gap-2">
                                        <span className="font-chakra text-xs text-white">{formatPriceLabel(n.price)}</span>
                                        <span className="font-chakra text-[10px] text-zinc-400">{n.strength}%</span>
                                    </div>
                                ))}
                            </div>

                            {/* LVN — zona gerak cepat */}
                            <div className="space-y-1.5">
                                <p className="font-chakra text-[10px] uppercase tracking-wide text-amber-400">LVN · Runway</p>
                                {lvn.length === 0 && <p className="font-chakra text-[10px] text-zinc-400">—</p>}
                                {lvn.map((n, i) => (
                                    <div key={`lvn-${i}`} className="flex items-center justify-between gap-2">
                                        <span className="font-chakra text-xs text-white">{formatPriceLabel(n.price)}</span>
                                        <span className="font-chakra text-[10px] text-zinc-400">{n.strength}%</span>
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
        <DetailSection id="entry-zone" title="Entry Zone">
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
        </DetailSection>
    );
}

function PartialTpPlanDetailSection({ plan }) {
    return (
        <DetailSection id="partial-tp" title="Partial TP Plan">

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
                            <p className="shrink-0 text-right font-chakra text-[10px] text-zinc-400">
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
        </DetailSection>
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

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SignalDetailSideout({ signal, onClose }) {
    const panelRef = useRef(null);

    // Panel ini modal: fokus dipindah ke dalam saat dibuka, ditahan di dalam
    // selama terbuka, lalu dikembalikan ke pemicunya saat ditutup.
    useEffect(() => {
        const trigger = document.activeElement;
        const panel = panelRef.current;

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
                return;
            }

            if (event.key !== "Tab" || !panel) return;

            const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));

            if (focusable.length === 0) {
                event.preventDefault();
                panel.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        panel?.focus();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (trigger instanceof HTMLElement) trigger.focus();
        };
    }, [onClose]);

    if (!signal) return null;

    const styles = biasStyles(signal.bias);
    const signalTone = signal.bias === "long" ? "long" : signal.bias === "short" ? "short" : "neutral";
    const signalBadges = deriveSignalBadges(signal);
    const narrative = deriveSignalNarrative(signal);
    const decision = deriveDecisionSummary(signal);
    const tradePlan = deriveTradePlanDescriptions(signal);
    const tradePlanAvailable = hasActiveTradePlan(signal);
    const confluence = deriveKeyConfluence(signal);
    const usdtDominanceWarnings = Array.isArray(signal.usdtDominanceTrend?.warnings)
        ? signal.usdtDominanceTrend.warnings.filter(Boolean)
        : [];

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm tactile-backdrop"
            role="presentation"
            onMouseDown={onClose}
        >
            <aside
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Detail signal ${signal.base}`}
                tabIndex={-1}
                className="relative flex h-dvh w-full max-w-[514px] flex-col overflow-hidden bg-[#141618] shadow-[0_24px_48px_-12px_rgba(10,13,18,0.45)] focus:outline-none tactile-sheet sm:rounded-l-3xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <SignalDetailTopHeader signal={signal} onClose={onClose} />
                <section className="relative flex-1 overflow-hidden">
                    <div
                        className="h-full overflow-y-auto overscroll-contain"
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

                        <DetailSection id="decision-summary" title="Decision Summary">
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <DecisionItem label="Direct Action" value={decision.directAction} />
                                <DecisionItem label="Trigger Needed" value={decision.triggerNeeded} />
                                <DecisionItem label="Confidence" value={decision.confidence} />
                                <DecisionItem label="Main Conflict" value={decision.mainConflict} />
                            </div>
                        </DetailSection>

                        <DetailSection id="trade-plan" title="Conditional Trade Plan">
                            {tradePlanAvailable ? <>
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
                            </> : (
                                <div className="mt-3">
                                    <NoTradeSetup detail />
                                </div>
                            )}
                        </DetailSection>

                        {signal.poc && (
                            <VpvrDetailSection signal={signal} />
                        )}
                        {signal.entryZone && (
                            <EntryZoneDetailSection entryZone={signal.entryZone} currentPrice={signal.price} />
                        )}
                        {signal.partialTpPlan?.isValid && (
                            <PartialTpPlanDetailSection plan={signal.partialTpPlan} />
                        )}

                        <section className="mt-8">
                            <p className="font-chakra text-xs font-bold uppercase text-white">Key Confluence</p>
                            <div className="mt-4">
                                <ConfluenceRow label="Trend" value={confluence.trendValue} />
                                <ConfluenceRow label="Level" value={confluence.levelValue} />
                                <ConfluenceRow label="Momentum" value={confluence.momentumValue} />
                                <ConfluenceRow label="Conflict" value={confluence.conflictValue} />
                            </div>
                        </section>

                        {/* Histori lifecycle pindah ke sini dari kartu Hasil Analisis;
                            hanya rencana yang punya signalId yang dilacak backend. */}
                        {signal.signalId && (
                            <section className="mt-8 pb-8">
                                <SignalEventTimeline signalId={signal.signalId} />
                            </section>
                        )}
                    </div>
                </section>
            </aside>
        </div>
    );
}
