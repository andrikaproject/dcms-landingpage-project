export const STATUS_LABELS = {
    LONG_VALID: "Setup Long Valid",
    SHORT_VALID: "Setup Short Valid",
    NOT_READY: "Tidak Siap",
};

export const GATE_NAMES = {
    DIRECTION: "direction",
    ENTRY_SAFETY: "entry_safety",
    RISK: "risk",
    MARKET_CONTEXT: "market_context",
};

export const REASONS = {
    // Pre-check
    NEUTRAL_BIAS: "Bias sinyal neutral — tidak ada arah yang bisa divalidasi",
    INDICATORS_UNAVAILABLE: "Indikator teknikal tidak tersedia untuk aset ini",

    // Direction Gate — Long
    LONG_PRICE_BELOW_EMA_FAST: "Harga berada di bawah EMA fast — konfirmasi bullish belum ada",
    LONG_EMA_BEARISH: "EMA alignment masih bearish — EMA fast di bawah EMA slow",
    LONG_STOCH_OVERBOUGHT_DECLINING: "Stoch RSI overbought dan melemah — momentum bullish tidak ada",
    LONG_TRENDLINE_BEARISH: "Trendline bearish — berlawanan dengan bias long",

    // Direction Gate — Short
    SHORT_PRICE_ABOVE_EMA_FAST: "Harga berada di atas EMA fast — konfirmasi bearish belum ada",
    SHORT_EMA_BULLISH: "EMA alignment masih bullish — EMA fast di atas EMA slow",
    SHORT_STOCH_OVERSOLD_RECOVERING: "Stoch RSI oversold dan menguat — momentum bearish tidak ada",
    SHORT_TRENDLINE_BULLISH: "Trendline bullish — berlawanan dengan bias short",

    // Entry Safety Gate
    ENTRY_TOO_FAR: "Harga sudah terlalu jauh dari level entry",
    ENTRY_PROGRESS_TOO_HIGH: "Harga sudah terlalu maju ke TP1 — potensi keuntungan tersisa terlalu kecil",
    PRICE_TOO_CLOSE_TO_SL: "Harga terlalu dekat dengan Stop Loss — risiko stop-out langsung tinggi",
    LONG_RESISTANCE_TOO_CLOSE: "Resistance terlalu dekat di atas entry — entry bisa langsung terbentur",
    SHORT_SUPPORT_TOO_CLOSE: "Support terlalu dekat di bawah entry — entry bisa langsung terbentur",

    // Risk Gate
    SL_TP1_INVALID_LONG: "SL dan TP1 tidak valid untuk bias long (SL harus di bawah entry, TP1 di atas)",
    SL_TP1_INVALID_SHORT: "SL dan TP1 tidak valid untuk bias short (SL harus di atas entry, TP1 di bawah)",
    TP1_RR_TOO_LOW: "TP1 Risk/Reward terlalu rendah — setup tidak layak secara risk management",
    RISK_PERCENT_TOO_HIGH: "Risk percent terlalu besar untuk timeframe ini",
    ATR_EXTREME: "Volatilitas ekstrem — ATR melebihi 5% dari harga",

    // Market Context Gate
    USDT_DOM_OVERBOUGHT_LONG: "USDT Dominance overbought — pasar sedang risk-off, tidak kondusif untuk long",
    USDT_DOM_OVERSOLD_SHORT: "USDT Dominance oversold — pasar sedang risk-on, tidak kondusif untuk short",
    LONG_PRICE_BELOW_POC: "Harga di bawah POC — level value area tidak mendukung long",
    SHORT_PRICE_ABOVE_POC: "Harga di atas POC — level value area tidak mendukung short",
};

export const WARNINGS = {
    USDT_DOM_RISING_LONG: "USDT Dominance sedang naik — pasar dalam kondisi waspada untuk long",
    USDT_DOM_FALLING_SHORT: "USDT Dominance sedang turun — pasar dalam kondisi kurang mendukung short",
    OPEN_CANDLE: "Candle saat ini belum tertutup — sinyal bisa berubah",
};

export function buildStatusLabel(result) {
    return STATUS_LABELS[result] ?? STATUS_LABELS.NOT_READY;
}
