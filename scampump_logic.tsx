export type ScamPumpCandle = {
    open: number;
    high?: number;
    low?: number;
    close: number;
    volume: number;
};

export const SCAM_PUMP_PERIOD = 20;
export const SCAM_PUMP_VOLUME_MULTIPLIER = 5.0;
export const SCAM_PUMP_PRICE_THRESHOLD_PCT = 4.0;

// Compatibility state for a single live candle stream. Backend multi-coin scans should use analyzeScamPumpWindow.
let volumeHistory: number[] = [];

function toFiniteNumber(value: unknown, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getAverageVolume(history: number[]) {
    if (history.length === 0) return 0;
    return history.reduce((total, volume) => total + volume, 0) / history.length;
}

export function getScamPumpScore(priceChangePct: number, volumeRatio: number) {
    return Math.max(0, priceChangePct) * Math.max(0, volumeRatio);
}

export function evaluateScamPumpCandle(currentCandle: ScamPumpCandle, volumeHistoryWindow: number[]) {
    const open = toFiniteNumber(currentCandle.open);
    const close = toFiniteNumber(currentCandle.close);
    const volume = toFiniteNumber(currentCandle.volume);
    const avgVolume = getAverageVolume(volumeHistoryWindow);
    const priceChangePct = open > 0 ? ((close - open) / open) * 100 : 0;
    const volumeRatio = avgVolume > 0 ? volume / avgVolume : 0;
    const isVolumeSpike = volumeRatio >= SCAM_PUMP_VOLUME_MULTIPLIER;
    const isPriceSurging = priceChangePct >= SCAM_PUMP_PRICE_THRESHOLD_PCT;
    const isPump = isVolumeSpike && isPriceSurging;

    return {
        isPump,
        reason: isPump
            ? "Potensi scam pump: volume spike dan candle 1m naik signifikan."
            : "Belum memenuhi threshold scam pump.",
        priceChangePct,
        priceChange: `${priceChangePct.toFixed(2)}%`,
        volumeRatio,
        volumeRatioLabel: `${volumeRatio.toFixed(1)}x`,
        avgVolume,
        volume,
        score: getScamPumpScore(priceChangePct, volumeRatio),
    };
}

export function analyzeScamPumpWindow(candles: ScamPumpCandle[], period = SCAM_PUMP_PERIOD) {
    const validCandles = candles
        .map((candle) => ({
            open: toFiniteNumber(candle.open),
            high: toFiniteNumber(candle.high),
            low: toFiniteNumber(candle.low),
            close: toFiniteNumber(candle.close),
            volume: toFiniteNumber(candle.volume),
        }))
        .filter((candle) => candle.open > 0 && candle.close > 0 && candle.volume >= 0);

    if (validCandles.length <= period) {
        return {
            isPump: false,
            reason: "Mengumpulkan data awal.",
            priceChangePct: 0,
            priceChange: "0.00%",
            volumeRatio: 0,
            volumeRatioLabel: "0.0x",
            avgVolume: 0,
            volume: 0,
            score: 0,
        };
    }

    const currentCandle = validCandles[validCandles.length - 1];
    const historyWindow = validCandles
        .slice(Math.max(0, validCandles.length - period - 1), validCandles.length - 1)
        .map((candle) => candle.volume);

    return evaluateScamPumpCandle(currentCandle, historyWindow);
}

/**
 * Fungsi ini dipanggil setiap ada candle 1 menit yang baru selesai.
 * Untuk analisis backend banyak coin, gunakan analyzeScamPumpWindow agar history tiap coin tidak bercampur.
 */
export function checkScampumpLogic(currentCandle: ScamPumpCandle) {
    if (volumeHistory.length < SCAM_PUMP_PERIOD) {
        volumeHistory.push(toFiniteNumber(currentCandle.volume));
        return { isPump: false, reason: "Mengumpulkan data awal." };
    }

    const detectionResult = evaluateScamPumpCandle(currentCandle, volumeHistory);

    volumeHistory = [...volumeHistory.slice(1), toFiniteNumber(currentCandle.volume)];

    return detectionResult;
}
