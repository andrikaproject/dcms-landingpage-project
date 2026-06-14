export const BINANCE_ENDPOINTS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
];

export const intervalMap = {
    "1m": "1m",
    "15m": "15m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
};

const bybitIntervalMap = {
    "1m": "1",
    "15m": "15",
    "1h": "60",
    "4h": "240",
    "1d": "D",
};

const intervalDurationMs = {
    "1m": 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
};

export function marketFetchOptions(forceRefresh = false, revalidate = 60) {
    return forceRefresh ? { cache: "no-store" } : { next: { revalidate } };
}

export async function binanceFetch(path, forceRefresh = false) {
    let lastError;

    for (const baseUrl of BINANCE_ENDPOINTS) {
        try {
            const response = await fetch(`${baseUrl}${path}`, marketFetchOptions(forceRefresh, 60));

            if (response.ok) return response.json();
            lastError = new Error(`Binance responded ${response.status}`);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Binance fetch failed");
}

function getIntervalDuration(timeframe) {
    return intervalDurationMs[timeframe] || intervalDurationMs["15m"];
}

function normalizeBinanceKlines(klines) {
    const now = Date.now();

    return klines.map((kline) => {
        const closeTime = Number(kline[6]);

        return {
            openTime: Number(kline[0]),
            closeTime,
            open: Number(kline[1]),
            high: Number(kline[2]),
            low: Number(kline[3]),
            close: Number(kline[4]),
            volume: Number(kline[5]),
            isClosed: Number.isFinite(closeTime) && closeTime <= now,
        };
    });
}

function normalizeBybitKlines(klines, timeframe) {
    const now = Date.now();
    const duration = getIntervalDuration(timeframe);

    return klines.map((kline) => {
        const openTime = Number(kline[0]);
        const closeTime = openTime + duration - 1;

        return {
            openTime,
            closeTime,
            open: Number(kline[1]),
            high: Number(kline[2]),
            low: Number(kline[3]),
            close: Number(kline[4]),
            volume: Number(kline[5]),
            isClosed: Number.isFinite(closeTime) && closeTime <= now,
        };
    });
}

export async function fetchBinanceSignalMarketData({ symbol, timeframe, forceRefresh = false }) {
    const [klines, ticker] = await Promise.all([
        binanceFetch(`/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`, forceRefresh),
        binanceFetch(`/api/v3/ticker/24hr?symbol=${symbol}`, forceRefresh),
    ]);

    if (!Array.isArray(klines) || klines.length === 0) {
        throw new Error("Symbol not found on Binance");
    }

    return {
        symbol,
        timeframe,
        source: "BINANCE",
        candles: normalizeBinanceKlines(klines),
        ticker: {
            change: Number(ticker.priceChangePercent),
            volume24h: Number(ticker.quoteVolume),
        },
    };
}

export async function fetchBybitSignalMarketData({ symbol, timeframe, forceRefresh = false }) {
    const bybitTimeframe = bybitIntervalMap[timeframe] || "15";
    const [klineResponse, tickerResponse] = await Promise.all([
        fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitTimeframe}&limit=100`, marketFetchOptions(forceRefresh, 60)),
        fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`, marketFetchOptions(forceRefresh, 60)),
    ]);

    if (!klineResponse.ok || !tickerResponse.ok) {
        throw new Error("Bybit fetch failed");
    }

    const [klineData, tickerData] = await Promise.all([klineResponse.json(), tickerResponse.json()]);
    const rawKlines = klineData?.result?.list;
    const ticker = tickerData?.result?.list?.[0];

    if (klineData.retCode !== 0 || !Array.isArray(rawKlines) || rawKlines.length === 0 || !ticker) {
        throw new Error("Symbol not found on Bybit");
    }

    return {
        symbol,
        timeframe,
        source: "BYBIT",
        candles: normalizeBybitKlines([...rawKlines].reverse(), timeframe),
        ticker: {
            change: Number(ticker.price24hPcnt) * 100,
            volume24h: Number(ticker.turnover24h),
        },
    };
}

export async function fetchBinanceCandlesSince({ symbol, timeframe, sinceMs, limit = 500 }) {
    const interval = intervalMap[timeframe] || timeframe;
    const klines = await binanceFetch(
        `/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${sinceMs}&limit=${limit}`,
        true
    );
    if (!Array.isArray(klines)) return [];
    return klines.map((k) => ({
        openTime: Number(k[0]),
        closeTime: Number(k[6]),
        high: Number(k[2]),
        low: Number(k[3]),
    }));
}

export async function fetchBybitCandlesSince({ symbol, timeframe, sinceMs, limit = 200 }) {
    const bybitInterval = bybitIntervalMap[timeframe] || "15";
    const duration = getIntervalDuration(timeframe);
    const response = await fetch(
        `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitInterval}&start=${sinceMs}&limit=${limit}`,
        { cache: "no-store" }
    );
    if (!response.ok) throw new Error(`Bybit candle history fetch failed: ${response.status}`);
    const data = await response.json();
    const rawList = data?.result?.list;
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    return [...rawList].reverse().map((k) => ({
        openTime: Number(k[0]),
        closeTime: Number(k[0]) + duration - 1,
        high: Number(k[2]),
        low: Number(k[3]),
    }));
}

export async function fetchDexSignal({ symbol, timeframe = "15m", forceRefresh = false }) {
    const cleanSymbol = symbol.replace("USDT", "");
    const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(cleanSymbol)}`, {
        ...marketFetchOptions(forceRefresh, 60),
    });

    if (!response.ok) throw new Error("Dexscreener fetch failed");

    const data = await response.json();
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    const validPairs = pairs
        .filter((pair) => Number(pair.liquidity?.usd || 0) > 0 && Number(pair.priceUsd || 0) > 0)
        .sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0));
    const pair = validPairs[0];

    if (!pair) throw new Error("Symbol not found on Dexscreener");

    return {
        symbol,
        timeframe,
        base: pair.baseToken?.symbol || cleanSymbol,
        price: Number(pair.priceUsd),
        change: Number(pair.priceChange?.h24 || 0),
        volume24h: Number(pair.volume?.h24 || 0),
        liquidityUsd: Number(pair.liquidity?.usd || 0),
        source: "DEXSCREENER",
        marketType: "DEX",
        indicatorAvailable: false,
        engineVersion: null,
        candleOpenTime: null,
        candleCloseTime: null,
        isClosedCandle: false,
        tradePlanValidForConservative: false,
        bias: "neutral",
        score: 0,
        entry: Number(pair.priceUsd),
        tp1: null,
        tp2: null,
        tp: null,
        sl: null,
        atr: null,
        riskPercent: null,
        rewardPercent: null,
        riskReward: null,
        tp1RiskReward: null,
        sinceEntryPercent: Number(pair.priceChange?.h24 || 0),
        progressPercent: 25,
        chainId: pair.chainId,
        dexId: pair.dexId,
        pairAddress: pair.pairAddress,
        warning: "Technical indicators unavailable for DEX tokens",
    };
}
