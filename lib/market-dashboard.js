const BINANCE_ENDPOINTS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
];
const COINMARKETCAP_API_BASE_URL = "https://pro-api.coinmarketcap.com";
const COINMARKETCAP_USDT_ID = "825";

const TOP_CMC_COINS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
const MAJOR_COINS = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "BNBUSDT",
];

const intervalMap = {
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

function marketFetchOptions(forceRefresh = false, revalidate = 60) {
    return forceRefresh ? { cache: "no-store" } : { next: { revalidate } };
}

async function binanceFetch(path, forceRefresh = false) {
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

function calcEMA(data, period) {
    const k = 2 / (period + 1);
    const ema = [data[0]];

    for (let i = 1; i < data.length; i += 1) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }

    return ema;
}

function calcRSI(closes, period = 14) {
    const rsi = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i += 1) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));

    for (let i = period + 1; i < closes.length; i += 1) {
        const diff = closes[i] - closes[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
        rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));
    }

    return rsi;
}

function calcSMA(data, period) {
    return data.map((value, index) => {
        if (index < period - 1) return value;

        const window = data.slice(index - period + 1, index + 1);
        return window.reduce((sum, item) => sum + item, 0) / period;
    });
}

function calcStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, smoothK = 3, smoothD = 3) {
    const rsi = calcRSI(closes, rsiPeriod);
    const stochRaw = [];

    for (let i = 0; i < rsi.length; i += 1) {
        if (i < stochPeriod) {
            stochRaw.push(50);
            continue;
        }

        const window = rsi.slice(i - stochPeriod + 1, i + 1);
        const min = Math.min(...window);
        const max = Math.max(...window);
        stochRaw.push(max === min ? 50 : 100 * (rsi[i] - min) / (max - min));
    }

    const k = calcSMA(stochRaw, smoothK);
    const d = calcSMA(k, smoothD);
    const lastIndex = k.length - 1;
    const previousIndex = Math.max(0, lastIndex - 1);

    return {
        k: k[lastIndex],
        d: d[lastIndex],
        previousK: k[previousIndex],
        previousD: d[previousIndex],
    };
}

function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
}

function getStochRsiScore({ k, d, previousK, previousD }) {
    if (![k, d, previousK, previousD].every(isFiniteNumber)) return 0;

    const currentK = Number(k);
    const currentD = Number(d);
    const priorK = Number(previousK);
    const priorD = Number(previousD);
    const overbought = 80;
    const oversold = 20;
    const midline = 50;
    const middleRangeLow = 35;
    const middleRangeHigh = 65;
    const chopSpread = 3;
    const bullishCross = priorK <= priorD && currentK > currentD;
    const bearishCross = priorK >= priorD && currentK < currentD;
    const crossedUpFromOversold = priorK <= oversold && currentK > oversold;
    const crossedDownFromOverbought = priorK >= overbought && currentK < overbought;
    const isMiddleRange = currentK >= middleRangeLow
        && currentK <= middleRangeHigh
        && currentD >= middleRangeLow
        && currentD <= middleRangeHigh;
    const isChoppyMiddle = isMiddleRange && Math.abs(currentK - currentD) < chopSpread;

    if (isChoppyMiddle) return 0;

    const bullishReversal = (bullishCross && (priorK <= oversold || priorD <= oversold || currentK <= middleRangeLow))
        || (crossedUpFromOversold && currentK > currentD);
    const bearishReversal = (bearishCross && (priorK >= overbought || priorD >= overbought || currentK >= middleRangeHigh))
        || (crossedDownFromOverbought && currentK < currentD);
    const bullishMomentum = currentK > currentD && currentK >= midline && currentK < overbought && currentD >= midline;
    const bearishMomentum = currentK < currentD && currentK <= midline && currentK > oversold && currentD <= midline;

    if (bullishReversal || bullishMomentum) return 1;
    if (bearishReversal || bearishMomentum) return -1;

    return 0;
}

function calcATR(highs, lows, closes, period = 14) {
    const tr = [highs[0] - lows[0]];

    for (let i = 1; i < highs.length; i += 1) {
        tr.push(
            Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            )
        );
    }

    const atr = [tr[0]];

    for (let i = 1; i < tr.length; i += 1) {
        atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
    }

    return atr;
}

