import assert from "node:assert/strict";
import test from "node:test";
import {
    buildExcludedSymbolSet,
    createPwlScannerRow,
    createSharedScannerCache,
    mapWithConcurrency,
    normalizeScannerLevel,
    selectPwlScannerCandidates,
    sortPwlScannerRows,
} from "../../lib/market/pwl-proximity-scanner-core.js";
import { createPwlScannerRouteHandler } from "../../lib/market/pwl-proximity-scanner-route.js";
import { computeUtcWeeklyLevels } from "../../lib/market/utc-weekly-levels.js";

const candidate = {
    symbol: "ARBUSDT",
    currentPrice: 100,
    volume24h: 87432109,
};

test("PWL uses only the previous completed Monday-Sunday UTC week", () => {
    const now = Date.UTC(2026, 6, 8, 12);
    const candle = (year, month, day, high, low) => ({
        openTime: Date.UTC(year, month, day),
        high,
        low,
    });
    const levels = computeUtcWeeklyLevels(
        [
            candle(2026, 5, 28, 99, 1),
            candle(2026, 5, 29, 20, 9),
            candle(2026, 6, 1, 24, 7),
            candle(2026, 6, 5, 22, 8),
            candle(2026, 6, 6, 80, 2),
        ],
        now
    );

    assert.deepEqual(levels, { pwh: 24, pwl: 7 });
});

test("proximity tiers use absolute distance on both sides of the level", () => {
    const atLevel = createPwlScannerRow(candidate, 100);
    const veryNearAbove = createPwlScannerRow({ ...candidate, currentPrice: 100.35 }, 100);
    const nearBelow = createPwlScannerRow({ ...candidate, currentPrice: 99 }, 100);
    const atMaxBelow = createPwlScannerRow({ ...candidate, currentPrice: 95 }, 100);

    assert.equal(atLevel.distancePercent, 0);
    assert.equal(atLevel.isVeryNear, true);
    assert.equal(atLevel.direction, "above");

    assert.ok(Math.abs(veryNearAbove.distancePercent - 0.35) < 1e-10);
    assert.equal(veryNearAbove.proximityTier, "very-near");
    assert.equal(veryNearAbove.direction, "above");

    assert.equal(nearBelow.distancePercent, -1);
    assert.equal(nearBelow.proximityTier, "near");
    assert.equal(nearBelow.direction, "below");

    assert.equal(atMaxBelow.distancePercent, -5);
    assert.equal(atMaxBelow.proximityTier, "watch");
    assert.equal(atMaxBelow.direction, "below");
});

test("row carries the requested level key and price", () => {
    const row = createPwlScannerRow({ ...candidate, currentPrice: 102 }, 100, "pwh");
    assert.equal(row.level, "pwh");
    assert.equal(row.levelPrice, 100);
    assert.equal(row.distancePercent, 2);
    assert.equal(row.direction, "above");
});

test("eligibility excludes prices beyond 5% on either side", () => {
    assert.equal(
        createPwlScannerRow({ ...candidate, currentPrice: 94.99 }, 100),
        null
    );
    assert.equal(
        createPwlScannerRow({ ...candidate, currentPrice: 105.01 }, 100),
        null
    );
});

test("normalizeScannerLevel keeps valid keys and defaults invalid to pwl", () => {
    assert.equal(normalizeScannerLevel("pwh"), "pwh");
    assert.equal(normalizeScannerLevel("pdm"), "pdm");
    assert.equal(normalizeScannerLevel("nope"), "pwl");
    assert.equal(normalizeScannerLevel(undefined), "pwl");
});

test("buildExcludedSymbolSet excludes isApiSupported:false pairs and the manual SPCX override", () => {
    const excluded = buildExcludedSymbolSet([
        { symbol: "TSLAUSDT", isApiSupported: false },
        { symbol: "XAUUSDT", isApiSupported: false },
        { symbol: "BTCUSDT", isApiSupported: true },
    ]);

    assert.ok(excluded.has("TSLAUSDT"));
    assert.ok(excluded.has("XAUUSDT"));
    assert.ok(excluded.has("SPCXUSDT"));
    assert.ok(!excluded.has("BTCUSDT"));
});

