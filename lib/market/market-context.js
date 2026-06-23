import { bitunixFetch, marketFetchOptions } from "@/lib/market/exchange-fetchers";

const COINMARKETCAP_API_BASE_URL = "https://pro-api.coinmarketcap.com";
const COINMARKETCAP_USDT_ID = "825";

export const TOP_CMC_COINS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
export const MAJOR_COINS = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "BNBUSDT",
];

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

export async function getUsdtDominance(forceRefresh = false) {
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

export async function getTopTokensByVolume(count = 4, forceRefresh = false) {
    try {
        const data = await bitunixFetch("/api/v1/futures/market/tickers", forceRefresh);
        const tickers = Array.isArray(data?.data) ? data.data : [];

        return tickers
            .filter((ticker) => ticker.symbol.endsWith("USDT") && !TOP_CMC_COINS.includes(ticker.symbol) && Number(ticker.lastPrice) > 0)
            .sort((a, b) => Number(b.quoteVol ?? 0) - Number(a.quoteVol ?? 0))
            .slice(0, count)
            .map((ticker) => ticker.symbol);
    } catch {
        return ["AVAXUSDT", "LINKUSDT", "SUIUSDT", "PEPEUSDT"];
    }
}
