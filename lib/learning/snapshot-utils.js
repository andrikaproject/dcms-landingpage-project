const CEX_LEARNING_SOURCES = new Set(["BITUNIX", "BYBIT"]);

export function isLearningSignal(signal) {
    const closeTime = Number(signal?.candleCloseTime);
    return signal?.marketType === "CEX"
        && signal?.indicatorAvailable !== false
        && CEX_LEARNING_SOURCES.has(String(signal?.source || "").toUpperCase())
        && Boolean(signal?.engineVersion)
        && Number.isFinite(closeTime)
        && closeTime > 0;
}