test("buildExcludedSymbolSet still returns the manual overrides when trading pairs are unavailable", () => {
    assert.ok(buildExcludedSymbolSet([]).has("SPCXUSDT"));
    assert.ok(buildExcludedSymbolSet(null).has("SPCXUSDT"));
});

test("candidate selection drops excluded symbols even when they rank by volume", () => {
    const tickers = [
        { symbol: "TSLAUSDT", lastPrice: "250", quoteVol: "999999999" },
        { symbol: "BTCUSDT", lastPrice: "64000", quoteVol: "500" },
    ];
    const excluded = new Set(["TSLAUSDT"]);

    const selected = selectPwlScannerCandidates(tickers, 20, excluded);

    assert.equal(selected.length, 1);
    assert.equal(selected[0].symbol, "BTCUSDT");
});

test("candidate universe keeps 20 valid USDT markets ranked by quote volume", () => {
    const tickers = Array.from({ length: 34 }, (_, index) => ({
        symbol: `COIN${index}USDT`,
        lastPrice: String(index + 1),
        quoteVol: String(1000 + index),
    }));
    tickers.push(
        { symbol: "BTCUSDC", lastPrice: "1", quoteVol: "999999" },
        { symbol: "BADUSDT", lastPrice: "0", quoteVol: "999998" },
        { symbol: "NOVOLUMEUSDT", lastPrice: "2", quoteVol: "invalid" }
    );

    const selected = selectPwlScannerCandidates(tickers);

    assert.equal(selected.length, 20);
    assert.equal(selected[0].symbol, "COIN33USDT");
    assert.equal(selected.at(-1).symbol, "COIN14USDT");
});

test("rows rank by absolute distance, then higher volume", () => {
    const rows = [
        { symbol: "B-USDT", distancePercent: 0.7, volume24h: 20 },
        { symbol: "C-USDT", distancePercent: -0.2, volume24h: 10 },
        { symbol: "A-USDT", distancePercent: 0.2, volume24h: 30 },
    ];

    assert.deepEqual(
        sortPwlScannerRows(rows).map((row) => row.symbol),
        ["A-USDT", "C-USDT", "B-USDT"]
    );
});

test("bounded worker pool isolates skipped markets", async () => {
    let active = 0;
    let maxActive = 0;
    const outcomes = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        if (value === 3) throw new Error("upstream failed");
        return value * 2;
    });

    assert.equal(maxActive, 2);
    assert.equal(outcomes.filter((item) => item.status === "rejected").length, 1);
    assert.deepEqual(
        outcomes.filter((item) => item.status === "fulfilled").map((item) => item.value),
        [2, 4, 8, 10]
    );
});

test("30 markets never exceed five concurrent upstream workers", async () => {
    let active = 0;
    let maxActive = 0;
    const outcomes = await mapWithConcurrency(
        Array.from({ length: 30 }, (_, index) => index),
        5,
        async (value) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await new Promise((resolve) => setTimeout(resolve, 1));
            active -= 1;
            return value;
        }
    );

    assert.equal(maxActive, 5);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 30);
});

test("empty ticker input creates empty candidate universe", () => {
    assert.deepEqual(selectPwlScannerCandidates([]), []);
    assert.deepEqual(selectPwlScannerCandidates(null), []);
});

test("shared cache deduplicates concurrent scans, hits cache, then expires", async () => {
    let currentTime = Date.UTC(2026, 6, 11, 10, 0, 0);
    let loads = 0;
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    const cache = createSharedScannerCache({
        ttlMs: 300_000,
        now: () => currentTime,
        loadFresh: async () => {
            loads += 1;
            if (loads === 1) await pending;
            return { candidateCount: 30, skippedCount: 0, results: [] };
        },
    });

    const first = cache.scan();
    const concurrent = cache.scan();
    release();
    const [firstResult, concurrentResult] = await Promise.all([first, concurrent]);

    assert.equal(loads, 1);
    assert.strictEqual(firstResult, concurrentResult);
    assert.strictEqual(await cache.scan(), firstResult);
    assert.equal(loads, 1);

    currentTime += 300_001;
    const refreshed = await cache.scan();
    assert.equal(loads, 2);
    assert.notStrictEqual(refreshed, firstResult);
});

