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

function withMarketContext(signal, usdtDominance) {
    return {
        ...signal,
        usdtDominanceLabel: usdtDominance?.label || "UNAVAILABLE",
        usdtDominanceScore: Number(usdtDominance?.score || 0),
        usdtDominanceSource: usdtDominance?.source || "unavailable",
    };
}

async function getBitunixSignal(symbol, timeframe, usdtDominance, forceRefresh = false) {
    const marketData = await fetchBitunixSignalMarketData({ symbol, timeframe, forceRefresh });

    const signal = generateSignalFromCandles({
        ...marketData,
        marketContext: { usdtDomScore: usdtDominance?.score || 0 },
    });

    return withMarketContext(signal, usdtDominance);
}

async function getBybitSignal(symbol, timeframe, usdtDominance, forceRefresh = false) {
    const marketData = await fetchBybitSignalMarketData({ symbol, timeframe, forceRefresh });

    const signal = generateSignalFromCandles({
        ...marketData,
        marketContext: { usdtDomScore: usdtDominance?.score || 0 },
    });

    return withMarketContext(signal, usdtDominance);
}

async function getSignal(symbol, timeframe, usdtDominance, forceRefresh = false) {
    try {
        return await getBitunixSignal(symbol, timeframe, usdtDominance, forceRefresh);
    } catch {
        try {
            return await getBybitSignal(symbol, timeframe, usdtDominance, forceRefresh);
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

    const usdtDominance = await getUsdtDominance(true);
    return getSignal(normalizedSymbol, normalizedTimeframe, usdtDominance, true);
}

export async function getMarketDashboard({ timeframe = "15m", limit = 12, symbol, reanalyze } = {}) {
    const normalizedTimeframe = safeTimeframe(timeframe);
    const searchedSymbol = normalizeSymbol(symbol);
    const reanalyzeTarget = reanalyze && searchedSymbol ? searchedSymbol : null;
    const [usdtDominance, extraTokens, btcTicker, ethTicker] = await Promise.all([
        getUsdtDominance(false),
        getTopTokensByVolume(4, false),
        bitunixFetch("/api/v1/futures/market/tickers?symbols=BTCUSDT", false).then((d) => d?.data?.[0]).catch(() => null),
        bitunixFetch("/api/v1/futures/market/tickers?symbols=ETHUSDT", false).then((d) => d?.data?.[0]).catch(() => null),
    ]);
    const symbols = [...new Set([...(searchedSymbol ? [searchedSymbol] : []), ...TOP_CMC_COINS, ...extraTokens])].slice(0, limit);
    const settledSignals = await Promise.allSettled(
        symbols.map((symbol) => getSignal(symbol, normalizedTimeframe, usdtDominance, symbol === reanalyzeTarget))
    );
    const signals = settledSignals
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

    return {
        timeframe: normalizedTimeframe,
        updatedAt: new Date().toISOString(),
        searchedSymbol,
        usdtDominance,
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
