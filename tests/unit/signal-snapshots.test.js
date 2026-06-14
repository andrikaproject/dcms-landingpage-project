import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isLearningSignal } from "../../lib/learning/snapshot-utils.js";

const VALID_SIGNAL = {
    marketType: "CEX",
    indicatorAvailable: true,
    source: "BINANCE",
    engineVersion: "v1.2",
    candleCloseTime: 1718000000000,
};

describe("isLearningSignal", () => {
    test("returns true for valid CEX signal", () => {
        assert.equal(isLearningSignal(VALID_SIGNAL), true);
    });

    test("returns true for BYBIT source", () => {
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, source: "BYBIT" }), true);
    });

    test("returns false when marketType is DEX", () => {
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, marketType: "DEX" }), false);
    });

    test("returns false when indicatorAvailable is false", () => {
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, indicatorAvailable: false }), false);
    });

    test("returns false for unknown source", () => {
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, source: "KRAKEN" }), false);
    });

    test("returns false when engineVersion is missing", () => {
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, engineVersion: "" }), false);
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, engineVersion: null }), false);
    });

    test("returns false when candleCloseTime is non-finite", () => {
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, candleCloseTime: NaN }), false);
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, candleCloseTime: null }), false);
        assert.equal(isLearningSignal({ ...VALID_SIGNAL, candleCloseTime: "invalid" }), false);
    });

    test("returns false for null signal", () => {
        assert.equal(isLearningSignal(null), false);
    });

    test("returns false for empty object", () => {
        assert.equal(isLearningSignal({}), false);
    });
});