function routeHarness(overrides = {}) {
    const responses = {
        unauthorized: { status: 401 },
        limited: { status: 429 },
    };
    const handler = createPwlScannerRouteHandler({
        requireSession: async () => ({
            session: { user: { email: "member@dcms.test" } },
            response: null,
        }),
        enforceLimit: async () => ({ response: null }),
        getCached: () => null,
        scan: async () => ({ candidateCount: 30, skippedCount: 0, results: [] }),
        json: (data, meta) => ({ status: 200, data, meta }),
        error: (message, status) => ({ status, message }),
        logError: () => {},
        ...overrides,
    });
    return { handler, responses };
}

test("route returns unauthenticated response before scanner work", async () => {
    let scanned = false;
    const unauthorized = { status: 401 };
    const { handler } = routeHarness({
        requireSession: async () => ({ session: null, response: unauthorized }),
        scan: async () => {
            scanned = true;
        },
    });
    const response = await handler();
    assert.strictEqual(response, unauthorized);
    assert.equal(scanned, false);
});

test("route serves cached response before rate limiting", async () => {
    let rateLimitChecked = false;
    const cached = { scannedAt: "2026-07-11T10:00:00.000Z", results: [] };
    const { handler } = routeHarness({
        getCached: () => cached,
        enforceLimit: async () => {
            rateLimitChecked = true;
            return { response: { status: 429 } };
        },
    });
    const response = await handler();
    assert.equal(response.status, 200);
    assert.equal(response.meta.cacheStatus, "HIT");
    assert.equal(rateLimitChecked, false);
});

test("route returns rate-limit and upstream-failure responses", async () => {
    const limited = { status: 429 };
    const limitedHarness = routeHarness({
        enforceLimit: async () => ({ response: limited }),
    });
    assert.strictEqual(await limitedHarness.handler(), limited);

    const failedHarness = routeHarness({
        scan: async () => {
            throw new Error("Bitunix unavailable");
        },
    });
    const failed = await failedHarness.handler();
    assert.equal(failed.status, 502);
    assert.match(failed.message, /Scanner PWL/);
});

test("route forwards the requested level to cache lookup and scan", async () => {
    const seen = { cached: null, scanned: null };
    const { handler } = routeHarness({
        getCached: (level) => {
            seen.cached = level;
            return null;
        },
        scan: async (level) => {
            seen.scanned = level;
            return { level, candidateCount: 5, skippedCount: 0, results: [] };
        },
    });

    const response = await handler("pwh");

    assert.equal(seen.cached, "pwh");
    assert.equal(seen.scanned, "pwh");
    assert.equal(response.data.level, "pwh");
});

test("route preserves partial scanner success payload", async () => {
    const payload = {
        candidateCount: 30,
        skippedCount: 4,
        results: [{ symbol: "ARBUSDT" }],
    };
    const { handler } = routeHarness({ scan: async () => payload });
    const response = await handler();
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, payload);
});

test("20 concurrent route requests share one active scanner load", async () => {
    let loads = 0;
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    const cache = createSharedScannerCache({
        loadFresh: async () => {
            loads += 1;
            await pending;
            return { candidateCount: 30, skippedCount: 0, results: [] };
        },
    });
    const { handler } = routeHarness({
        getCached: cache.peek,
        scan: cache.scan,
    });

    const requests = Array.from({ length: 20 }, () => handler());
    await Promise.resolve();
    release();
    const responses = await Promise.all(requests);

    assert.equal(loads, 1);
    assert.equal(responses.length, 20);
    assert.ok(responses.every((response) => response.status === 200));
    assert.ok(responses.every((response) => response.data.candidateCount === 30));
});