function calcVPVR(closes, highs, lows, volumes, bins = 24) {
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const step = (maxPrice - minPrice) / bins;

    if (step === 0) return { poc: closes[closes.length - 1] };

    const profile = new Array(bins).fill(0);

    for (let i = 0; i < closes.length; i += 1) {
        const startBin = Math.max(0, Math.min(bins - 1, Math.floor((lows[i] - minPrice) / step)));
        const endBin = Math.max(0, Math.min(bins - 1, Math.floor((highs[i] - minPrice) / step)));
        const volumePerBin = volumes[i] / (endBin - startBin + 1);

        for (let bin = startBin; bin <= endBin; bin += 1) {
            profile[bin] += volumePerBin;
        }
    }

    const pocBin = profile.reduce((bestIndex, value, index) => (value > profile[bestIndex] ? index : bestIndex), 0);

    return { poc: minPrice + pocBin * step + step / 2 };
}

function calcTrendline(closes, period = 30) {
    const data = closes.slice(-period);
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i += 1) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope > 0 ? "BULLISH" : "BEARISH";
}

function calcKeyLevel(highs, lows) {
    const recentHighs = highs.slice(-30);
    const recentLows = lows.slice(-30);
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);

    return {
        resistance,
        support,
        mid: (resistance + support) / 2,
    };
}

function formatUsdtDominance(usdtDominance = 0, source = "unknown") {
    if (usdtDominance > 6.5) return { value: usdtDominance, label: "OVERBOUGHT", market: "MARKET BEARISH", score: -2, source };
    if (usdtDominance < 4.5) return { value: usdtDominance, label: "OVERSOLD", market: "MARKET BULLISH", score: 2, source };
    if (usdtDominance >= 5.5) return { value: usdtDominance, label: "RISING", market: "MARKET CAUTION", score: -1, source };
    if (usdtDominance <= 5.0) return { value: usdtDominance, label: "FALLING", market: "MARKET POSITIVE", score: 1, source };
    return { value: usdtDominance, label: "NEUTRAL", market: "MARKET NEUTRAL", score: 0, source };
}

function formatUnavailableUsdtDominance() {
    return {
        value: 0,
        label: "UNAVAILABLE",
        market: "MARKET NEUTRAL",
        score: 0,
        source: "unavailable",
    };
}

