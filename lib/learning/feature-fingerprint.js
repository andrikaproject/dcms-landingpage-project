function comparePrice(price, reference, label) {
    const currentPrice = Number(price);
    const referencePrice = Number(reference);

    if (!Number.isFinite(currentPrice) || !Number.isFinite(referencePrice)) {
        return `${label}_unknown`;
    }

    return currentPrice >= referencePrice ? `price_above_${label}` : `price_below_${label}`;
}

function getEmaAlignment(signal) {
    const emaFast = Number(signal?.emaFast);
    const emaSlow = Number(signal?.emaSlow);

    if (!Number.isFinite(emaFast) || !Number.isFinite(emaSlow)) return "ema_unknown";
    if (emaFast > emaSlow) return "ema_bullish";
    if (emaFast < emaSlow) return "ema_bearish";
    return "ema_flat";
}

function getStochState(signal) {
    const k = Number(signal?.stochK);
    const d = Number(signal?.stochD);

    if (!Number.isFinite(k) || !Number.isFinite(d)) return "stoch_unknown";
    if (k >= 80 && d >= 80) return k >= d ? "stoch_overbought_bullish" : "stoch_overbought_bearish";
    if (k <= 20 && d <= 20) return k >= d ? "stoch_oversold_bullish" : "stoch_oversold_bearish";
    if (k > d) return "stoch_bullish";
    if (k < d) return "stoch_bearish";
    return "stoch_flat";
}

function getRiskRewardBucket(signal) {
    const riskReward = Number(signal?.tp1RiskReward ?? signal?.riskReward);

    if (!Number.isFinite(riskReward)) return "rr_unknown";
    if (riskReward < 1.2) return "rr_low";
    if (riskReward < 2) return "rr_medium";
    return "rr_high";
}

function getEntryDistanceBucket(signal) {
    const price = Number(signal?.price);
    const entry = Number(signal?.entry);

    if (!Number.isFinite(price) || !Number.isFinite(entry) || entry === 0) {
        return "entry_unknown";
    }

    const distancePercent = Math.abs(price - entry) / Math.abs(entry) * 100;

    if (distancePercent <= 0.5) return "near_entry";
    if (distancePercent <= 1.5) return "fair_distance";
    return "late_entry";
}

function getVolatilityBucket(signal) {
    const atr = Number(signal?.atr);
    const price = Number(signal?.price);

    if (!Number.isFinite(atr) || !Number.isFinite(price) || price === 0) {
        return "atr_unknown";
    }

    const atrPercent = Math.abs(atr) / Math.abs(price) * 100;

    if (atrPercent < 0.5) return "atr_low";
    if (atrPercent <= 2) return "atr_normal";
    return "atr_high";
}

function getUsdtDominanceState(signal) {
    const label = String(signal?.usdtDominanceLabel || "").trim().toLowerCase();

    if (!label || label === "unavailable") return "usdt_unknown";
    return `usdt_${label.replace(/[^a-z0-9]+/g, "_")}`;
}

function normalizeSegment(value, fallback) {
    const segment = String(value || fallback || "unknown").trim().toLowerCase();
    return segment.replace(/[^a-z0-9_]+/g, "_");
}

export function buildFeatureFingerprint(signal) {
    const priceVsPoc = comparePrice(signal?.price, signal?.poc, "poc").replace("price_above_poc", "above_poc").replace("price_below_poc", "below_poc");
    const trendline = String(signal?.trendline || "unknown").toLowerCase();

    return [
        String(signal?.symbol || "").toUpperCase(),
        signal?.timeframe || "15m",
        normalizeSegment(signal?.bias, "neutral"),
        String(signal?.source || "").toUpperCase(),
        comparePrice(signal?.price, signal?.emaFast, "ema_fast"),
        comparePrice(signal?.price, signal?.emaSlow, "ema_slow"),
        getEmaAlignment(signal),
        getStochState(signal),
        priceVsPoc,
        `trend_${normalizeSegment(trendline, "unknown")}`,
        getUsdtDominanceState(signal),
        getRiskRewardBucket(signal),
        getEntryDistanceBucket(signal),
        getVolatilityBucket(signal),
    ].join("|");
}
