// Logika murni halaman Live Chart: level yang digambar, jarak dari harga
// terbaru, EMA, dan pembaruan candle terakhir dari harga live.

import { calcEMA } from "./indicators.js";
import { calculateEntryZone } from "./entry-zone.js";

export const LEVEL_COLORS = {
    entry: "#94a3b8",
    sl: "#f87171",
    tp1: "#4ade80",
    tp2: "#4ade80",
    // Sama dengan warna level di Market Analysis.
    pwh: "#38bdf8",
    pdh: "#B7FB5B",
    pdl: "#f59e0b",
    pwl: "#f472b6",
    ai: "#a78bfa",
};

export const TIMEFRAME_SECONDS = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14_400, "1d": 86_400 };

function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function line(key, label, price) {
    return price === null ? null : { key, label, kind: "line", price, color: LEVEL_COLORS[key] };
}

// Level konteks dari Market Analysis (basis UTC exchange), urut dari atas.
export function levelsFromKeyLevels(keyLevels) {
    if (!keyLevels) return [];
    return [
        line("pwh", "PWH · high minggu lalu", toNumber(keyLevels.pwh)),
        line("pdh", "PDH · high kemarin", toNumber(keyLevels.pdh)),
        line("pdl", "PDL · low kemarin", toNumber(keyLevels.pdl)),
        line("pwl", "PWL · low minggu lalu", toNumber(keyLevels.pwl)),
    ].filter(Boolean);
}

// Hasil analisis berarah memberi zona entry, SL, TP1, TP2. Bias netral tidak
// punya rencana, jadi yang digambar adalah level konteks PDH/PDL/PWH/PWL.
export function levelsFromAnalysis(signal, keyLevels = null) {
    if (!signal) return [];
    const bias = String(signal.bias || "").toLowerCase();

    if (bias !== "long" && bias !== "short") return levelsFromKeyLevels(keyLevels);

    const zone = calculateEntryZone({
        bias,
        entry: Number(signal.entry),
        atr: Number(signal.atr),
        support: Number(signal.support),
        resistance: Number(signal.resistance),
        price: Number(signal.price),
    });
    const entry = zone && zone.status !== "invalid"
        ? { key: "entry", label: "Zona entry", kind: "zone", low: zone.low, high: zone.high, price: zone.mid, color: LEVEL_COLORS.entry }
        : line("entry", "Entry", toNumber(signal.entry));

    return [
        entry,
        line("sl", "Stop loss", toNumber(signal.sl)),
        line("tp1", "TP1", toNumber(signal.tp1)),
        line("tp2", "TP2", toNumber(signal.tp2 ?? signal.tp)),
    ].filter(Boolean);
}

// Sinyal terkunci menyimpan satu harga entry, bukan zona.
export function levelsFromLocked(locked) {
    if (!locked) return [];
    return [
        line("entry", "Entry", toNumber(locked.entry)),
        line("sl", "Stop loss", toNumber(locked.sl)),
        line("tp1", "TP1", toNumber(locked.tp1)),
        line("tp2", "TP2", toNumber(locked.tp2)),
    ].filter(Boolean);
}

// Level dari jawaban AI Agent: violet, terpisah dari level DCMS. SL digambar
// titik-titik seperti garis invalidasi di desain.
export function levelsFromAgentPlan(plan) {
    if (!plan) return [];
    const aiLine = (key, label, price, lineStyle = "dashed") => (price === null || price === undefined ? null
        : { key, label, kind: "line", price, color: LEVEL_COLORS.ai, lineStyle, source: "ai" });
    return [
        aiLine("aiTp2", "AI TP2", plan.tp2),
        aiLine("aiTp1", "AI TP1", plan.tp1),
        aiLine("aiEntry", "AI Entry", plan.entry),
        aiLine("aiSl", "AI SL", plan.sl, "dotted"),
    ].filter(Boolean);
}

// Saat lapisan AI tampil, level DCMS diredupkan supaya fokus ke garis AI.
function fadeColor(color, alpha) {
    const hex = /^#([0-9a-f]{6})$/i.exec(color || "")?.[1];
    if (!hex) return color;
    const [r, g, b] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function dimLevels(levels) {
    return levels.map((level) => ({ ...level, color: fadeColor(level.color, 0.35) }));
}

// Persen dihitung ulang dari harga terbaru, bukan dari harga saat analisis.
export function distanceFromPrice(levelPrice, price) {
    const level = toNumber(levelPrice);
    const current = toNumber(price);
    if (level === null || current === null || current === 0) return null;
    return ((level - current) / current) * 100;
}

export function emaSeries(candles, period) {
    if (!Array.isArray(candles) || candles.length < period) return [];
    const values = calcEMA(candles.map((candle) => candle.close), period);
    // Titik awal EMA masih dipengaruhi nilai pembuka, jadi tidak digambar.
    return candles.slice(period - 1).map((candle, index) => ({ time: candle.time, value: values[index + period - 1] }));
}

// Harga live menggeser candle yang sedang berjalan. Harga yang datang setelah
// candle itu tutup diabaikan sampai data candle berikutnya dimuat.
export function applyLivePrice(candles, price, { nowSeconds, timeframe }) {
    const live = toNumber(price);
    const last = candles?.at?.(-1);
    if (live === null || !last) return candles;
    const span = TIMEFRAME_SECONDS[timeframe];
    if (span && nowSeconds >= last.time + span) return candles;
    if (live === last.close && live <= last.high && live >= last.low) return candles;
    return [...candles.slice(0, -1), { ...last, close: live, high: Math.max(last.high, live), low: Math.min(last.low, live) }];
}

export function describeTimeframeTrend({ emaFast, emaSlow, timeframe }) {
    const fast = toNumber(emaFast);
    const slow = toNumber(emaSlow);
    if (fast === null || slow === null) return `Data ${timeframe} belum cukup untuk membaca tren.`;
    const direction = fast > slow ? "naik (EMA 21 di atas EMA 50)" : fast < slow ? "turun (EMA 21 di bawah EMA 50)" : "datar (EMA 21 menempel EMA 50)";
    return `Di ${timeframe} tren ${direction}, jadi bias di timeframe ini bisa berbeda.`;
}

export function formatLevelsForClipboard({ pair, bias, timeframe, levels, formatPrice }) {
    const rows = levels.map((level) => (level.kind === "zone"
        ? `${level.label} ${formatPrice(level.low)}–${formatPrice(level.high)}`
        : `${level.label} ${formatPrice(level.price)}`));
    return [`${pair} ${String(bias || "").toUpperCase()} ${timeframe}`, ...rows].join("\n");
}
