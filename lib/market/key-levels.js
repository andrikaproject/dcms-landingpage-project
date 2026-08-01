import {
    bitunixFetch,
    fetchBitunixCandles,
    fetchBitunixCandlesSince,
} from "@/lib/market/exchange-fetchers";
import { normalizeSymbol } from "@/lib/market/signal-generator";
import { computeUtcWeeklyLevels } from "@/lib/market/utc-weekly-levels";

export { computeUtcWeeklyLevels } from "@/lib/market/utc-weekly-levels";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Near-level threshold in percent (PRD default 0.35%).
export const NEAR_THRESHOLD_PERCENT = 0.35;

// Fixed UTC session windows [startHour, endHour). MVP: no DST handling.
export const SESSION_WINDOWS = {
    asia: [0, 8],
    london: [7, 16],
    "new-york": [13, 22],
};

const LEVEL_LABELS = {
    do: "DO",
    pdh: "PDH",
    pdl: "PDL",
    pdm: "PDM",
    wo: "WO",
    pwh: "PWH",
    pwl: "PWL",
    pwm: "PWM",
};

const CONTEXT_LEVEL_KEYS = ["pdh", "pdl", "pwh", "pwl"];

const SESSION_LABELS = {
    asia: "Session: Asia",
    london: "Session: London",
    "new-york": "Session: New York",
};

function utcDayStart(ts) {
    return Math.floor(ts / DAY_MS) * DAY_MS;
}

// Monday 00:00 UTC of the week containing ts.
function utcWeekStart(ts) {
    const dayStart = utcDayStart(ts);
    const dow = new Date(dayStart).getUTCDay(); // 0=Sun..6=Sat
    const daysFromMonday = (dow + 6) % 7;
    return dayStart - daysFromMonday * DAY_MS;
}

function isFiniteCandle(c) {
    return c && Number.isFinite(c.high) && Number.isFinite(c.low);
}

function highLow(candles) {
    let high = -Infinity;
    let low = Infinity;
    for (const c of candles) {
        if (!isFiniteCandle(c)) continue;
        if (c.high > high) high = c.high;
        if (c.low < low) low = c.low;
    }
    if (high === -Infinity || low === Infinity) return null;
    return { high, low };
}

/**
 * PDH/PDL from the previous completed UTC daily candle.
 * @param {Array} dailyCandles chronological daily candles ({openTime, high, low})
 */
export function computeUtcDailyLevels(dailyCandles, now = Date.now()) {
    if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) return null;
    const todayStart = utcDayStart(now);
    const prior = dailyCandles.filter(
        (c) => isFiniteCandle(c) && utcDayStart(c.openTime) < todayStart
    );
    if (prior.length === 0) return null;
    const prev = prior.reduce((a, b) => (b.openTime > a.openTime ? b : a));
    return { pdh: prev.high, pdl: prev.low };
}

/** Current UTC daily open from the forming daily candle. */
export function computeUtcDailyOpen(dailyCandles, now = Date.now()) {
    if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) return null;
    const todayStart = utcDayStart(now);
    const current = dailyCandles
        .filter((c) => c && Number.isFinite(c.open) && utcDayStart(c.openTime) === todayStart)
        .sort((a, b) => a.openTime - b.openTime)[0];
    return current?.open ?? null;
}

/** Current UTC weekly open from the first daily candle of this week. */
export function computeUtcWeeklyOpen(dailyCandles, now = Date.now()) {
    if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) return null;
    const currentWeekStart = utcWeekStart(now);
    const current = dailyCandles
        .filter(
            (c) =>
                c &&
                Number.isFinite(c.open) &&
                c.openTime >= currentWeekStart &&
                c.openTime < now
        )
        .sort((a, b) => a.openTime - b.openTime)[0];
    return current?.open ?? null;
}

function candlesInWindow(candles, start, end) {
    return candles.filter(
        (c) => isFiniteCandle(c) && c.openTime >= start && c.openTime < end
    );
}

/**
 * Session PDH/PDL from the most recent fully-completed session window before `now`.
 * @param {Array} intradayCandles chronological intraday candles
 * @param {string} sessionKey asia|london|new-york
 */
export function computeSessionDailyLevels(intradayCandles, sessionKey, now = Date.now()) {
    const window = SESSION_WINDOWS[sessionKey];
    if (!window || !Array.isArray(intradayCandles) || intradayCandles.length === 0) return null;
    const [startH, endH] = window;
    // Walk back day by day until we find a window fully in the past with data.
    let dayStart = utcDayStart(now);
    for (let i = 0; i < 8; i += 1) {
        const winStart = dayStart + startH * HOUR_MS;
        const winEnd = dayStart + endH * HOUR_MS;
        if (winEnd <= now) {
            const hl = highLow(candlesInWindow(intradayCandles, winStart, winEnd));
            if (hl) return { pdh: hl.high, pdl: hl.low };
        }
        dayStart -= DAY_MS;
    }
    return null;
}

/**
 * Session PWH/PWL across the selected session windows in the previous completed UTC week.
 */
