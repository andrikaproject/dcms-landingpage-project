import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildFeatureFingerprint } from "../../lib/learning/feature-fingerprint.js";

const BASE = {
    symbol: "BTCUSDT",
    timeframe: "15m",
    bias: "long",
    source: "BINANCE",
    price: 65000,
    emaFast: 64800,
    emaSlow: 64200,
    stochK: 55,
    stochD: 48,
    poc: 64500,
    trendline: "bullish",
    usdtDominanceLabel: "low",
    riskReward: 2.5,
    entry: 65100,
    atr: 800,
};

describe("buildFeatureFingerprint", () => {
    test("returns 14-segment pipe-delimited string", () => {
        const fp = buildFeatureFingerprint(BASE);
        const parts = fp.split("|");
        assert.equal(parts.length, 14, `Expected 14 segments, got ${parts.length}: ${fp}`);
    });

    test("first segment is symbol uppercased", () => {
        const fp = buildFeatureFingerprint({ ...BASE, symbol: "ethusdt" });
        assert.equal(fp.split("|")[0], "ETHUSDT");
    });

    test("second segment is timeframe", () => {
        const fp = buildFeatureFingerprint({ ...BASE, timeframe: "4h" });
        assert.equal(fp.split("|")[1], "4h");
    });

    test("third segment is bias normalized", () => {
        const fp = buildFeatureFingerprint({ ...BASE, bias: "SHORT" });
        assert.equal(fp.split("|")[2], "short");
    });

    test("fourth segment is source uppercased", () => {
        const fp = buildFeatureFingerprint({ ...BASE, source: "bybit" });
        assert.equal(fp.split("|")[3], "BYBIT");
    });

    test("ema alignment: emaFast > emaSlow → ema_bullish", () => {
        const fp = buildFeatureFingerprint({ ...BASE, emaFast: 65000, emaSlow: 64000 });
        const parts = fp.split("|");
        assert.equal(parts[6], "ema_bullish");
    });

    test("ema alignment: emaFast < emaSlow → ema_bearish", () => {
        const fp = buildFeatureFingerprint({ ...BASE, emaFast: 63000, emaSlow: 64500 });
        const parts = fp.split("|");
        assert.equal(parts[6], "ema_bearish");
    });

    test("stoch overbought: k >= 80 and d >= 80", () => {
        const fp = buildFeatureFingerprint({ ...BASE, stochK: 85, stochD: 82 });
        const parts = fp.split("|");
        assert.match(parts[7], /^stoch_overbought/);
    });

    test("stoch oversold: k <= 20 and d <= 20", () => {
        const fp = buildFeatureFingerprint({ ...BASE, stochK: 15, stochD: 18 });
        const parts = fp.split("|");
        assert.match(parts[7], /^stoch_oversold/);
    });

    test("risk-reward bucket: rr < 1.2 → rr_low", () => {
        const fp = buildFeatureFingerprint({ ...BASE, riskReward: 1.0 });
        const parts = fp.split("|");
        assert.equal(parts[11], "rr_low");
    });

    test("risk-reward bucket: 1.2 <= rr < 2 → rr_medium", () => {
        const fp = buildFeatureFingerprint({ ...BASE, riskReward: 1.5 });
        const parts = fp.split("|");
        assert.equal(parts[11], "rr_medium");
    });

    test("risk-reward bucket: rr >= 2 → rr_high", () => {
        const fp = buildFeatureFingerprint({ ...BASE, riskReward: 2.0 });
        const parts = fp.split("|");
        assert.equal(parts[11], "rr_high");
    });

    test("missing values produce _unknown segments", () => {
        const fp = buildFeatureFingerprint({});
        const parts = fp.split("|");
        assert.equal(parts.length, 14);
        assert.match(parts[4], /unknown/);
        assert.match(parts[7], /unknown/);
        assert.equal(parts[11], "rr_unknown");
        assert.equal(parts[12], "entry_unknown");
        assert.equal(parts[13], "atr_unknown");
    });

    test("same signal always produces same fingerprint (deterministic)", () => {
        const fp1 = buildFeatureFingerprint(BASE);
        const fp2 = buildFeatureFingerprint(BASE);
        assert.equal(fp1, fp2);
    });

    test("different symbols produce different fingerprints", () => {
        const fp1 = buildFeatureFingerprint({ ...BASE, symbol: "BTCUSDT" });
        const fp2 = buildFeatureFingerprint({ ...BASE, symbol: "ETHUSDT" });
        assert.notEqual(fp1, fp2);
    });
});
