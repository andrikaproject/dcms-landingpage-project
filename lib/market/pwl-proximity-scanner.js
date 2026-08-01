import {
    bitunixFetch,
    fetchBitunixCandles,
    fetchBitunixTradingPairs,
} from "@/lib/market/exchange-fetchers";
import { computeLevels } from "@/lib/market/key-levels";
import {
    buildExcludedSymbolSet,
    createPwlScannerRow,
    createSharedScannerCache,
    mapWithConcurrency,
    normalizeScannerLevel,
    PWL_SCANNER_RESULT_LIMIT,
    selectPwlScannerCandidates,
    sortPwlScannerRows,
} from "@/lib/market/pwl-proximity-scanner-core";

const DAILY_CANDLE_LIMIT = 40;
const MARKET_REQUEST_CONCURRENCY = 5;
const CACHE_KEY = Symbol.for("dcms.pwl-proximity-scanner.cache");

async function loadFreshScannerResult(level) {
    const now = Date.now();
    const [tickerResponse, tradingPairs] = await Promise.all([
        bitunixFetch("/api/v1/futures/market/tickers"),
        // Fail-open: if instrument metadata is unavailable, fall back to the
        // manual exclusion list rather than blocking the whole scan.
        fetchBitunixTradingPairs().catch(() => []),
    ]);
    const excludedSymbols = buildExcludedSymbolSet(tradingPairs);
    const candidates = selectPwlScannerCandidates(
        tickerResponse?.data,
        undefined,
        excludedSymbols
    );

    if (candidates.length === 0) {
        throw new Error("Bitunix scanner universe is unavailable");
    }

    const outcomes = await mapWithConcurrency(
        candidates,
        MARKET_REQUEST_CONCURRENCY,
        async (candidate) => {
            const dailyCandles = await fetchBitunixCandles(
                candidate.symbol,
                DAILY_CANDLE_LIMIT
            );
            // All UTC levels come from the same daily candles — no extra fetch.
            const levels = computeLevels({ basis: "utc", dailyCandles, now });
            const levelPrice = levels?.[level];

            if (!Number.isFinite(levelPrice) || levelPrice <= 0) {
                throw new Error(`${level.toUpperCase()} unavailable for ${candidate.symbol}`);
            }

            return createPwlScannerRow(candidate, levelPrice, level);
        }
    );

    const successful = outcomes.filter((outcome) => outcome.status === "fulfilled");
    const skippedCount = outcomes.length - successful.length;

    if (successful.length === 0) {
        throw new Error("All scanner candidate requests failed");
    }

    // Rank every qualifying market by proximity, then keep only the nearest few.
    const rankedRows = sortPwlScannerRows(
        successful.map((outcome) => outcome.value).filter(Boolean)
    );

    return {
        level,
        candidateCount: candidates.length,
        skippedCount,
        results: rankedRows.slice(0, PWL_SCANNER_RESULT_LIMIT),
    };
}

// One shared cache per level, kept in a registry on globalThis so hot reloads and
// concurrent requests reuse the same instances.
function getCacheRegistry() {
    // Guard against a stale pre-registry value (a single cache object) left on
    // globalThis by an earlier build — Symbol.for keys survive hot reloads.
    if (!(globalThis[CACHE_KEY] instanceof Map)) {
        globalThis[CACHE_KEY] = new Map();
    }
    return globalThis[CACHE_KEY];
}

function getSharedCache(level) {
    const registry = getCacheRegistry();
    if (!registry.has(level)) {
        registry.set(
            level,
            createSharedScannerCache({
                loadFresh: () => loadFreshScannerResult(level),
            })
        );
    }
    return registry.get(level);
}

export function getCachedPwlProximityScannerResult(level) {
    return getSharedCache(normalizeScannerLevel(level)).peek();
}

export async function scanPwlProximity(level) {
    return getSharedCache(normalizeScannerLevel(level)).scan();
}
