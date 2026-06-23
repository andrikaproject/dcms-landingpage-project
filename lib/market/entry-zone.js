const NEAR_EDGE_THRESHOLD_PCT = 0.003; // 0.3%
const ATR_FAVORABLE_MULT = 0.5;
const ATR_COUNTER_MULT = 0.3;
const SR_BUFFER = 0.005; // 0.5% buffer from S/R level

/**
 * Determines the zone status relative to current price.
 *
 * For LONG:
 *   - expired  = price > zoneHigh  (missed the entry — price ran up)
 *   - missed   = price < zoneLow   (setup invalidated — price dropped)
 *   - near-edge = price within 0.3% of zoneHigh (about to expire)
 *
 * For SHORT:
 *   - expired  = price < zoneLow   (missed the entry — price dropped fast)
 *   - missed   = price > zoneHigh  (setup invalidated — price ran up)
 *   - near-edge = price within 0.3% of zoneLow (about to expire)
 */
function getZoneStatus(bias, price, low, high) {
    if (bias === "long") {
        if (price > high) return "expired";
        if (price < low)  return "missed";
        const nearEdgeFloor = high * (1 - NEAR_EDGE_THRESHOLD_PCT);
        if (price >= nearEdgeFloor) return "near-edge";
        return "valid";
    }

    if (bias === "short") {
        if (price < low)  return "expired";
        if (price > high) return "missed";
        const nearEdgeCeil = low * (1 + NEAR_EDGE_THRESHOLD_PCT);
        if (price <= nearEdgeCeil) return "near-edge";
        return "valid";
    }

    return null;
}

/**
 * Calculates the entry zone for a given signal.
 *
 * @param {object} params
 * @param {"long"|"short"|"neutral"} params.bias
 * @param {number} params.entry       - Reference entry price (closes[n-2])
 * @param {number} params.atr         - 14-period ATR
 * @param {number} params.support     - Min low from last 30 candles
 * @param {number} params.resistance  - Max high from last 30 candles
 * @param {number} params.price       - Current price (for status evaluation)
 *
 * @returns {{ low: number, high: number, mid: number, status: string } | null}
 */
export function calculateEntryZone({ bias, entry, atr, support, resistance, price }) {
    if (bias === "neutral") return null;
    if (!atr || atr <= 0) return null;

    const hasSR = support > 0 && resistance > 0 && Number.isFinite(support) && Number.isFinite(resistance);

    let low, high;

    if (bias === "long") {
        const rawHigh = entry + atr * ATR_FAVORABLE_MULT;
        const rawLow  = entry - atr * ATR_COUNTER_MULT;
        high = hasSR ? Math.min(rawHigh, resistance * (1 - SR_BUFFER)) : rawHigh;
        low  = hasSR ? Math.max(rawLow,  support  * (1 + SR_BUFFER))  : rawLow;
    } else {
        const rawLow  = entry - atr * ATR_FAVORABLE_MULT;
        const rawHigh = entry + atr * ATR_COUNTER_MULT;
        low  = hasSR ? Math.max(rawLow,  support  * (1 + SR_BUFFER))  : rawLow;
        high = hasSR ? Math.min(rawHigh, resistance * (1 - SR_BUFFER)) : rawHigh;
    }

    if (high <= low) {
        return { low, high, mid: (high + low) / 2, status: "invalid" };
    }

    const mid = (high + low) / 2;
    const status = getZoneStatus(bias, price, low, high);

    return { low, high, mid, status };
}
