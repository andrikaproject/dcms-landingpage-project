export const MAX_LIVE_PRICE_SYMBOLS = 8;
export const LIVE_PRICE_POLL_INTERVAL_MS = 10_000;

export function symbolsForLivePrices(pairs, limit = MAX_LIVE_PRICE_SYMBOLS) {
    return [...new Set(
        (Array.isArray(pairs) ? pairs : [])
            .map((pair) => String(pair?.symbol || "").trim().toUpperCase())
            .filter(Boolean)
    )].slice(0, limit);
}

export function livePricesBySymbol(items) {
    return Object.fromEntries(
        (Array.isArray(items) ? items : [])
            .filter((item) => item?.symbol && typeof item.lastPrice === "string" && Number(item.lastPrice) > 0)
            .map((item) => [String(item.symbol).toUpperCase(), item.lastPrice])
    );
}