async function coinMarketCapFetch(path, forceRefresh = false) {
    const apiKey = process.env.COINMARKETCAP_API_KEY;

    if (!apiKey) {
        throw new Error("COINMARKETCAP_API_KEY is not configured");
    }

    const response = await fetch(`${COINMARKETCAP_API_BASE_URL}${path}`, {
        ...marketFetchOptions(forceRefresh, 300),
        headers: {
            Accept: "application/json",
            "X-CMC_PRO_API_KEY": apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`CoinMarketCap responded ${response.status}`);
    }

    return response.json();
}

function getCmcUsdMetric(quoteRecord, metricName) {
    const quote = quoteRecord?.quote;

    if (Array.isArray(quote)) {
        const usdQuote = quote.find((item) => item?.symbol === "USD" || item?.name === "USD") || quote[0];
        return Number(usdQuote?.[metricName]);
    }

    return Number(quote?.USD?.[metricName]);
}

function getCmcQuoteRecord(response, coinId) {
    const data = response?.data;

    if (Array.isArray(data)) {
        return data.find((item) => Number(item?.id) === Number(coinId));
    }

    const quoteRecord = data?.[coinId];
    return Array.isArray(quoteRecord) ? quoteRecord[0] : quoteRecord;
}

async function getCoinMarketCapUsdtDominance(forceRefresh = false) {
    const [globalMetrics, usdtQuote] = await Promise.all([
        coinMarketCapFetch("/v1/global-metrics/quotes/latest", forceRefresh),
        coinMarketCapFetch(`/v3/cryptocurrency/quotes/latest?id=${COINMARKETCAP_USDT_ID}`, forceRefresh),
    ]);
    const totalMarketCap = Number(globalMetrics?.data?.quote?.USD?.total_market_cap);
    const usdtMarketCap = getCmcUsdMetric(getCmcQuoteRecord(usdtQuote, COINMARKETCAP_USDT_ID), "market_cap");

    if (!Number.isFinite(totalMarketCap) || totalMarketCap <= 0 || !Number.isFinite(usdtMarketCap) || usdtMarketCap <= 0) {
        throw new Error("CoinMarketCap USDT dominance data is invalid");
    }

    return usdtMarketCap / totalMarketCap * 100;
}

async function getCoinGeckoUsdtDominance(forceRefresh = false) {
    const response = await fetch("https://api.coingecko.com/api/v3/global", marketFetchOptions(forceRefresh, 300));

    if (!response.ok) throw new Error("CoinGecko fetch failed");

    const json = await response.json();
    const usdtDominance = Number(json?.data?.market_cap_percentage?.usdt);

    if (!Number.isFinite(usdtDominance)) {
        throw new Error("CoinGecko USDT dominance data is invalid");
    }

    return usdtDominance;
}

async function getUsdtDominance(forceRefresh = false) {
    try {
        return formatUsdtDominance(await getCoinMarketCapUsdtDominance(forceRefresh), "coinmarketcap");
    } catch {
        try {
            return formatUsdtDominance(await getCoinGeckoUsdtDominance(forceRefresh), "coingecko");
        } catch {
            return formatUnavailableUsdtDominance();
        }
    }
}

async function getTopTokensByVolume(count = 4, forceRefresh = false) {
    try {
        const tickers = await binanceFetch("/api/v3/ticker/24hr", forceRefresh);

        return tickers
            .filter((ticker) => ticker.symbol.endsWith("USDT") && !TOP_CMC_COINS.includes(ticker.symbol) && Number(ticker.lastPrice) > 0)
            .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
            .slice(0, count)
            .map((ticker) => ticker.symbol);
    } catch {
        return ["AVAXUSDT", "LINKUSDT", "SUIUSDT", "PEPEUSDT"];
    }
}

function processSignalData({ symbol, timeframe, usdtDomScore, closes, highs, lows, volumes, change, volume24h, source }) {
    const price = closes[closes.length - 1];
    const isHighTimeframe = ["4h", "1d"].includes(timeframe);
    const fastPeriod = isHighTimeframe ? 50 : 21;
    const slowPeriod = isHighTimeframe ? 200 : 50;
    const rsiArr = calcRSI(closes, 14);
    const rsi = rsiArr[rsiArr.length - 1];
    const emaFast = calcEMA(closes, fastPeriod).pop();
    const emaSlow = calcEMA(closes, slowPeriod).pop();
    const stoch = calcStochRSI(closes);
    const vpvr = calcVPVR(closes, highs, lows, volumes);
    const trendline = calcTrendline(closes);
    const keyLevel = calcKeyLevel(highs, lows);
    const atr = calcATR(highs, lows, closes, 14).pop();
    let score = usdtDomScore;

    if (price > emaFast) score += 1;
    else score -= 1;
    if (price > emaSlow) score += 1;
    else score -= 1;
    if (emaFast > emaSlow) score += 1;
    else score -= 1;
    score += getStochRsiScore(stoch);
    if (price > vpvr.poc) score += 1;
    else score -= 1;
    if (trendline === "BULLISH") score += 1;
    else score -= 1;
    if (price > keyLevel.mid) score += 1;
    else score -= 1;

    const bias = score >= 4 ? "long" : score <= -4 ? "short" : "neutral";
    const stopLossDistance = atr * 2;
    const entry = closes[closes.length - 2] || price;
    const tp1 = bias === "short" ? entry - stopLossDistance * 1.2 : entry + stopLossDistance * 1.2;
    const tp2 = bias === "short" ? entry - stopLossDistance * 2 : entry + stopLossDistance * 2;
    const tp = tp2;
    const sl = bias === "short" ? entry + stopLossDistance : entry - stopLossDistance;
    const riskPercent = Math.abs(price - sl) / price * 100;
    const rewardPercent = Math.abs(tp2 - price) / price * 100;
    const riskReward = rewardPercent / (riskPercent || 1);
    const sinceEntryPercent = (price - entry) / entry * 100;
    const progressPercent = Math.max(8, Math.min(100, rewardPercent / ((riskPercent + rewardPercent) || 1) * 100));

    return {
        symbol,
        timeframe,
        base: symbol.replace("USDT", ""),
        price,
        change,
        volume24h,
        source,
        marketType: "CEX",
        indicatorAvailable: true,
        support: keyLevel.support,
        resistance: keyLevel.resistance,
        rsi,
        emaFast,
        emaSlow,
        fastPeriod,
        slowPeriod,
        stochK: stoch.k,
        stochD: stoch.d,
        poc: vpvr.poc,
        trendline,
        keyMid: keyLevel.mid,
        bias,
        score,
        entry,
        tp1,
        tp2,
        tp,
        sl,
        riskPercent,
        rewardPercent,
        riskReward,
        sinceEntryPercent,
        progressPercent,
    };
}

async function getBinanceSignal(symbol, timeframe, usdtDomScore, forceRefresh = false) {
    const [klines, ticker] = await Promise.all([
        binanceFetch(`/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`, forceRefresh),
        binanceFetch(`/api/v3/ticker/24hr?symbol=${symbol}`, forceRefresh),
    ]);

    if (!Array.isArray(klines) || klines.length === 0) {
        throw new Error("Symbol not found on Binance");
    }

    return processSignalData({
        symbol,
        timeframe,
        usdtDomScore,
        closes: klines.map((kline) => Number(kline[4])),
        highs: klines.map((kline) => Number(kline[2])),
        lows: klines.map((kline) => Number(kline[3])),
        volumes: klines.map((kline) => Number(kline[5])),
        change: Number(ticker.priceChangePercent),
        volume24h: Number(ticker.quoteVolume),
        source: "BINANCE",
    });
}

async function getBybitSignal(symbol, timeframe, usdtDomScore, forceRefresh = false) {
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

    const klines = [...rawKlines].reverse();

    return processSignalData({
        symbol,
        timeframe,
        usdtDomScore,
        closes: klines.map((kline) => Number(kline[4])),
        highs: klines.map((kline) => Number(kline[2])),
        lows: klines.map((kline) => Number(kline[3])),
        volumes: klines.map((kline) => Number(kline[5])),
        change: Number(ticker.price24hPcnt) * 100,
        volume24h: Number(ticker.turnover24h),
        source: "BYBIT",
    });
}

async function getDexSignal(symbol, timeframe = "15m", forceRefresh = false) {
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
        bias: "neutral",
        score: 0,
        entry: Number(pair.priceUsd),
        tp1: null,
        tp2: null,
        tp: null,
        sl: null,
        riskPercent: null,
        rewardPercent: null,
        riskReward: null,
        sinceEntryPercent: Number(pair.priceChange?.h24 || 0),
        progressPercent: 25,
        chainId: pair.chainId,
        dexId: pair.dexId,
        pairAddress: pair.pairAddress,
        warning: "Technical indicators unavailable for DEX tokens",
    };
}

