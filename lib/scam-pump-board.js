import { analyzeScamPumpWindow } from "@/scampump_logic";

// ─── Constants ────────────────────────────────────────────────────────────────

const BITUNIX_BASE_URL = "https://fapi.bitunix.com";
const BYBIT_BASE_URL = "https://api.bybit.com";

const DEFAULT_SCAN_LIMIT = 20;   // per exchange — was 32 total, now 20 each
const DEFAULT_RESULT_LIMIT = 4;
const CONCURRENCY_LIMIT = 8;     // max parallel candle requests per exchange

const STABLE_BASES = new Set(["USDC", "FDUSD", "TUSD", "DAI", "USDP", "BUSD", "EUR", "TRY", "BRL"]);
const LEVERAGED_SUFFIXES = ["UP", "DOWN", "BULL", "BEAR"];

// ─── Concurrency Helper ───────────────────────────────────────────────────────

async function runWithConcurrency(taskFns, limit = CONCURRENCY_LIMIT) {
    const results = [];
    for (let i = 0; i < taskFns.length; i += limit) {
        const batch = taskFns.slice(i, i + limit);
        const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
        results.push(...batchResults);
    }
    return results;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function getBaseSymbol(symbol) {
    return String(symbol || "").replace(/USDT$/, "");
}

function isLeveragedOrStable(base) {
    return STABLE_BASES.has(base) || LEVERAGED_SUFFIXES.some((s) => base.endsWith(s));
}

// ─── Bitunix ──────────────────────────────────────────────────────────────────

async function bitunixFetch(path) {
    const response = await fetch(`${BITUNIX_BASE_URL}${path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Bitunix responded ${response.status}`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(data.msg || "Bitunix API error");
    return data;
}

function isValidBitunixTicker(ticker) {
    const symbol = String(ticker?.symbol || "");
    const base = getBaseSymbol(symbol);
    return (
        symbol.endsWith("USDT") &&
        !isLeveragedOrStable(base) &&
        Number(ticker?.lastPrice) > 0 &&
        Number(ticker?.quoteVol ?? 0) > 0
    );
}

function bitunixKlineToCandle(kline) {
    return {
        open: Number(kline.open),
        high: Number(kline.high),
        low: Number(kline.low),
        close: Number(kline.close),
        volume: Number(kline.quoteVol),
    };
}

async function getBitunixCandidate(ticker) {
    const symbol = ticker.symbol;
    const data = await bitunixFetch(`/api/v1/futures/market/kline?symbol=${symbol}&interval=1m&limit=21`);
    const klines = data?.data;

    if (!Array.isArray(klines) || klines.length < 21) {
        throw new Error(`Insufficient candle data for ${symbol}`);
    }

    const chronological = [...klines].reverse();
    const analysis = analyzeScamPumpWindow(chronological.map(bitunixKlineToCandle));
    const latestKline = klines[0];
    const lastPrice = Number(ticker.lastPrice ?? 0);
    const openPrice24h = Number(ticker.open ?? 0);

    return {
        symbol,
        source: "BITUNIX",
        base: getBaseSymbol(symbol),
        price: Number(latestKline.close),
        high: Number(latestKline.high),
        low: Number(latestKline.low),
        change1m: analysis.priceChangePct,
        change24h: openPrice24h > 0 ? ((lastPrice - openPrice24h) / openPrice24h) * 100 : 0,
        volume24h: Number(ticker.quoteVol ?? 0),
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

async function scanBitunix(scanLimit) {
    const data = await bitunixFetch("/api/v1/futures/market/tickers");
    const tickers = Array.isArray(data?.data) ? data.data : [];
    const universe = tickers
        .filter(isValidBitunixTicker)
        .sort((a, b) => Number(b.quoteVol ?? 0) - Number(a.quoteVol ?? 0))
        .slice(0, scanLimit);

    const settled = await runWithConcurrency(
        universe.map((ticker) => () => getBitunixCandidate(ticker))
    );

    return settled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
}

// ─── Bybit ────────────────────────────────────────────────────────────────────

async function bybitFetch(path) {
    const response = await fetch(`${BYBIT_BASE_URL}${path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Bybit responded ${response.status}`);
    const data = await response.json();
    if (data.retCode !== 0) throw new Error(data.retMsg || "Bybit API error");
    return data;
}

function isValidBybitTicker(item) {
    const symbol = String(item?.symbol || "");
    const base = getBaseSymbol(symbol);
    return (
        symbol.endsWith("USDT") &&
        !isLeveragedOrStable(base) &&
        Number(item?.lastPrice) > 0 &&
        Number(item?.turnover24h ?? 0) > 0
    );
}

function bybitKlineToCandle(kline) {
    // Bybit kline format: [startTime, open, high, low, close, volume, turnover]
    return {
        open: Number(kline[1]),
        high: Number(kline[2]),
        low: Number(kline[3]),
        close: Number(kline[4]),
        volume: Number(kline[6]), // turnover (quote volume) — matches Bitunix quoteVol
    };
}

async function getBybitCandidate(item) {
    const symbol = item.symbol;
    const data = await bybitFetch(
        `/v5/market/kline?category=linear&symbol=${symbol}&interval=1&limit=21`
    );
    const rawList = data?.result?.list;

    if (!Array.isArray(rawList) || rawList.length < 21) {
        throw new Error(`Insufficient candle data for ${symbol} (Bybit)`);
    }

    // Bybit returns newest-first, reverse to chronological
    const chronological = [...rawList].reverse();
    const analysis = analyzeScamPumpWindow(chronological.map(bybitKlineToCandle));
    const latestKline = rawList[0];
    const lastPrice = Number(item.lastPrice ?? 0);
    const prevPrice24h = Number(item.prevPrice24h ?? 0);

    return {
        symbol,
        source: "BYBIT",
        base: getBaseSymbol(symbol),
        price: Number(latestKline[4]),
        high: Number(latestKline[2]),
        low: Number(latestKline[3]),
        change1m: analysis.priceChangePct,
        change24h: prevPrice24h > 0 ? ((lastPrice - prevPrice24h) / prevPrice24h) * 100 : 0,
        volume24h: Number(item.turnover24h ?? 0),
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

async function scanBybit(scanLimit) {
    const data = await bybitFetch("/v5/market/tickers?category=linear");
    const items = Array.isArray(data?.result?.list) ? data.result.list : [];
    const universe = items
        .filter(isValidBybitTicker)
        .sort((a, b) => Number(b.turnover24h ?? 0) - Number(a.turnover24h ?? 0))
        .slice(0, scanLimit);

    const settled = await runWithConcurrency(
        universe.map((item) => () => getBybitCandidate(item))
    );

    return settled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
}

// ─── Merge & Deduplicate ──────────────────────────────────────────────────────

function mergeAndRank(bitunixResults, bybitResults, resultLimit) {
    // If same base symbol appears from both exchanges, keep the one with higher score
    const byBase = new Map();

    for (const item of [...bitunixResults, ...bybitResults]) {
        const existing = byBase.get(item.base);
        if (!existing || item.score > existing.score) {
            byBase.set(item.base, item);
        }
    }

    return [...byBase.values()]
        .sort((a, b) => {
            if (a.isPump !== b.isPump) return a.isPump ? -1 : 1;
            if (a.score !== b.score) return b.score - a.score;
            return b.volumeRatio - a.volumeRatio;
        })
        .slice(0, resultLimit);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getScamPumpBoard({ scanLimit = DEFAULT_SCAN_LIMIT, resultLimit = DEFAULT_RESULT_LIMIT } = {}) {
    const [bitunixResults, bybitResults] = await Promise.allSettled([
        scanBitunix(scanLimit),
        scanBybit(scanLimit),
    ]);

    const fromBitunix = bitunixResults.status === "fulfilled" ? bitunixResults.value : [];
    const fromBybit = bybitResults.status === "fulfilled" ? bybitResults.value : [];

    const recommendations = mergeAndRank(fromBitunix, fromBybit, resultLimit);

    return {
        updatedAt: new Date().toISOString(),
        timeframe: "1m",
        inspectedCount: fromBitunix.length + fromBybit.length,
        sources: {
            bitunix: { scanned: fromBitunix.length, failed: bitunixResults.status === "rejected" },
            bybit: { scanned: fromBybit.length, failed: bybitResults.status === "rejected" },
        },
        recommendations,
    };
}
