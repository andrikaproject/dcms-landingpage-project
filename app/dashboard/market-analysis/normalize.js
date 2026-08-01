// Client-side symbol normalizer mirroring lib/market/signal-generator normalizeSymbol.
export function normalizeInput(value) {
    const clean = String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) return null;
    return clean.endsWith("USDT") ? clean : `${clean}USDT`;
}
