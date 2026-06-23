const BITUNIX_BASE_URL = "https://fapi.bitunix.com";

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

function getIntervalDuration(timeframe) {
    return intervalDurationMs[timeframe] || intervalDurationMs["15m"];
}

export async function bitunixFetch(path, forceRefresh = false, signal = undefined) {
    const url = `${BITUNIX_BASE_URL}${path}`;
    console.log(`[BITUNIX] Fetching: ${url}`);

    const options = signal
        ? { ...marketFetchOptions(forceRefresh, 60), signal }
        : marketFetchOptions(forceRefresh, 60);
    const response = await fetch(url, options);

    if (!response.ok) {
        console.error(`[BITUNIX] HTTP Error ${response.status} — ${url}`);
        throw new Error(`Bitunix responded ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
        console.error(`[BITUNIX] API Error code=${data.code} msg="${data.msg}" — ${url}`);
        throw new Error(data.msg || "Bitunix API error");
    }

    const recordCount = Array.isArray(data.data) ? data.data.length : (data.data ? 1 : 0);
    console.log(`[BITUNIX] OK — ${url} → ${recordCount} record(s)`);

    return data;
}

function normalizeBitunixKlines(klines, timeframe) {
    const now = Date.now();
    const duration = getIntervalDuration(timeframe);

    // Bitunix returns klines newest-first, reverse to chronological order
    return [...klines].reverse().map((kline) => {
        const openTime = Number(kline.time);
        const closeTime = openTime + duration - 1;

        return {
            openTime,
            closeTime,
            open: Number(kline.open),
            high: Number(kline.high),
            low: Number(kline.low),
            close: Number(kline.close),
            volume: Number(kline.quoteVol),
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

export async function fetchBitunixSignalMarketData({ symbol, timeframe, forceRefresh = false }) {
    console.log(`[BITUNIX] fetchBitunixSignalMarketData — symbol=${symbol} timeframe=${timeframe}`);

    const [klinesData, tickersData] = await Promise.all([
        bitunixFetch(`/api/v1/futures/market/kline?symbol=${symbol}&interval=${timeframe}&limit=100`, forceRefresh),
        bitunixFetch(`/api/v1/futures/market/tickers?symbols=${symbol}`, forceRefresh),
    ]);

    const klines = klinesData.data;
    const ticker = Array.isArray(tickersData.data) ? tickersData.data[0] : tickersData.data;

    if (!Array.isArray(klines) || klines.length === 0) {
        console.error(`[BITUNIX] No klines data for ${symbol}`);
        throw new Error("Symbol not found on Bitunix");
    }

    const lastPrice = Number(ticker?.lastPrice ?? 0);
    const openPrice24h = Number(ticker?.open ?? 0);
    const change = openPrice24h > 0 ? ((lastPrice - openPrice24h) / openPrice24h) * 100 : 0;

    const result = {
        symbol,
        timeframe,
        source: "BITUNIX",
        candles: normalizeBitunixKlines(klines, timeframe),
        ticker: {
            change,
            volume24h: Number(ticker?.quoteVol ?? 0),
        },
    };

    console.log(`[BITUNIX] Signal data ready — symbol=${symbol} candles=${result.candles.length} lastClose=${result.candles.at(-1)?.close} change=${result.ticker.change}% vol24h=${result.ticker.volume24h}`);

    return result;
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

export async function fetchBitunixCandlesSince({ symbol, timeframe, sinceMs, limit = 200, signal = undefined }) {
    const interval = intervalMap[timeframe] || timeframe;
    const duration = getIntervalDuration(timeframe);
    const data = await bitunixFetch(
        `/api/v1/futures/market/kline?symbol=${symbol}&interval=${interval}&startTime=${sinceMs}&limit=${Math.min(limit, 200)}`,
        true,
        signal
    );
    const klines = data?.data;
    if (!Array.isArray(klines)) return [];
    // Reverse from newest-first to chronological order
    return [...klines].reverse().map((k) => ({
        openTime: Number(k.time),
        closeTime: Number(k.time) + duration - 1,
        high: Number(k.high),
        low: Number(k.low),
    }));
}

export async function fetchBybitCandlesSince({ symbol, timeframe, sinceMs, limit = 200, signal = undefined }) {
    const bybitInterval = bybitIntervalMap[timeframe] || "15";
    const duration = getIntervalDuration(timeframe);
    const options = signal ? { cache: "no-store", signal } : { cache: "no-store" };
    const response = await fetch(
        `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitInterval}&start=${sinceMs}&limit=${limit}`,
        options
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
