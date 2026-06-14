import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkCandleOutcome, isResolvable } from "../../lib/learning/candle-math.js";

describe("isResolvable", () => {
    test("returns true when tp1 and sl are valid positive numbers", () => {
        assert.equal(isResolvable({ tp1: "67000", sl: "63000" }), true);
    });

    test("returns false when tp1 is zero", () => {
        assert.equal(isResolvable({ tp1: "0", sl: "63000" }), false);
    });

    test("returns false when sl is missing", () => {
        assert.equal(isResolvable({ tp1: "67000", sl: null }), false);
    });

    test("returns false when values are non-numeric strings", () => {
        assert.equal(isResolvable({ tp1: "abc", sl: "xyz" }), false);
    });

    test("returns false when both are zero", () => {
        assert.equal(isResolvable({ tp1: 0, sl: 0 }), false);
    });
});

describe("checkCandleOutcome — LONG bias", () => {
    const tp1 = 67000;
    const sl = 63000;

    test("WIN: candle high reaches tp1", () => {
        const result = checkCandleOutcome({ high: 67500, low: 64000 }, tp1, sl, "long");
        assert.equal(result, "WIN");
    });

    test("LOSS: candle low breaches sl", () => {
        const result = checkCandleOutcome({ high: 65500, low: 62500 }, tp1, sl, "long");
        assert.equal(result, "LOSS");
    });

    test("AMBIGUOUS: candle hits both tp1 and sl", () => {
        const result = checkCandleOutcome({ high: 68000, low: 62000 }, tp1, sl, "long");
        assert.equal(result, "AMBIGUOUS");
    });

    test("null: candle neither hits tp1 nor sl", () => {
        const result = checkCandleOutcome({ high: 66000, low: 64000 }, tp1, sl, "long");
        assert.equal(result, null);
    });

    test("WIN: candle high exactly equals tp1", () => {
        const result = checkCandleOutcome({ high: 67000, low: 65000 }, tp1, sl, "long");
        assert.equal(result, "WIN");
    });

    test("LOSS: candle low exactly equals sl", () => {
        const result = checkCandleOutcome({ high: 65000, low: 63000 }, tp1, sl, "long");
        assert.equal(result, "LOSS");
    });
});

describe("checkCandleOutcome — SHORT bias", () => {
    const tp1 = 61000;
    const sl = 67000;

    test("WIN: candle low reaches tp1", () => {
        const result = checkCandleOutcome({ high: 65000, low: 60500 }, tp1, sl, "short");
        assert.equal(result, "WIN");
    });

    test("LOSS: candle high breaches sl", () => {
        const result = checkCandleOutcome({ high: 68000, low: 63000 }, tp1, sl, "short");
        assert.equal(result, "LOSS");
    });

    test("AMBIGUOUS: candle hits both directions", () => {
        const result = checkCandleOutcome({ high: 68000, low: 60000 }, tp1, sl, "short");
        assert.equal(result, "AMBIGUOUS");
    });

    test("null: candle in neutral zone", () => {
        const result = checkCandleOutcome({ high: 65000, low: 62000 }, tp1, sl, "short");
        assert.equal(result, null);
    });
});

describe("checkCandleOutcome — edge cases", () => {
    test("unknown bias returns null", () => {
        const result = checkCandleOutcome({ high: 70000, low: 60000 }, 67000, 63000, "neutral");
        assert.equal(result, null);
    });

    test("null bias returns null", () => {
        const result = checkCandleOutcome({ high: 70000, low: 60000 }, 67000, 63000, null);
        assert.equal(result, null);
    });
});
