import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
    calculateInvalidationSL,
    calculateStructuralTP,
} from "../../lib/market/sl-tp.js";

const ATR = 100;
const ENTRY = 42000;

function approx(actual, expected, eps = 1e-6) {
    assert.ok(Math.abs(actual - expected) <= eps, `expected ~${expected}, got ${actual}`);
}

const SL_SOURCES = new Set(["guardHVN", "support", "val", "poc", "resistanceHVN", "resistance", "vah", "atr-fallback"]);
const TP1_SOURCES = new Set(["resistanceHVN", "resistance", "vah", "supportHVN", "support", "val", "atr-fallback"]);
const TP2_SOURCES = new Set(["nextResistance", "nextSupport", "runwayLVN", "atr-fallback"]);

describe("calculateInvalidationSL — LONG", () => {
    test("pilih invalidation level TERDEKAT yang lolos guardrail", () => {
        // guardHVN 1.2 ATR & support 2.5 ATR keduanya valid → pilih terdekat (guardHVN)
        const r = calculateInvalidationSL({
            bias: "long", entry: ENTRY, atr: ATR,
            guardHVN: 41880, support: 41750, val: 41600, poc: 41500,
        });
        assert.equal(r.slSource, "guardHVN");
        approx(r.sl, 41880 * (1 - 0.003)); // buffer 0.3% di bawah level
    });

    test("skip level terlalu sempit (< 0.5 ATR)", () => {
        const r = calculateInvalidationSL({
            bias: "long", entry: ENTRY, atr: ATR,
            guardHVN: 41980, support: 41800, val: 41600, poc: 41500, // guardHVN cuma 0.2 ATR
        });
        assert.equal(r.slSource, "support");
        approx(r.sl, 41800 * (1 - 0.003));
    });

    test("semua level terlalu jauh (> 3 ATR) → fallback ATR", () => {
        const r = calculateInvalidationSL({
            bias: "long", entry: ENTRY, atr: ATR,
            guardHVN: 41000, support: 40500, val: 40000, poc: 39000,
        });
        assert.equal(r.slSource, "atr-fallback");
        approx(r.sl, ENTRY - 2 * ATR);
    });

    test("tanpa level struktural → fallback ATR", () => {
        const r = calculateInvalidationSL({ bias: "long", entry: ENTRY, atr: ATR });
        assert.equal(r.slSource, "atr-fallback");
        approx(r.sl, ENTRY - 2 * ATR);
    });

    test("level di sisi salah (di atas entry) diabaikan", () => {
        const r = calculateInvalidationSL({
            bias: "long", entry: ENTRY, atr: ATR,
            guardHVN: 42200, support: 41800, // guardHVN di atas entry → invalid utk long
        });
        assert.equal(r.slSource, "support");
    });
});

describe("calculateInvalidationSL — SHORT", () => {
    test("pilih resistanceHVN terdekat di atas entry + buffer", () => {
        const r = calculateInvalidationSL({
            bias: "short", entry: ENTRY, atr: ATR,
            resistanceHVN: 42100, resistance: 42300, vah: 42400, poc: 42500,
        });
        assert.equal(r.slSource, "resistanceHVN");
        approx(r.sl, 42100 * (1 + 0.003)); // buffer di atas level
    });

    test("fallback ATR ke arah atas", () => {
        const r = calculateInvalidationSL({ bias: "short", entry: ENTRY, atr: ATR });
        assert.equal(r.slSource, "atr-fallback");
        approx(r.sl, ENTRY + 2 * ATR);
    });
});

describe("calculateInvalidationSL — edge cases", () => {
    test("neutral → fallback ATR", () => {
        const r = calculateInvalidationSL({ bias: "neutral", entry: ENTRY, atr: ATR });
        assert.equal(r.slSource, "atr-fallback");
    });

    test("ATR 0 / invalid → pakai floor 0.5% entry, tetap jalan", () => {
        // floor ATR = 42000*0.005 = 210 → guardrail 105..630; support 200 below valid
        const r = calculateInvalidationSL({ bias: "long", entry: ENTRY, atr: 0, support: 41800 });
        assert.equal(r.slSource, "support");
        approx(r.sl, 41800 * (1 - 0.003));
    });

    test("slSource selalu string yang valid", () => {
        const cases = [
            { bias: "long", entry: ENTRY, atr: ATR, guardHVN: 41880 },
            { bias: "short", entry: ENTRY, atr: ATR },
            { bias: "neutral", entry: ENTRY, atr: ATR },
        ];
        for (const c of cases) {
            const r = calculateInvalidationSL(c);
            assert.ok(SL_SOURCES.has(r.slSource), `slSource '${r.slSource}' tidak valid`);
            assert.equal(typeof r.sl, "number");
        }
    });
});

