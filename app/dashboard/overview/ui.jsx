import { formatDecimalPrice } from "@/lib/signals/format";

// Token warna frame Figma "Dashboard - Redesign" (node 2645:1835).
export const BIAS_TONE = {
    long: { text: "text-[#4ade80]", dot: "bg-[#4ade80]", pill: "border-[#4ade80]/30 bg-[#4ade80]/[0.12] text-[#4ade80]", hex: "#4ade80", label: "LONG", word: "Long" },
    short: { text: "text-[#f87171]", dot: "bg-[#f87171]", pill: "border-[#f87171]/30 bg-[#f87171]/[0.12] text-[#f87171]", hex: "#f87171", label: "SHORT", word: "Short" },
    neutral: { text: "text-[#fbbf24]", dot: "bg-[#fbbf24]", pill: "border-[#fbbf24]/30 bg-[#fbbf24]/[0.12] text-[#fbbf24]", hex: "#fbbf24", label: "NETRAL", word: "Netral" },
};

export function biasTone(bias) {
    return BIAS_TONE[String(bias || "").toLowerCase()] || BIAS_TONE.neutral;
}

export function formatPrice(value, placeholder = "—") {
    return formatDecimalPrice(value, { prefix: "", placeholder });
}

export function formatPercent(value, { digits = 1, placeholder = "—" } = {}) {
    const number = Number(value);
    if (value === null || value === undefined || !Number.isFinite(number)) return placeholder;
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(digits)}%`;
}

// Menit tetap huruf kecil, jam dan hari kapital (15m, 1H, 4H, 1D).
export function formatTimeframe(timeframe) {
    const value = String(timeframe || "");
    return value.endsWith("m") ? value : value.toUpperCase();
}

export function pairLabel(signal) {
    const base = signal?.base || String(signal?.symbol || "").replace(/USDT$|USD$/i, "");
    return `${base}/${signal?.marketType === "DEX" ? "USD" : "USDT"}`;
}

export function BiasPill({ bias, label }) {
    const tone = biasTone(bias);
    return (
        <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border py-1 pl-2 pr-2.5 font-mono text-[11px] font-semibold leading-[14px] tracking-[0.04em] ${tone.pill}`}>
            <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
            {label || tone.label}
        </span>
    );
}

export function CoinAvatar({ label, size = "md" }) {
    const sizeClass = size === "sm" ? "size-7 rounded-lg text-[13px]" : "size-10 rounded-[10px] text-base";
    return (
        <span className={`grid shrink-0 place-items-center bg-[#1e293b] font-chakra font-bold text-[#f8fafc] ${sizeClass}`} aria-hidden>
            {String(label || "?").slice(0, 1).toUpperCase()}
        </span>
    );
}

export function Panel({ as: Tag = "section", className = "", children, ...props }) {
    return (
        <Tag className={`min-w-0 overflow-hidden rounded-2xl bg-[#111417] shadow-[var(--shadow-card)] ${className}`} {...props}>
            {children}
        </Tag>
    );
}

export const SECTION_LABEL = "font-mono text-[10px] font-medium uppercase leading-[13px] tracking-[0.08em] text-[#64748b]";
