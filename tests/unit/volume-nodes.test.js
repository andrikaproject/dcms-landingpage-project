import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
    DEFAULT_NODE_CONFIG,
    detectVolumeNodes,
    analyzeVolumeNodes,
    buildNodeEntry,
} from "../../lib/market/volume-nodes.js";

/**
 * Membangun candle sintetis dengan dua konsentrasi volume (HVN) di sekitar
 * lowBand & highBand, dan gap volume tipis (LVN) di antaranya.
 */
function makeBimodalCandles() {
    const candles = [];
    const push = (price, volume) => {
        candles.push({ high: price + 5, low: price - 5, volume });
    };
    // Konsentrasi bawah ~100 (HVN kuat)
    for (let i = 0; i < 40; i += 1) push(100 + (i % 3), 5000);
    // Zona tengah ~150 (LVN — volume tipis)
    for (let i = 0; i < 4; i += 1) push(150 + (i % 2), 50);
    // Konsentrasi atas ~200 (HVN kuat)
    for (let i = 0; i < 40; i += 1) push(200 + (i % 3), 4500);
    return candles;
}

function toArrays(candles) {
    return {
        highs: candles.map((c) => c.high),
        lows: candles.map((c) => c.low),
        volumes: candles.map((c) => c.volume),
    };
}

describe("detectVolumeNodes", () => {
    test("mengembalikan struktur kosong untuk input invalid", () => {
        assert.deepEqual(detectVolumeNodes({}), { hvn: [], lvn: [] });
        assert.deepEqual(
            detectVolumeNodes({ highs: [], lows: [], volumes: [] }),
            { hvn: [], lvn: [] }
        );
    });

    test("range harga datar (step 0) tidak crash", () => {
        const flat = detectVolumeNodes({
            highs: [100, 100, 100],
            lows: [100, 100, 100],
            volumes: [1, 2, 3],
        });
        assert.deepEqual(flat, { hvn: [], lvn: [] });
    });

    test("mendeteksi HVN di kedua konsentrasi volume", () => {
        const { hvn, lvn } = detectVolumeNodes(toArrays(makeBimodalCandles()));
        assert.ok(hvn.length >= 2, "harus menemukan minimal 2 HVN");

        // Salah satu HVN dekat 100, satu lagi dekat 200
        const hasLow = hvn.some((n) => Math.abs(n.price - 100) < 15);
        const hasHigh = hvn.some((n) => Math.abs(n.price - 200) < 15);
        assert.ok(hasLow && hasHigh, "HVN harus berada di kedua zona konsentrasi");

        // Ada LVN di gap tengah (~150)
        assert.ok(lvn.length >= 1, "harus menemukan minimal 1 LVN");
        assert.ok(lvn.some((n) => n.price > 120 && n.price < 180), "LVN berada di gap tengah");
    });

    test("HVN diurutkan dari yang terkuat & strength 0-100", () => {
        const { hvn } = detectVolumeNodes(toArrays(makeBimodalCandles()));
        for (let i = 1; i < hvn.length; i += 1) {
            assert.ok(hvn[i - 1].strength >= hvn[i].strength, "HVN harus terurut desc");
        }
        for (const n of hvn) {
            assert.ok(n.strength >= 0 && n.strength <= 100);
        }
    });

    test("menghormati batas jumlah node (maxHighNodes)", () => {
        const { hvn } = detectVolumeNodes({
            ...toArrays(makeBimodalCandles()),
            config: { maxHighNodes: 1 },
        });
        assert.equal(hvn.length, 1);
    });
});

describe("analyzeVolumeNodes", () => {
    const hvn = [
        { price: 100, strength: 100 },
        { price: 200, strength: 80 },
    ];
    const lvn = [{ price: 150, strength: 5 }];

    test("HVN support di bawah harga → nodeScore bullish", () => {
        const ctx = analyzeVolumeNodes({ price: 101, hvn, lvn });
        assert.equal(ctx.supportHVN, 100);
        assert.equal(ctx.nodeScore, 1);
    });

    test("HVN resistance di atas harga → nodeScore bearish", () => {
        const ctx = analyzeVolumeNodes({ price: 199, hvn, lvn });
        assert.equal(ctx.resistanceHVN, 200);
        assert.equal(ctx.nodeScore, -1);
    });

    test("node terlalu jauh (> proximityPct) tidak memengaruhi skor", () => {
        const ctx = analyzeVolumeNodes({ price: 150, hvn, lvn });
        assert.equal(ctx.nodeScore, 0);
    });

    test("price invalid → konteks netral", () => {
        const ctx = analyzeVolumeNodes({ price: NaN, hvn, lvn });
        assert.equal(ctx.nodeScore, 0);
        assert.equal(ctx.supportHVN, null);
    });
});

describe("buildNodeEntry", () => {
    test("bias neutral → null", () => {
        assert.equal(buildNodeEntry({ bias: "neutral", context: {} }), null);
    });

    test("long dengan support konfluen + runway LVN di atas → strong", () => {
        const context = {
            supportHVN: 100,
            resistanceHVN: 200,
            nearestLVNAbove: 150,
            nearestLVNBelow: null,
            nodeScore: 1,
        };
        const entry = buildNodeEntry({ bias: "long", context });
        assert.equal(entry.confluence, "strong");
        assert.equal(entry.guardHVN, 100);
        assert.equal(entry.runwayLVN, 150);
    });

    test("long tanpa runway → moderate", () => {
        const context = {
            supportHVN: 100, resistanceHVN: 200,
            nearestLVNAbove: null, nearestLVNBelow: 80, nodeScore: 1,
        };
        assert.equal(buildNodeEntry({ bias: "long", context }).confluence, "moderate");
    });

    test("tanpa konfluensi searah bias → none", () => {
        const context = {
            supportHVN: 100, resistanceHVN: 200,
            nearestLVNAbove: 150, nearestLVNBelow: null, nodeScore: 0,
        };
        assert.equal(buildNodeEntry({ bias: "long", context }).confluence, "none");
    });
});

describe("DEFAULT_NODE_CONFIG — sesuai setting TradingView", () => {
    test("nilai cocok dengan screenshot", () => {
        assert.equal(DEFAULT_NODE_CONFIG.peakLookbackPct, 0.12);
        assert.equal(DEFAULT_NODE_CONFIG.troughLookbackPct, 0.10);
        assert.equal(DEFAULT_NODE_CONFIG.thresholdPct, 0.05);
        assert.equal(DEFAULT_NODE_CONFIG.maxHighNodes, 3);
        assert.equal(DEFAULT_NODE_CONFIG.maxLowNodes, 3);
    });
});