export function computeSessionWeeklyLevels(intradayCandles, sessionKey, now = Date.now()) {
    const window = SESSION_WINDOWS[sessionKey];
    if (!window || !Array.isArray(intradayCandles) || intradayCandles.length === 0) return null;
    const [startH, endH] = window;
    const currentWeekStart = utcWeekStart(now);
    const prevWeekStart = currentWeekStart - 7 * DAY_MS;
    const collected = [];
    for (let d = 0; d < 7; d += 1) {
        const dayStart = prevWeekStart + d * DAY_MS;
        const winStart = dayStart + startH * HOUR_MS;
        const winEnd = dayStart + endH * HOUR_MS;
        collected.push(...candlesInWindow(intradayCandles, winStart, winEnd));
    }
    const hl = highLow(collected);
    if (!hl) return null;
    return { pwh: hl.high, pwl: hl.low };
}

/** Signed distance percent from current price to a level. */
export function distancePercent(currentPrice, levelPrice) {
    if (!Number.isFinite(currentPrice) || !Number.isFinite(levelPrice) || levelPrice === 0) {
        return null;
    }
    return ((currentPrice - levelPrice) / levelPrice) * 100;
}

/** Signed distances for each present level. */
export function computeDistances(currentPrice, levels) {
    const out = {};
    for (const key of ["do", "pdh", "pdl", "pdm", "wo", "pwh", "pwl", "pwm"]) {
        if (levels && Number.isFinite(levels[key])) {
            out[key] = distancePercent(currentPrice, levels[key]);
        }
    }
    return out;
}

/** Nearest level key by absolute percentage distance. */
export function findNearestLevel(distances) {
    return findNearestLevelFromKeys(distances, Object.keys(distances || {}));
}

function findNearestLevelFromKeys(distances, keys) {
    let best = null;
    let bestAbs = Infinity;
    for (const key of keys) {
        const d = distances[key];
        if (!Number.isFinite(d)) continue;
        const abs = Math.abs(d);
        if (abs < bestAbs) {
            bestAbs = abs;
            best = key;
        }
    }
    return best;
}

/**
 * Descriptive alert state. Near-level wins within threshold, then breakouts, then range.
 */
export function selectAlertState(currentPrice, levels, distances, threshold = NEAR_THRESHOLD_PERCENT) {
    if (!levels || !Number.isFinite(currentPrice)) return null;
    const nearest = findNearestLevelFromKeys(distances, CONTEXT_LEVEL_KEYS);
    if (nearest && Math.abs(distances[nearest]) <= threshold) {
        return `Dekat ${LEVEL_LABELS[nearest]}`;
    }
    const { pdh, pdl, pwh, pwl } = levels;
    if (Number.isFinite(pwh) && currentPrice > pwh) return "Di Atas PWH";
    if (Number.isFinite(pwl) && currentPrice < pwl) return "Di Bawah PWL";
    if (Number.isFinite(pdh) && currentPrice > pdh) return "Di Atas PDH";
    if (Number.isFinite(pdl) && currentPrice < pdl) return "Di Bawah PDL";
    if (Number.isFinite(pdh) && Number.isFinite(pdl) && currentPrice <= pdh && currentPrice >= pdl) {
        return "Di Dalam Range Harian";
    }
    return "Di Dalam Range Mingguan";
}

/** Weekly range position for the insight panel. */
export function computeRangeState(currentPrice, levels) {
    if (!levels || !Number.isFinite(currentPrice)) return null;
    const { pwh, pwl } = levels;
    if (Number.isFinite(pwh) && currentPrice > pwh) return "Di atas range mingguan";
    if (Number.isFinite(pwl) && currentPrice < pwl) return "Di bawah range mingguan";
    return "Di dalam range mingguan";
}

export function basisLabel(basis, sessionKey) {
    if (basis === "session") return SESSION_LABELS[sessionKey] || "Session";
    return "UTC Exchange";
}

/**
 * Compute the full level set for a basis from already-fetched candles.
 * Pure so it can be unit tested without network.
 */
export function computeLevels({ basis, session, dailyCandles, intradayCandles, now = Date.now() }) {
    if (basis === "session") {
        const daily = computeSessionDailyLevels(intradayCandles, session, now) || {};
        const weekly = computeSessionWeeklyLevels(intradayCandles, session, now) || {};
        return {
            do: computeUtcDailyOpen(dailyCandles, now),
            pdh: daily.pdh,
            pdl: daily.pdl,
            pdm: Number.isFinite(daily.pdh) && Number.isFinite(daily.pdl) ? (daily.pdh + daily.pdl) / 2 : null,
            wo: computeUtcWeeklyOpen(dailyCandles, now),
            pwh: weekly.pwh,
            pwl: weekly.pwl,
            pwm: Number.isFinite(weekly.pwh) && Number.isFinite(weekly.pwl) ? (weekly.pwh + weekly.pwl) / 2 : null,
        };
    }
    const daily = computeUtcDailyLevels(dailyCandles, now) || {};
    const weekly = computeUtcWeeklyLevels(dailyCandles, now) || {};
    return {
        do: computeUtcDailyOpen(dailyCandles, now),
        pdh: daily.pdh,
        pdl: daily.pdl,
        pdm: Number.isFinite(daily.pdh) && Number.isFinite(daily.pdl) ? (daily.pdh + daily.pdl) / 2 : null,
        wo: computeUtcWeeklyOpen(dailyCandles, now),
        pwh: weekly.pwh,
        pwl: weekly.pwl,
        pwm: Number.isFinite(weekly.pwh) && Number.isFinite(weekly.pwl) ? (weekly.pwh + weekly.pwl) / 2 : null,
    };
}

