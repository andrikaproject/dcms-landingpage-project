// Timeframe yang dilayani GET /market/signals/:symbol.
export const ANALYSIS_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];
export const DEFAULT_ANALYSIS_TIMEFRAME = "5m";
const LAST_TIMEFRAME_KEY = "dcms-analysis-timeframe";

export function readLastTimeframe() {
    try {
        const stored = window.localStorage.getItem(LAST_TIMEFRAME_KEY);
        return ANALYSIS_TIMEFRAMES.includes(stored) ? stored : DEFAULT_ANALYSIS_TIMEFRAME;
    } catch {
        return DEFAULT_ANALYSIS_TIMEFRAME;
    }
}

export function rememberTimeframe(timeframe) {
    try {
        window.localStorage.setItem(LAST_TIMEFRAME_KEY, timeframe);
    } catch {
        // Gagal menyimpan preferensi tidak menghalangi analisis.
    }
}
