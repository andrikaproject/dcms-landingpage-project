// Universe scanned for proximity (ranked by 24h volume). Kept larger than the
// display limit so smaller coins that actually sit near the level can surface.
export const PWL_SCANNER_CANDIDATE_LIMIT = 20;
// Rows shown to the user: the nearest N to the selected level.
export const PWL_SCANNER_RESULT_LIMIT = 5;
export const PWL_SCANNER_MAX_DISTANCE_PERCENT = 5;
export const PWL_SCANNER_VERY_NEAR_PERCENT = 0.35;
export const PWL_SCANNER_NEAR_PERCENT = 1;
export const PWL_SCANNER_CACHE_TTL_MS = 5 * 60 * 1000;

// Selectable target levels for the scanner. All are derived from the same daily
// candles the scanner already fetches, so no extra upstream requests are needed.
export const SCANNER_LEVELS = ["pwl", "pwh", "pwm", "wo", "pdh", "pdl", "pdm"];
export const SCANNER_DEFAULT_LEVEL = "pwl";

export const SCANNER_LEVEL_LABELS = {
    pwl: "PWL",
    pwh: "PWH",
    pwm: "PWM",
    wo: "WO",
    pdh: "PDH",
    pdl: "PDL",
    pdm: "PDM",
};

export function isScannerLevel(value) {
    return typeof value === "string" && SCANNER_LEVELS.includes(value);
}

export function normalizeScannerLevel(value) {
    return isScannerLevel(value) ? value : SCANNER_DEFAULT_LEVEL;
}

function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

// Bitunix lists tokenized stocks, ETFs, and commodities (TSLAUSDT, XAUUSDT, ...)
// alongside real crypto perpetuals on the same USDT-margined futures venue.
// Their /trading_pairs metadata marks most of these with isApiSupported: false,
// which this scanner treats as "not a crypto market" and excludes.
//
// isApiSupported is not complete, though: these tokenized equities/ETFs are
// marked isApiSupported: true despite being stocks, not coins. They are
// excluded manually until Bitunix's own flag catches them. Spot-checked
// against Bitunix's live /trading_pairs response on 2026-07-11; ambiguous
// small-cap symbols with no clearly recognizable ticker were left alone
// rather than guessed at.
const MANUALLY_EXCLUDED_SYMBOLS = new Set([
    "SPCXUSDT", // SpaceX (tokenized, pre-IPO)
    "GAMESTOPUSDT", // GameStop
    "MRVLUSDT", // Marvell Technology
    "SOXLUSDT", // Direxion Daily Semiconductor Bull 3x ETF
    "CRWVUSDT", // CoreWeave
    "WMTUSDT", // Walmart
    "BRKBUSDT", // Berkshire Hathaway (B)
    "JPMUSDT", // JPMorgan Chase
    "VUSDT", // Visa
    "RKLBUSDT", // Rocket Lab
    "NOKUSDT", // Nokia
    "AMATUSDT", // Applied Materials
    "BXUSDT", // Blackstone
    "HPEUSDT", // Hewlett Packard Enterprise
    "IWMUSDT", // iShares Russell 2000 ETF
    "AAOIUSDT", // Applied Optoelectronics
    "CRDOUSDT", // Credo Technology
    "EBAYUSDT", // eBay
    "HIMSUSDT", // Hims & Hers Health
    "DKNGUSDT", // DraftKings
    "RIVNUSDT", // Rivian
    "ZMUSDT", // Zoom
    "EWZUSDT", // iShares MSCI Brazil ETF
    "XLEUSDT", // Energy Select Sector SPDR ETF
    "ADBEUSDT", // Adobe
    "BMNRUSDT", // Bitmine Immersion Technologies
    "UVXYUSDT", // ProShares Ultra VIX Short-Term Futures ETF
    "ASMLUSDT", // ASML Holding
    "GLWUSDT", // Corning
    "HDUSDT", // Home Depot
    "UBERUSDT", // Uber Technologies
    "OUSDT", // Realty Income
    "SQQQUSDT", // ProShares UltraPro Short QQQ
    "TQQQUSDT", // ProShares UltraPro QQQ
]);

