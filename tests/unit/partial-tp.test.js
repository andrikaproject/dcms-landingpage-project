import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildPartialTpPlan } from "../../lib/market/partial-tp.js";

const BASE_LONG = {
    bias: "long",
    entry: 42300,
    sl: 41673,
    tp1: 42741,
    tp2: 43147,
    atr: 313,
};

const BASE_SHORT = {
    bias: "short",
    entry: 42300,
    sl: 42927,
    tp1: 41929,
    tp2: 41523,
    atr: 313,
};

describe("buildPartialTpPlan — bias neutral", () => {
    test("returns null jika bias neutral", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, bias: "neutral" });
        assert.equal(result, null);
    });
});

describe("buildPartialTpPlan — LONG: output valid", () => {
    test("mengembalikan objek dengan semua field wajib", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        assert.ok(result, "result tidak boleh null");
        assert.ok("isValid" in result);
        assert.ok("invalidReason" in result);
        assert.ok("warning" in result);
        assert.ok("legs" in result);
        assert.ok("moveSlToBreakevenAfter" in result);
        assert.ok("breakevenSL" in result);
    });

    test("isValid = true untuk setup LONG valid", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        assert.equal(result.isValid, true);
    });

    test("legs berisi 2 entry: tp1 (70%) dan tp2 (30%)", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        assert.equal(result.legs.length, 2);
        assert.equal(result.legs[0].level, "tp1");
        assert.equal(result.legs[0].allocationPct, 70);
        assert.equal(result.legs[1].level, "tp2");
        assert.equal(result.legs[1].allocationPct, 30);
    });

    test("total alokasi = 100%", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        const total = result.legs.reduce((sum, leg) => sum + leg.allocationPct, 0);
        assert.equal(total, 100);
    });

    test("legs[0].price = tp1, legs[1].price = tp2", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        assert.equal(result.legs[0].price, BASE_LONG.tp1);
        assert.equal(result.legs[1].price, BASE_LONG.tp2);
    });

    test("moveSlToBreakevenAfter = 'tp1'", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        assert.equal(result.moveSlToBreakevenAfter, "tp1");
    });

    test("breakevenSL = entry", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        assert.equal(result.breakevenSL, BASE_LONG.entry);
    });

    test("warning = null jika SL jarak normal", () => {
        const result = buildPartialTpPlan(BASE_LONG);
        assert.equal(result.warning, null);
    });
});

describe("buildPartialTpPlan — SHORT: output valid", () => {
    test("isValid = true untuk setup SHORT valid", () => {
        const result = buildPartialTpPlan(BASE_SHORT);
        assert.equal(result.isValid, true);
    });

    test("legs[0].price = tp1 (lebih rendah dari entry untuk SHORT)", () => {
        const result = buildPartialTpPlan(BASE_SHORT);
        assert.ok(result.legs[0].price < BASE_SHORT.entry);
        assert.equal(result.legs[0].price, BASE_SHORT.tp1);
    });

    test("breakevenSL = entry untuk SHORT", () => {
        const result = buildPartialTpPlan(BASE_SHORT);
        assert.equal(result.breakevenSL, BASE_SHORT.entry);
    });
});

describe("buildPartialTpPlan — edge case: TP1 = TP2", () => {
    test("isValid = false jika tp1 === tp2", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, tp2: BASE_LONG.tp1 });
        assert.equal(result.isValid, false);
    });

    test("invalidReason = 'TP1_EQUALS_TP2'", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, tp2: BASE_LONG.tp1 });
        assert.equal(result.invalidReason, "TP1_EQUALS_TP2");
    });

    test("tetap mengembalikan 1 leg dengan 100% saat TP1 = TP2", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, tp2: BASE_LONG.tp1 });
        assert.equal(result.legs.length, 1);
        assert.equal(result.legs[0].allocationPct, 100);
    });
});

describe("buildPartialTpPlan — edge case: harga tidak urut", () => {
    test("isValid = false jika tp1 > tp2 untuk LONG (tp2 lebih kecil dari tp1)", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, tp1: 43200, tp2: 42800 });
        assert.equal(result.isValid, false);
        assert.equal(result.invalidReason, "PRICE_NOT_ORDERED");
    });

    test("isValid = false jika sl > entry untuk LONG", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, sl: 43000 });
        assert.equal(result.isValid, false);
        assert.equal(result.invalidReason, "PRICE_NOT_ORDERED");
    });

    test("isValid = false jika tp1 < tp2 untuk SHORT (tp2 lebih besar dari tp1)", () => {
        const result = buildPartialTpPlan({ ...BASE_SHORT, tp1: 41500, tp2: 41800 });
        assert.equal(result.isValid, false);
        assert.equal(result.invalidReason, "PRICE_NOT_ORDERED");
    });

    test("legs kosong saat PRICE_NOT_ORDERED", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, sl: 43000 });
        assert.equal(result.legs.length, 0);
    });
});

describe("buildPartialTpPlan — edge case: SL terlalu dekat", () => {
    test("isValid = true meski SL terlalu dekat", () => {
        // SL hanya 10 dari entry, atr = 313, threshold = 313 * 0.5 = 156.5
        const result = buildPartialTpPlan({ ...BASE_LONG, sl: BASE_LONG.entry - 10 });
        assert.equal(result.isValid, true);
    });

    test("warning = 'SL_TOO_CLOSE' jika |entry - sl| < atr * 0.5", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, sl: BASE_LONG.entry - 10 });
        assert.equal(result.warning, "SL_TOO_CLOSE");
    });

    test("warning = null jika jarak SL normal (>= atr * 0.5)", () => {
        // |entry - sl| = 627, atr * 0.5 = 156.5 → normal
        const result = buildPartialTpPlan(BASE_LONG);
        assert.equal(result.warning, null);
    });

    test("warning = null jika atr tidak diberikan", () => {
        const result = buildPartialTpPlan({ ...BASE_LONG, atr: undefined, sl: BASE_LONG.entry - 10 });
        assert.equal(result.warning, null);
    });
});

describe("buildPartialTpPlan — immutability", () => {
    test("tidak memutasi input tp1/tp2", () => {
        const input = { ...BASE_LONG };
        const tp1Before = input.tp1;
        const tp2Before = input.tp2;
        buildPartialTpPlan(input);
        assert.equal(input.tp1, tp1Before);
        assert.equal(input.tp2, tp2Before);
    });
});
