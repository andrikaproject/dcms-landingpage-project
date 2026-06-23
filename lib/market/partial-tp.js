const TP1_ALLOCATION = 70;
const TP2_ALLOCATION = 30;
const SL_TOO_CLOSE_ATR_MULT = 0.5;

/**
 * Validates that entry, sl, tp1, tp2 are in correct order for the given bias.
 * LONG:  sl < entry < tp1 < tp2
 * SHORT: sl > entry > tp1 > tp2
 */
function isPriceOrderValid(bias, entry, sl, tp1, tp2) {
    if (bias === "long")  return sl < entry && entry < tp1 && tp1 < tp2;
    if (bias === "short") return sl > entry && entry > tp1 && tp1 > tp2;
    return false;
}

/**
 * Builds a structured partial TP exit plan based on Phase 0 spec (70/30 split).
 *
 * @param {object} params
 * @param {"long"|"short"|"neutral"} params.bias
 * @param {number} params.entry  - Entry price
 * @param {number} params.sl     - Stop Loss price
 * @param {number} params.tp1    - First Take Profit price
 * @param {number} params.tp2    - Second Take Profit price
 * @param {number} [params.atr]  - ATR (used to detect SL_TOO_CLOSE)
 *
 * @returns {{
 *   isValid: boolean,
 *   invalidReason: string | null,
 *   warning: string | null,
 *   legs: Array<{level: string, price: number, allocationPct: number}>,
 *   moveSlToBreakevenAfter: string,
 *   breakevenSL: number
 * } | null}
 */
export function buildPartialTpPlan({ bias, entry, sl, tp1, tp2, atr }) {
    if (bias === "neutral") return null;

    if (tp1 === tp2) {
        return {
            isValid: false,
            invalidReason: "TP1_EQUALS_TP2",
            warning: null,
            legs: [
                { level: "tp1", price: tp1, allocationPct: 100 },
            ],
            moveSlToBreakevenAfter: "tp1",
            breakevenSL: entry,
        };
    }

    if (!isPriceOrderValid(bias, entry, sl, tp1, tp2)) {
        return {
            isValid: false,
            invalidReason: "PRICE_NOT_ORDERED",
            warning: null,
            legs: [],
            moveSlToBreakevenAfter: "tp1",
            breakevenSL: entry,
        };
    }

    const slDistance = Math.abs(entry - sl);
    const warning = (atr && slDistance < atr * SL_TOO_CLOSE_ATR_MULT) ? "SL_TOO_CLOSE" : null;

    return {
        isValid: true,
        invalidReason: null,
        warning,
        legs: [
            { level: "tp1", price: tp1, allocationPct: TP1_ALLOCATION },
            { level: "tp2", price: tp2, allocationPct: TP2_ALLOCATION },
        ],
        moveSlToBreakevenAfter: "tp1",
        breakevenSL: entry,
    };
}
