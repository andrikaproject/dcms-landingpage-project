import {
    bitunixFetch,
    fetchBitunixSignalMarketData,
    fetchBybitSignalMarketData,
    fetchDexSignal,
    intervalMap,
} from "@/lib/market/exchange-fetchers";
import {
    getTopTokensByVolume,
    getUsdtDominance,
    getUsdtDominanceTrendContext,
    MAJOR_COINS,
    TOP_CMC_COINS,
} from "@/lib/market/market-context";
import {
    generateSignalFromCandles,
    normalizeSymbol,
} from "@/lib/market/signal-generator";

function safeTimeframe(timeframe) {
    return intervalMap[timeframe] || "15m";
}

function withMarketContext(signal, usdtDominance, usdtDominanceTrend) {
    return {
        ...signal,
        usdtDominanceLabel: usdtDominance?.label || "UNAVAILABLE",
        usdtDominanceScore: Number(usdtDominanceTrend?.score || 0),
        usdtDominanceLevelScore: Number(usdtDominance?.score || 0),
        usdtDominanceSource: usdtDominance?.source || "unavailable",
        usdtDominanceTrend: usdtDominanceTrend || null,
    };
}

async function getBitunixSignal(symbol, timeframe, usdtDominance, usdtDominanceTrend, forceRefresh = false) {
    const marketData = await fetchBitunixSignalMarketData({ symbol, timeframe, forceRefresh });

    const signal = generateSignalFromCandles({
        ...marketData,
        marketContext: {
            usdtDomScore: usdtDominanceTrend?.score || 0,
            usdtDominanceTrend,
        },
    });

    return withMarketContext(signal, usdtDominance, usdtDominanceTrend);
}

async function getBybitSignal(symbol, timeframe, usdtDominance, usdtDominanceTrend, forceRefresh = false) {
    const marketData = await fetchBybitSignalMarketData({ symbol, timeframe, forceRefresh });

    const signal = generateSignalFromCandles({
        ...marketData,
        marketContext: {
            usdtDomScore: usdtDominanceTrend?.score || 0,
            usdtDominanceTrend,
        },
    });

    return withMarketContext(signal, usdtDominance, usdtDominanceTrend);
}

async function getSignal(symbol, timeframe, usdtDominance, usdtDominanceTrend, forceRefresh = false) {
    try {
        return await getBitunixSignal(symbol, timeframe, usdtDominance, usdtDominanceTrend, forceRefresh);
    } catch {
        try {
            return await getBybitSignal(symbol, timeframe, usdtDominance, usdtDominanceTrend, forceRefresh);
        } catch {
            if (MAJOR_COINS.includes(symbol)) {
                throw new Error("Major coin CEX data unavailable");
            }

            return fetchDexSignal({ symbol, timeframe, forceRefresh });
        }
    }
}

export async function getFreshSignalSnapshot({ symbol, timeframe = "15m" } = {}) {
    const normalizedTimeframe = safeTimeframe(timeframe);
    const normalizedSymbol = normalizeSymbol(symbol);

    if (!normalizedSymbol) {
        throw new Error("Symbol is required");
    }

    const [usdtDominance, usdtDominanceTrend] = await Promise.all([
        getUsdtDominance(true),
        getUsdtDominanceTrendContext(true),
    ]);
    return getSignal(normalizedSymbol, normalizedTimeframe, usdtDominance, usdtDominanceTrend, true);
}

export async function getMarketDashboard({ timeframe = "15m", limit = 12, symbol, reanalyze } = {}) {
    const normalizedTimeframe = safeTimeframe(timeframe);
    const searchedSymbol = normalizeSymbol(symbol);
    const reanalyzeTarget = reanalyze && searchedSymbol ? searchedSymbol : null;
    const [usdtDominance, usdtDominanceTrend, extraTokens, btcTicker, ethTicker] = await Promise.all([
        getUsdtDominance(false),
        getUsdtDominanceTrendContext(false),
        getTopTokensByVolume(4, false),
        bitunixFetch("/api/v1/futures/market/tickers?symbols=BTCUSDT", false).then((d) => d?.data?.[0]).catch(() => null),
        bitunixFetch("/api/v1/futures/market/tickers?symbols=ETHUSDT", false).then((d) => d?.data?.[0]).catch(() => null),
    ]);
    const symbols = [...new Set([...(searchedSymbol ? [searchedSymbol] : []), ...TOP_CMC_COINS, ...extraTokens])].slice(0, limit);
    const settledSignals = await Promise.allSettled(
        symbols.map((symbol) => getSignal(symbol, normalizedTimeframe, usdtDominance, usdtDominanceTrend, symbol === reanalyzeTarget))
    );
    const signals = settledSignals
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

    return {
        timeframe: normalizedTimeframe,
        updatedAt: new Date().toISOString(),
        searchedSymbol,
        usdtDominance,
        usdtDominanceTrend,
        tickers: {
            btc: btcTicker ? Number(btcTicker.lastPrice) : null,
            eth: ethTicker ? Number(ethTicker.lastPrice) : null,
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
