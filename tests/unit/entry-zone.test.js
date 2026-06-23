import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateEntryZone } from "../../lib/market/entry-zone.js";

const BASE_LONG = {
    bias: "long",
    entry: 42300,
    atr: 300,
    support: 41800,
    resistance: 43200,
    price: 42350,
};

const BASE_SHORT = {
    bias: "short",
    entry: 42300,
    atr: 300,
    support: 41800,
    resistance: 43200,
    price: 42250,
};

describe("calculateEntryZone — bias neutral / data tidak valid", () => {
    test("returns null jika bias neutral", () => {
        const result = calculateEntryZone({ ...BASE_LONG, bias: "neutral" });
        assert.equal(result, null);
    });

    test("returns null jika atr = 0", () => {
        const result = calculateEntryZone({ ...BASE_LONG, atr: 0 });
        assert.equal(result, null);
    });

    test("returns null jika atr = null", () => {
        const result = calculateEntryZone({ ...BASE_LONG, atr: null });
        assert.equal(result, null);
    });
});

describe("calculateEntryZone — LONG: struktur output", () => {
    test("mengembalikan objek dengan low, high, mid, status", () => {
        const result = calculateEntryZone(BASE_LONG);
        assert.ok(result, "result tidak boleh null");
        assert.ok("low" in result, "harus ada field low");
        assert.ok("high" in result, "harus ada field high");
        assert.ok("mid" in result, "harus ada field mid");
        assert.ok("status" in result, "harus ada field status");
    });

    test("low < high untuk LONG", () => {
        const result = calculateEntryZone(BASE_LONG);
        assert.ok(result.low < result.high, `low (${result.low}) harus < high (${result.high})`);
    });

    test("mid adalah midpoint dari low dan high", () => {
        const result = calculateEntryZone(BASE_LONG);
        const expected = (result.low + result.high) / 2;
        assert.equal(result.mid, expected);
    });

    test("zoneHigh tidak melewati resistance * 0.995 untuk LONG", () => {
        const result = calculateEntryZone(BASE_LONG);
        assert.ok(
            result.high <= BASE_LONG.resistance * 0.995,
            `zoneHigh (${result.high}) harus <= resistance*0.995 (${BASE_LONG.resistance * 0.995})`
        );
    });

    test("zoneLow tidak kurang dari support * 1.005 untuk LONG", () => {
        const result = calculateEntryZone(BASE_LONG);
        assert.ok(
            result.low >= BASE_LONG.support * 1.005,
            `zoneLow (${result.low}) harus >= support*1.005 (${BASE_LONG.support * 1.005})`
        );
    });
});

describe("calculateEntryZone — SHORT: struktur output", () => {
    test("low < high untuk SHORT", () => {
        const result = calculateEntryZone(BASE_SHORT);
        assert.ok(result.low < result.high, `low (${result.low}) harus < high (${result.high})`);
    });

    test("zoneHigh tidak melewati resistance * 0.995 untuk SHORT", () => {
        const result = calculateEntryZone(BASE_SHORT);
        assert.ok(
            result.high <= BASE_SHORT.resistance * 0.995,
            `zoneHigh (${result.high}) harus <= resistance*0.995`
        );
    });

    test("zoneLow tidak kurang dari support * 1.005 untuk SHORT", () => {
        const result = calculateEntryZone(BASE_SHORT);
        assert.ok(
            result.low >= BASE_SHORT.support * 1.005,
            `zoneLow (${result.low}) harus >= support*1.005`
        );
    });

    test("SHORT menghasilkan zona yang berbeda arah dari LONG", () => {
        const long = calculateEntryZone(BASE_LONG);
        const short = calculateEntryZone(BASE_SHORT);
        // SHORT lebih ketat ke atas (zoneHigh lebih sempit)
        assert.ok(short.high <= long.high, "SHORT zoneHigh harus lebih sempit dari LONG");
    });
});

describe("calculateEntryZone — status zona LONG", () => {
    test("status 'valid' jika harga di dalam zona", () => {
        const result = calculateEntryZone({ ...BASE_LONG, price: BASE_LONG.entry });
        assert.equal(result.status, "valid");
    });

    test("status 'expired' jika harga naik melewati zoneHigh (LONG)", () => {
        const result = calculateEntryZone({ ...BASE_LONG, price: 99999 });
        assert.equal(result.status, "expired");
    });

    test("status 'missed' jika harga turun melewati zoneLow (LONG)", () => {
        const result = calculateEntryZone({ ...BASE_LONG, price: 1 });
        assert.equal(result.status, "missed");
    });

    test("status 'near-edge' jika harga mendekati zoneHigh (dalam 0.3%)", () => {
        // Hitung zona dulu untuk tahu exact zoneHigh
        const zone = calculateEntryZone({ ...BASE_LONG, price: BASE_LONG.entry });
        // Set price tepat di batas near-edge (0.2% di bawah zoneHigh)
        const nearEdgePrice = zone.high * (1 - 0.002);
        const result = calculateEntryZone({ ...BASE_LONG, price: nearEdgePrice });
        assert.equal(result.status, "near-edge");
    });
});

describe("calculateEntryZone — status zona SHORT", () => {
    test("status 'valid' jika harga di dalam zona", () => {
        const result = calculateEntryZone({ ...BASE_SHORT, price: BASE_SHORT.entry });
        assert.equal(result.status, "valid");
    });

    test("status 'expired' jika harga turun melewati zoneLow (SHORT)", () => {
        const result = calculateEntryZone({ ...BASE_SHORT, price: 1 });
        assert.equal(result.status, "expired");
    });

    test("status 'missed' jika harga naik melewati zoneHigh (SHORT)", () => {
        const result = calculateEntryZone({ ...BASE_SHORT, price: 99999 });
        assert.equal(result.status, "missed");
    });

    test("status 'near-edge' jika harga mendekati zoneLow (SHORT, dalam 0.3%)", () => {
        const zone = calculateEntryZone({ ...BASE_SHORT, price: BASE_SHORT.entry });
        const nearEdgePrice = zone.low * (1 + 0.002);
        const result = calculateEntryZone({ ...BASE_SHORT, price: nearEdgePrice });
        assert.equal(result.status, "near-edge");
    });
});

describe("calculateEntryZone — fallback tanpa S/R", () => {
    test("tetap menghasilkan zona jika support = 0", () => {
        const result = calculateEntryZone({ ...BASE_LONG, support: 0, resistance: 0 });
        assert.ok(result, "harus tetap return zona meski S/R tidak ada");
        assert.ok(result.low < result.high);
    });

    test("tidak clamp ke S/R jika support/resistance invalid", () => {
        // Tanpa S/R, zoneLow = entry - atr*0.3 dan zoneHigh = entry + atr*0.5
        const { entry, atr } = BASE_LONG;
        const result = calculateEntryZone({ ...BASE_LONG, support: 0, resistance: 0, price: entry });
        assert.equal(result.low, entry - atr * 0.3);
        assert.equal(result.high, entry + atr * 0.5);
    });

    test("status 'invalid' jika zona inverted setelah clamp S/R ekstrem", () => {
        // S/R sangat ketat sehingga setelah clamp, high <= low
        const result = calculateEntryZone({
            bias: "long",
            entry: 42300,
            atr: 300,
            support: 42250, // support hampir sama dengan entry
            resistance: 42280, // resistance di bawah entry + atr*0.5
            price: 42300,
        });
        // zoneHigh capped di 42280*0.995 = 42068.6 < zoneLow = max(42300-90, 42250*1.005=42461.25)
        assert.equal(result.status, "invalid");
    });
});
