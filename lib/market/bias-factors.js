// Ringkasan faktor untuk panel Hasil Analisis. Bias tetap ditentukan engine
// backend (`score`); faktor di sini adalah bacaan pendukung dari data yang sama,
// jadi bisa saja tidak semuanya searah dengan bias.

export const VERDICT = { LONG: "long", SHORT: "short", NEUTRAL: "neutral" };

// Ambang momentum mengikuti engine backend (RSI > 55 long, < 45 short).
const RSI_LONG = 55;
const RSI_SHORT = 45;
const VOLUME_SURGE_RATIO = 1.2;
// Funding dari Bitunix dalam persen per interval. 0.01% adalah tarif dasar.
const FUNDING_LONGS_CROWDED = 0.02;
const FUNDING_SHORTS_CROWDED = -0.01;
// Skor engine: EMA ±2, RSI ±1, dominance USDT ±2.
const SCORE_RANGE = 5;

function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function missing(key, label) {
    return { key, label, verdict: null, detail: "Data belum tersedia" };
}

function trendFactor(signal) {
    const fast = toNumber(signal.emaFast);
    const slow = toNumber(signal.emaSlow);
    if (fast === null || slow === null) return missing("trend", "Trend");

    const fastLabel = `EMA ${signal.fastPeriod || 9}`;
    const slowLabel = `EMA ${signal.slowPeriod || 21}`;
    if (fast > slow) return { key: "trend", label: "Trend", verdict: VERDICT.LONG, detail: `${fastLabel} di atas ${slowLabel}` };
    if (fast < slow) return { key: "trend", label: "Trend", verdict: VERDICT.SHORT, detail: `${fastLabel} di bawah ${slowLabel}` };
    return { key: "trend", label: "Trend", verdict: VERDICT.NEUTRAL, detail: `${fastLabel} menempel ${slowLabel}` };
}

function momentumFactor(signal) {
    const rsi = toNumber(signal.rsi);
    if (rsi === null) return missing("momentum", "Momentum");

    const stoch = toNumber(signal.stochK);
    const reading = `RSI ${Math.round(rsi)}${stoch === null ? "" : `, Stoch ${stoch.toFixed(1)}`}`;
    if (rsi > RSI_LONG) return { key: "momentum", label: "Momentum", verdict: VERDICT.LONG, detail: `${reading}: dorongan beli menguat` };
    if (rsi < RSI_SHORT) return { key: "momentum", label: "Momentum", verdict: VERDICT.SHORT, detail: `${reading}: tekanan jual mendominasi` };
    return { key: "momentum", label: "Momentum", verdict: VERDICT.NEUTRAL, detail: `${reading}: belum ada dorongan kuat` };
}

function structureFactor(signal, formatPrice) {
    const structure = signal.structure;
    if (!structure?.trend) return missing("structure", "Struktur harga");

    if (structure.trend === "up") {
        return { key: "structure", label: "Struktur harga", verdict: VERDICT.LONG, detail: `Higher high dan higher low di atas ${formatPrice(structure.recentLow)}` };
    }
    if (structure.trend === "down") {
        return { key: "structure", label: "Struktur harga", verdict: VERDICT.SHORT, detail: `Lower high dan lower low di bawah ${formatPrice(structure.recentHigh)}` };
    }
    return {
        key: "structure",
        label: "Struktur harga",
        verdict: VERDICT.NEUTRAL,
        detail: `Masih bergerak di range ${formatPrice(structure.recentLow)}–${formatPrice(structure.recentHigh)}`,
    };
}

function volumeFactor(signal) {
    const ratio = toNumber(signal.volumeRatio);
    if (ratio === null) return missing("volume", "Volume");

    const reading = `${ratio.toFixed(1)}× rata-rata 20 candle terakhir`;
    if (ratio >= VOLUME_SURGE_RATIO && signal.lastCandleDirection === "up") {
        return { key: "volume", label: "Volume", verdict: VERDICT.LONG, detail: `${reading}, candle naik` };
    }
    if (ratio >= VOLUME_SURGE_RATIO && signal.lastCandleDirection === "down") {
        return { key: "volume", label: "Volume", verdict: VERDICT.SHORT, detail: `${reading}, candle turun` };
    }
    return { key: "volume", label: "Volume", verdict: VERDICT.NEUTRAL, detail: `${reading}, belum ada lonjakan searah` };
}

export function formatFundingRate(rate) {
    const sign = rate > 0 ? "+" : rate < 0 ? "−" : "";
    return `${sign}${Math.abs(rate).toFixed(3)}%`;
}

// Funding dibaca berlawanan arah: long yang terlalu ramai rawan dilikuidasi turun.
function fundingFactor(signal) {
    const rate = toNumber(signal.fundingRate);
    if (rate === null) return missing("funding", "Funding rate");

    const reading = formatFundingRate(rate);
    if (rate >= FUNDING_LONGS_CROWDED) return { key: "funding", label: "Funding rate", verdict: VERDICT.SHORT, detail: `${reading}, posisi long mulai ramai` };
    if (rate <= FUNDING_SHORTS_CROWDED) return { key: "funding", label: "Funding rate", verdict: VERDICT.LONG, detail: `${reading}, posisi short mulai ramai` };
    return { key: "funding", label: "Funding rate", verdict: VERDICT.NEUTRAL, detail: `${reading}, posisi masih seimbang` };
}

export function buildBiasFactors(signal, { formatPrice = (value) => String(value) } = {}) {
    if (!signal) return [];
    return [
        trendFactor(signal),
        momentumFactor(signal),
        structureFactor(signal, formatPrice),
        volumeFactor(signal),
        fundingFactor(signal),
    ];
}

export function summarizeFactors(factors, bias) {
    const available = factors.filter((factor) => factor.verdict !== null);
    const count = (verdict) => available.filter((factor) => factor.verdict === verdict).length;
    const long = count(VERDICT.LONG);
    const short = count(VERDICT.SHORT);
    const neutral = count(VERDICT.NEUTRAL);
    const direction = String(bias || "").toLowerCase();
    const isDirectional = direction === VERDICT.LONG || direction === VERDICT.SHORT;
    const supporting = isDirectional ? count(direction) : 0;

    return {
        long,
        short,
        neutral,
        total: factors.length,
        available: available.length,
        supporting,
        // Keyakinan hanya berarti untuk bias berarah dan bila ada faktor terbaca.
        confidence: isDirectional && available.length ? Math.round((supporting / available.length) * 100) : null,
    };
}

// Posisi jarum gauge dari skor engine, -1 (short penuh) sampai 1 (long penuh).
export function gaugePosition(score) {
    const value = toNumber(score);
    if (value === null) return 0;
    return Math.max(-1, Math.min(1, value / SCORE_RANGE));
}