async function getSignal(symbol, timeframe, usdtDomScore, forceRefresh = false) {
    try {
        return await getBinanceSignal(symbol, timeframe, usdtDomScore, forceRefresh);
    } catch {
        try {
            return await getBybitSignal(symbol, timeframe, usdtDomScore, forceRefresh);
        } catch {
            if (MAJOR_COINS.includes(symbol)) {
                throw new Error("Major coin CEX data unavailable");
            }

            return getDexSignal(symbol, timeframe, forceRefresh);
        }
    }
}

function normalizeSymbol(symbol) {
    const cleanSymbol = String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanSymbol) return null;
    return cleanSymbol.endsWith("USDT") ? cleanSymbol : `${cleanSymbol}USDT`;
}

export async function getFreshSignalSnapshot({ symbol, timeframe = "15m" } = {}) {
    const safeTimeframe = intervalMap[timeframe] || "15m";
    const normalizedSymbol = normalizeSymbol(symbol);

    if (!normalizedSymbol) {
        throw new Error("Symbol is required");
    }

    const usdtDominance = await getUsdtDominance(true);
    return getSignal(normalizedSymbol, safeTimeframe, usdtDominance.score, true);
}

export async function getMarketDashboard({ timeframe = "15m", limit = 12, symbol, reanalyze } = {}) {
    const safeTimeframe = intervalMap[timeframe] || "15m";
    const searchedSymbol = normalizeSymbol(symbol);
    const reanalyzeTarget = reanalyze && searchedSymbol ? searchedSymbol : null;
    const [usdtDominance, extraTokens, btcTicker, ethTicker] = await Promise.all([
        getUsdtDominance(false),
        getTopTokensByVolume(4, false),
        binanceFetch("/api/v3/ticker/price?symbol=BTCUSDT", false).catch(() => null),
        binanceFetch("/api/v3/ticker/price?symbol=ETHUSDT", false).catch(() => null),
    ]);
    const symbols = [...new Set([...(searchedSymbol ? [searchedSymbol] : []), ...TOP_CMC_COINS, ...extraTokens])].slice(0, limit);
    const settledSignals = await Promise.allSettled(
        symbols.map((symbol) => getSignal(symbol, safeTimeframe, usdtDominance.score, symbol === reanalyzeTarget))
    );
    const signals = settledSignals
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

    return {
        timeframe: safeTimeframe,
        updatedAt: new Date().toISOString(),
        searchedSymbol,
        usdtDominance,
        tickers: {
            btc: btcTicker ? Number(btcTicker.price) : null,
            eth: ethTicker ? Number(ethTicker.price) : null,
        },
        stats: {
            total: signals.length,
            long: signals.filter((signal) => signal.bias === "long").length,
            short: signals.filter((signal) => signal.bias === "short").length,
            neutral: signals.filter((signal) => signal.bias === "neutral").length,
        },
        signals,
    };
}
