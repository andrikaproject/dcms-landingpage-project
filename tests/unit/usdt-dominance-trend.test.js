import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
    calculateUsdtDominanceTrendContext,
    getNeutralUsdtDominanceTrendContext,
} from "../../lib/market/usdt-dominance-trend.js";

describe("usdt-dominance-trend", () => {
    test("bullish HTF ignores noisy 15m rise", () => {
        const context = calculateUsdtDominanceTrendContext({
            "4h": { changePct: -1.2 },
            "1h": { changePct: -0.4 },
            "15m": { changePct: 0.1 },
        });

        assert.equal(context.score, 2.5);
        assert.equal(context.regime, "RISK_ON");
        assert.equal(context.alignment, "BULLISH_CRYPTO");
        assert.equal(context.components["4h"].score, 2);
        assert.equal(context.components["1h"].score, 0.5);
        assert.equal(context.components["15m"].score, 0);
        assert.deepEqual(context.warnings, []);
    });

    test("bearish aligned 15m adds small confirmation", () => {
        const context = calculateUsdtDominanceTrendContext({
            "4h": { changePct: 1.3 },
            "1h": { changePct: 0.6 },
            "15m": { changePct: 0.3 },
        });

        assert.equal(context.score, -3);
        assert.equal(context.regime, "RISK_OFF");
        assert.equal(context.alignment, "BEARISH_CRYPTO");
        assert.equal(context.components["4h"].score, -2);
        assert.equal(context.components["1h"].score, -0.5);
        assert.equal(context.components["15m"].score, -0.5);
    });

    test("15m against higher timeframe returns zero and warning", () => {
        const context = calculateUsdtDominanceTrendContext({
            "4h": { changePct: -1.2 },
            "1h": { changePct: -0.4 },
            "15m": { changePct: 0.3 },
        });

        assert.equal(context.score, 2.5);
        assert.equal(context.components["15m"].score, 0);
        assert.equal(context.components["15m"].reason, "15m ignored because against HTF");
        assert.ok(context.warnings.some((warning) => warning.includes("against risk-on")));
    });

    test("mixed higher timeframe makes 15m neutral", () => {
        const context = calculateUsdtDominanceTrendContext({
            "4h": { changePct: -0.1 },
            "1h": { changePct: 0.1 },
            "15m": { changePct: -0.4 },
        });

        assert.equal(context.score, 0);
        assert.equal(context.regime, "MIXED");
        assert.equal(context.components["15m"].score, 0);
        assert.equal(context.components["15m"].reason, "15m ignored because HTF is mixed");
    });

    test("missing input returns neutral unknown context", () => {
        const context = calculateUsdtDominanceTrendContext();

        assert.equal(context.score, 0);
        assert.equal(context.regime, "UNKNOWN");
        assert.equal(context.alignment, "UNKNOWN");
        assert.ok(context.warnings.includes("USDT.D trend data unavailable"));
    });

    test("invalid numbers return neutral components and warnings", () => {
        const context = calculateUsdtDominanceTrendContext({
            "4h": { changePct: "bad" },
            "1h": { changePct: null },
            "15m": { changePct: 0.1 },
        });

        assert.equal(context.score, 0);
        assert.equal(context.regime, "MIXED");
        assert.equal(context.components["4h"].score, 0);
        assert.equal(context.components["1h"].score, 0);
        assert.equal(context.components["15m"].score, 0);
        assert.ok(context.warnings.some((warning) => warning.includes("4h")));
        assert.ok(context.warnings.some((warning) => warning.includes("1h")));
    });

    test("neutral helper allows custom reason", () => {
        const context = getNeutralUsdtDominanceTrendContext("custom reason");

        assert.equal(context.score, 0);
        assert.equal(context.regime, "UNKNOWN");
        assert.deepEqual(context.warnings, ["custom reason"]);
    });
});
