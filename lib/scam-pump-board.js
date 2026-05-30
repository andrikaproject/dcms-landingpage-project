import { analyzeScamPumpWindow } from "@/scampump_logic";

const BINANCE_ENDPOINTS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
];
const DEFAULT_SCAN_LIMIT = 32;
const DEFAULT_RESULT_LIMIT = 4;
const STABLE_BASES = new Set(["USDC", "FDUSD", "TUSD", "DAI", "USDP", "BUSD", "EUR", "TRY", "BRL"]);
const LEVERAGED_SUFFIXES = ["UP", "DOWN", "BULL", "BEAR"];

function marketFetchOptions(forceRefresh = false, revalidate = 60) {
    return forceRefresh ? { cache: "no-store" } : { next: { revalidate } };
}

async function binanceFetch(path, forceRefresh = false) {
    let lastError;

    for (const baseUrl of BINANCE_ENDPOINTS) {
        try {
            const response = await fetch(`${baseUrl}${path}`, marketFetchOptions(forceRefresh, 30));

            if (response.ok) return response.json();
            lastError = new Error(`Binance responded ${response.status}`);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Binance fetch failed");
}

function getBaseSymbol(symbol) {
    return String(symbol || "").replace(/USDT$/, "");
}

function isValidUsdtSpotSymbol(ticker) {
    const symbol = String(ticker?.symbol || "");
    const base = getBaseSymbol(symbol);

    return symbol.endsWith("USDT")
        && !STABLE_BASES.has(base)
        && !LEVERAGED_SUFFIXES.some((suffix) => base.endsWith(suffix))
        && Number(ticker?.lastPrice) > 0
        && Number(ticker?.quoteVolume) > 0;
}

function klineToCandle(kline) {
    return {
        open: Number(kline[1]),
        high: Number(kline[2]),
        low: Number(kline[3]),
        close: Number(kline[4]),
        volume: Number(kline[5]),
    };
}

async function getScamPumpCandidate(ticker, forceRefresh = false) {
    const symbol = ticker.symbol;
    const klines = await binanceFetch(`/api/v3/klines?symbol=${symbol}&interval=1m&limit=21`, forceRefresh);

    if (!Array.isArray(klines) || klines.length < 21) {
        throw new Error(`Insufficient candle data for ${symbol}`);
    }

    const analysis = analyzeScamPumpWindow(klines.map(klineToCandle));
    const latestCandle = klines[klines.length - 1];
    const price = Number(latestCandle[4]);
    const high = Number(latestCandle[2]);
    const low = Number(latestCandle[3]);

    return {
        symbol,
        base: getBaseSymbol(symbol),
        price,
        high,
        low,
        change1m: analysis.priceChangePct,
        change24h: Number(ticker.priceChangePercent),
        volume24h: Number(ticker.quoteVolume),
        latestVolume: analysis.volume,
        avgVolume: analysis.avgVolume,
        volumeRatio: analysis.volumeRatio,
        volumeRatioLabel: analysis.volumeRatioLabel,
        score: analysis.score,
        isPump: analysis.isPump,
        status: analysis.isPump ? "PUMP ALERT" : "WATCHLIST",
        reason: analysis.reason,
    };
}

export async function getScamPumpBoard({ scanLimit = DEFAULT_SCAN_LIMIT, resultLimit = DEFAULT_RESULT_LIMIT } = {}) {
    const tickers = await binanceFetch("/api/v3/ticker/24hr", true);
    const universe = tickers
        .filter(isValidUsdtSpotSymbol)
        .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
        .slice(0, scanLimit);
    const settledCandidates = await Promise.allSettled(
        universe.map((ticker) => getScamPumpCandidate(ticker, true))
    );
    const candidates = settledCandidates
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .sort((a, b) => {
            if (a.isPump !== b.isPump) return a.isPump ? -1 : 1;
            if (a.score !== b.score) return b.score - a.score;
            return b.volumeRatio - a.volumeRatio;
        })
        .slice(0, resultLimit);

    return {
        updatedAt: new Date().toISOString(),
        timeframe: "1m",
        inspectedCount: universe.length,
        recommendations: candidates,
    };
}