describe("calculateStructuralTP — LONG", () => {
    test("anchor tp1 ke resistance terdekat, tp2 ke level berikutnya", () => {
        const r = calculateStructuralTP({
            bias: "long", entry: ENTRY, atr: ATR,
            resistanceHVN: 42150, resistance: 42300, vah: 42500, runwayLVN: 42500,
        });
        assert.equal(r.tp1, 42150);
        assert.equal(r.tp1Source, "resistanceHVN");
        assert.equal(r.tp2, 42300);
        assert.equal(r.tp2Source, "nextResistance");
    });

    test("tp2 dari runwayLVN saat tidak ada resistance lain", () => {
        const r = calculateStructuralTP({
            bias: "long", entry: ENTRY, atr: ATR,
            resistanceHVN: 42200, runwayLVN: 42600,
        });
        assert.equal(r.tp1Source, "resistanceHVN");
        assert.equal(r.tp2, 42600);
        assert.equal(r.tp2Source, "runwayLVN");
    });

    test("tanpa level → fallback 2.4 / 4 ATR", () => {
        const r = calculateStructuralTP({ bias: "long", entry: ENTRY, atr: ATR });
        approx(r.tp1, ENTRY + 2.4 * ATR);
        approx(r.tp2, ENTRY + 4 * ATR);
        assert.equal(r.tp1Source, "atr-fallback");
        assert.equal(r.tp2Source, "atr-fallback");
    });

    test("tp1 terlalu dekat (< 0.5 ATR) di-skip; urutan tp2 > tp1 dijaga", () => {
        const r = calculateStructuralTP({
            bias: "long", entry: ENTRY, atr: ATR,
            resistanceHVN: 42030, resistance: 42700, // 42030 hanya 0.3 ATR → skip
        });
        assert.equal(r.tp1, 42700);
        assert.equal(r.tp1Source, "resistance");
        assert.ok(r.tp2 > r.tp1, "tp2 harus > tp1");
        approx(r.tp2, 42700 + ATR); // dipaksa tp1 + 1 ATR
    });

    test("tp1 selalu < tp2", () => {
        const r = calculateStructuralTP({
            bias: "long", entry: ENTRY, atr: ATR, resistanceHVN: 42150,
        });
        assert.ok(r.tp1 < r.tp2);
    });
});

describe("calculateStructuralTP — SHORT", () => {
    test("anchor tp1 ke support terdekat, tp2 ke level berikutnya (mirror)", () => {
        const r = calculateStructuralTP({
            bias: "short", entry: ENTRY, atr: ATR,
            supportHVN: 41850, support: 41700, val: 41500, runwayLVN: 41400,
        });
        assert.equal(r.tp1, 41850);
        assert.equal(r.tp1Source, "supportHVN");
        assert.equal(r.tp2, 41700);
        assert.equal(r.tp2Source, "nextSupport");
    });

    test("tp1 selalu > tp2 (arah turun)", () => {
        const r = calculateStructuralTP({
            bias: "short", entry: ENTRY, atr: ATR, supportHVN: 41850,
        });
        assert.ok(r.tp1 > r.tp2);
    });
});

describe("calculateStructuralTP — edge cases", () => {
    test("neutral → fallback ATR", () => {
        const r = calculateStructuralTP({ bias: "neutral", entry: ENTRY, atr: ATR });
        assert.equal(r.tp1Source, "atr-fallback");
        assert.equal(r.tp2Source, "atr-fallback");
    });

    test("source selalu string valid", () => {
        const cases = [
            { bias: "long", entry: ENTRY, atr: ATR, resistanceHVN: 42150 },
            { bias: "short", entry: ENTRY, atr: ATR, supportHVN: 41850 },
            { bias: "long", entry: ENTRY, atr: ATR },
        ];
        for (const c of cases) {
            const r = calculateStructuralTP(c);
            assert.ok(TP1_SOURCES.has(r.tp1Source), `tp1Source '${r.tp1Source}' tidak valid`);
            assert.ok(TP2_SOURCES.has(r.tp2Source), `tp2Source '${r.tp2Source}' tidak valid`);
            assert.equal(typeof r.tp1, "number");
            assert.equal(typeof r.tp2, "number");
        }
    });
});