export function buildExcludedSymbolSet(tradingPairs) {
    const excluded = new Set(MANUALLY_EXCLUDED_SYMBOLS);
    if (!Array.isArray(tradingPairs)) return excluded;

    for (const pair of tradingPairs) {
        if (pair?.isApiSupported === false) {
            excluded.add(String(pair.symbol || "").trim().toUpperCase());
        }
    }
    return excluded;
}

export function selectPwlScannerCandidates(
    tickers,
    limit = PWL_SCANNER_CANDIDATE_LIMIT,
    excludedSymbols = MANUALLY_EXCLUDED_SYMBOLS
) {
    if (!Array.isArray(tickers)) return [];

    return tickers
        .map((ticker) => ({
            symbol: String(ticker?.symbol || "").trim().toUpperCase(),
            currentPrice: positiveNumber(ticker?.lastPrice),
            volume24h: positiveNumber(ticker?.quoteVol),
        }))
        .filter(
            (ticker) =>
                /^[A-Z0-9]+USDT$/.test(ticker.symbol) &&
                ticker.currentPrice !== null &&
                ticker.volume24h !== null &&
                !excludedSymbols.has(ticker.symbol)
        )
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, Math.max(0, limit));
}

export function createPwlScannerRow(candidate, levelPrice, level = SCANNER_DEFAULT_LEVEL) {
    const currentPrice = positiveNumber(candidate?.currentPrice);
    const price = positiveNumber(levelPrice);
    const volume24h = positiveNumber(candidate?.volume24h);

    if (!candidate?.symbol || currentPrice === null || price === null || volume24h === null) {
        return null;
    }

    const deltaPrice = currentPrice - price;
    const distancePercent = (deltaPrice / price) * 100;
    const absDistance = Math.abs(distancePercent);

    // Two-sided proximity: markets within the band on either side of the level.
    if (absDistance > PWL_SCANNER_MAX_DISTANCE_PERCENT) {
        return null;
    }

    return {
        symbol: candidate.symbol,
        currentPrice,
        level,
        levelPrice: price,
        deltaPrice,
        distancePercent,
        direction: deltaPrice >= 0 ? "above" : "below",
        volume24h,
        isVeryNear: absDistance <= PWL_SCANNER_VERY_NEAR_PERCENT,
        proximityTier:
            absDistance <= PWL_SCANNER_VERY_NEAR_PERCENT
                ? "very-near"
                : absDistance <= PWL_SCANNER_NEAR_PERCENT
                    ? "near"
                    : "watch",
    };
}

export function sortPwlScannerRows(rows) {
    return [...rows].sort(
        (a, b) =>
            Math.abs(a.distancePercent) - Math.abs(b.distancePercent) ||
            b.volume24h - a.volume24h ||
            a.symbol.localeCompare(b.symbol)
    );
}

export async function mapWithConcurrency(items, concurrency, worker) {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) return [];

    const results = new Array(list.length);
    let cursor = 0;
    const workerCount = Math.min(Math.max(1, Math.floor(concurrency) || 1), list.length);

    async function runWorker() {
        while (cursor < list.length) {
            const index = cursor;
            cursor += 1;
            try {
                results[index] = {
                    status: "fulfilled",
                    value: await worker(list[index], index),
                };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    }

    await Promise.all(Array.from({ length: workerCount }, runWorker));
    return results;
}

export function createSharedScannerCache({
    loadFresh,
    ttlMs = PWL_SCANNER_CACHE_TTL_MS,
    now = Date.now,
}) {
    let cached = null;
    let expiresAtMs = 0;
    let inFlight = null;

    function peek() {
        if (!cached || now() >= expiresAtMs) {
            cached = null;
            expiresAtMs = 0;
            return null;
        }
        return cached;
    }

    async function scan() {
        const hit = peek();
        if (hit) return hit;
        if (inFlight) return inFlight;

        inFlight = (async () => {
            const payload = await loadFresh();
            const scannedAtMs = now();
            expiresAtMs = scannedAtMs + ttlMs;
            cached = {
                ...payload,
                scannedAt: new Date(scannedAtMs).toISOString(),
                cacheExpiresAt: new Date(expiresAtMs).toISOString(),
            };
            return cached;
        })();

        try {
            return await inFlight;
        } finally {
            inFlight = null;
        }
    }

    function clear() {
        cached = null;
        expiresAtMs = 0;
        inFlight = null;
    }

    return { peek, scan, clear };
}
