const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayStart(timestamp) {
    return Math.floor(timestamp / DAY_MS) * DAY_MS;
}

function utcWeekStart(timestamp) {
    const dayStart = utcDayStart(timestamp);
    const dayOfWeek = new Date(dayStart).getUTCDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
    return dayStart - daysFromMonday * DAY_MS;
}

/**
 * PWH/PWL from the previous completed UTC calendar week.
 * Window: Monday 00:00 UTC through the next Monday, exclusive.
 */
export function computeUtcWeeklyLevels(dailyCandles, now = Date.now()) {
    if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) return null;

    const currentWeekStart = utcWeekStart(now);
    const previousWeekStart = currentWeekStart - 7 * DAY_MS;
    let high = -Infinity;
    let low = Infinity;

    for (const candle of dailyCandles) {
        if (
            !candle ||
            !Number.isFinite(candle.openTime) ||
            !Number.isFinite(candle.high) ||
            !Number.isFinite(candle.low) ||
            candle.openTime < previousWeekStart ||
            candle.openTime >= currentWeekStart
        ) {
            continue;
        }
        high = Math.max(high, candle.high);
        low = Math.min(low, candle.low);
    }

    if (high === -Infinity || low === Infinity) return null;
    return { pwh: high, pwl: low };
}