function cleanLevels(levels) {
    const out = {};
    for (const key of ["do", "pdh", "pdl", "pdm", "wo", "pwh", "pwl", "pwm"]) {
        out[key] = Number.isFinite(levels?.[key]) ? levels[key] : null;
    }
    return out;
}

async function fetchTickerPrice(symbol, forceRefresh) {
    const data = await bitunixFetch(
        `/api/v1/futures/market/tickers?symbols=${symbol}`,
        forceRefresh
    );
    const ticker = Array.isArray(data?.data) ? data.data[0] : data?.data;
    const price = Number(ticker?.lastPrice ?? 0);
    return Number.isFinite(price) && price > 0 ? price : null;
}

async function fetchChartCandles(symbol, interval, forceRefresh) {
    const data = await bitunixFetch(
        `/api/v1/futures/market/kline?symbol=${symbol}&interval=${interval}&limit=200`,
        forceRefresh
    );
    const klines = data?.data;
    if (!Array.isArray(klines) || klines.length === 0) return [];
    // Bitunix returns newest-first; reverse to chronological.
    return [...klines].reverse().map((k) => ({
        openTime: Number(k.time),
        open: Number(k.open),
        high: Number(k.high),
        low: Number(k.low),
        close: Number(k.close),
        volume: Number(k.baseVol ?? k.quoteVol ?? 0),
    }));
}

// Intraday candles for session-basis level math: two 1h pages to span the
// previous completed UTC week plus the most recent session window.
async function fetchSessionIntraday(symbol, now) {
    const currentWeekStart = utcWeekStart(now);
    const prevWeekStart = currentWeekStart - 7 * DAY_MS;
    const recentStart = now - 200 * HOUR_MS;
    const [weekPage, recentPage] = await Promise.all([
        fetchBitunixCandlesSince({ symbol, timeframe: "1h", sinceMs: prevWeekStart, limit: 200 }),
        fetchBitunixCandlesSince({ symbol, timeframe: "1h", sinceMs: recentStart, limit: 200 }),
    ]);
    const byTime = new Map();
    for (const c of [...weekPage, ...recentPage]) {
        if (Number.isFinite(c.openTime)) byTime.set(c.openTime, c);
    }
    return [...byTime.values()].sort((a, b) => a.openTime - b.openTime);
}

/**
 * Orchestrator: fetch data and build the view-ready key-levels payload.
 */
export async function getKeyLevels({
    symbol,
    basis = "utc",
    session = "new-york",
    interval = "15m",
    forceRefresh = false,
} = {}) {
    const normalizedSymbol = normalizeSymbol(symbol);
    if (!normalizedSymbol) throw new Error("Symbol is required");

    const now = Date.now();
    const useSession = basis === "session";
    const sessionKey = SESSION_WINDOWS[session] ? session : "new-york";

    const [currentPrice, chartCandles, dailyCandles, intradayCandles] = await Promise.all([
        fetchTickerPrice(normalizedSymbol, forceRefresh),
        fetchChartCandles(normalizedSymbol, interval, forceRefresh),
        fetchBitunixCandles(normalizedSymbol, 40, forceRefresh),
        useSession ? fetchSessionIntraday(normalizedSymbol, now) : Promise.resolve([]),
    ]);

    if (!currentPrice && chartCandles.length === 0) {
        throw new Error("Symbol not found on Bitunix");
    }

    const price = currentPrice ?? chartCandles.at(-1)?.close ?? null;

    const levels = cleanLevels(
        computeLevels({
            basis: useSession ? "session" : "utc",
            session: sessionKey,
            dailyCandles,
            intradayCandles,
            now,
        })
    );

    const distances = computeDistances(price, levels);
    const nearestLevel = findNearestLevel(distances);
    const alertState = selectAlertState(price, levels, distances);
    const rangeState = computeRangeState(price, levels);

    return {
        symbol: normalizedSymbol,
        source: "BITUNIX",
        basis: useSession ? "session" : "utc",
        session: useSession ? sessionKey : null,
        basisLabel: basisLabel(useSession ? "session" : "utc", sessionKey),
        interval,
        currentPrice: price,
        updatedAt: new Date(now).toISOString(),
        levels,
        distances,
        nearestLevel,
        alertState,
        rangeState,
        candles: chartCandles.map((c) => ({
            time: Math.floor(c.openTime / 1000),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        })),
        volume: chartCandles.map((c) => ({
            time: Math.floor(c.openTime / 1000),
            value: c.volume,
            color: c.close >= c.open ? "rgba(183,251,91,0.35)" : "rgba(248,113,113,0.35)",
        })),
    };
}
