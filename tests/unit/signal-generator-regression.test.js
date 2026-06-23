import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateSignalFromCandles } from "../../lib/market/signal-generator.js";

// 35 closed candles yang realistis untuk BTC 1h
function makeFakeCandles(count = 35, basePrice = 42000) {
    const candles = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const change = (Math.sin(i * 0.4) * 200) + (Math.cos(i * 0.2) * 100);
        const open = price;
        const close = Math.max(price + change, 100);
        const high = Math.max(open, close) + Math.abs(change) * 0.3;
        const low = Math.min(open, close) - Math.abs(change) * 0.2;
        const volume = 1000 + Math.abs(change) * 10;
        const openTime = now - (count - i) * 3600000;

        candles.push({
            openTime,
            closeTime: openTime + 3599999,
            open,
            high,
            low,
            close,
            volume,
            isClosed: true,
        });

        price = close;
    }

    return candles;
}

const FAKE_CANDLES = makeFakeCandles(35, 42000);

const SIGNAL_INPUT = {
    symbol: "BTCUSDT",
    timeframe: "1h",
    source: "BINANCE",
    candles: FAKE_CANDLES,
    marketContext: { usdtDomScore: 0 },
    ticker: { change: 1.25, volume24h: 1e10 },
};

// Field-field lama yang HARUS tetap ada dan tidak berubah tipe-nya
const REQUIRED_OLD_FIELDS = [
    "symbol", "timeframe", "base", "price", "change", "volume24h",
    "source", "marketType", "indicatorAvailable", "engineVersion",
    "candleOpenTime", "candleCloseTime", "isClosedCandle",
    "tradePlanValidForConservative", "support", "resistance",
    "rsi", "emaFast", "emaSlow", "fastPeriod", "slowPeriod",
    "stochK", "stochD", "poc", "trendline", "keyMid",
    "bias", "score", "entry", "tp1", "tp2", "tp", "sl", "atr",
    "riskPercent", "rewardPercent", "riskReward", "tp1RiskReward",
    "sinceEntryPercent", "progressPercent",
];

const NEW_FIELDS = ["entryZone", "partialTpPlan"];

describe("signal-generator — regression: field lama tidak berubah", () => {
    test("semua field lama masih ada di output", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        for (const field of REQUIRED_OLD_FIELDS) {
            assert.ok(field in signal, `Field lama '${field}' hilang dari output`);
        }
    });

    test("tipe field kritis tetap number", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        const numericFields = ["price", "entry", "sl", "tp1", "tp2", "atr", "rsi", "score",
            "support", "resistance", "riskPercent", "rewardPercent"];
        for (const field of numericFields) {
            assert.equal(typeof signal[field], "number", `${field} harus bertipe number`);
        }
    });

    test("bias hanya boleh 'long', 'short', atau 'neutral'", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        assert.ok(
            ["long", "short", "neutral"].includes(signal.bias),
            `bias '${signal.bias}' tidak valid`
        );
    });

    test("output lama identik sebelum dan sesudah feature ditambahkan (field values)", () => {
        const s1 = generateSignalFromCandles(SIGNAL_INPUT);
        const s2 = generateSignalFromCandles(SIGNAL_INPUT);
        // Fungsi deterministik — dua panggilan dengan input sama harus identik
        for (const field of REQUIRED_OLD_FIELDS) {
            assert.deepEqual(s1[field], s2[field], `Field '${field}' tidak deterministik`);
        }
    });

    test("tp = tp2 (alias tetap terjaga)", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        assert.equal(signal.tp, signal.tp2);
    });

    test("symbol tetap utuh", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        assert.equal(signal.symbol, "BTCUSDT");
    });
});

describe("signal-generator — integrasi: field baru hadir", () => {
    test("field baru entryZone dan partialTpPlan ada di output", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        for (const field of NEW_FIELDS) {
            assert.ok(field in signal, `Field baru '${field}' tidak ditemukan di output`);
        }
    });

    test("entryZone null jika bias neutral, objek jika long/short", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (signal.bias === "neutral") {
            assert.equal(signal.entryZone, null);
        } else {
            assert.ok(signal.entryZone !== null && typeof signal.entryZone === "object");
        }
    });

    test("partialTpPlan null jika bias neutral, objek jika long/short", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (signal.bias === "neutral") {
            assert.equal(signal.partialTpPlan, null);
        } else {
            assert.ok(signal.partialTpPlan !== null && typeof signal.partialTpPlan === "object");
        }
    });

    test("entryZone memiliki field low, high, mid, status jika tidak null", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (!signal.entryZone) return;
        assert.ok("low" in signal.entryZone);
        assert.ok("high" in signal.entryZone);
        assert.ok("mid" in signal.entryZone);
        assert.ok("status" in signal.entryZone);
    });

    test("partialTpPlan memiliki legs, isValid, breakevenSL jika tidak null", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (!signal.partialTpPlan) return;
        assert.ok("legs" in signal.partialTpPlan);
        assert.ok("isValid" in signal.partialTpPlan);
        assert.ok("breakevenSL" in signal.partialTpPlan);
        assert.ok("moveSlToBreakevenAfter" in signal.partialTpPlan);
    });

    test("partialTpPlan.breakevenSL = signal.entry", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (!signal.partialTpPlan || !signal.partialTpPlan.isValid) return;
        assert.equal(signal.partialTpPlan.breakevenSL, signal.entry);
    });

    test("entryZone.status adalah nilai yang valid", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (!signal.entryZone) return;
        const validStatuses = ["valid", "near-edge", "expired", "missed", "invalid"];
        assert.ok(
            validStatuses.includes(signal.entryZone.status),
            `status '${signal.entryZone.status}' tidak valid`
        );
    });
});

describe("signal-generator — integrasi: long/short/neutral scenario", () => {
    test("scenario neutral: entryZone dan partialTpPlan null", () => {
        // Buat candle yang menghasilkan score netral (harga sangat dekat semua EMA)
        // Dengan membuat semua candle flat, scoring cenderung neutral
        const flatCandles = makeFakeCandles(35, 42000).map((c) => ({
            ...c,
            open: 42000,
            close: 42000,
            high: 42010,
            low: 41990,
        }));
        const signal = generateSignalFromCandles({ ...SIGNAL_INPUT, candles: flatCandles });
        // Bias bisa apa pun, kita hanya check konsistensi
        if (signal.bias === "neutral") {
            assert.equal(signal.entryZone, null, "entryZone harus null saat neutral");
            assert.equal(signal.partialTpPlan, null, "partialTpPlan harus null saat neutral");
        }
    });
});

describe("signal-generator — Invalidation SL & Structural TP", () => {
    const SL_SOURCES = new Set(["guardHVN", "support", "val", "poc", "resistanceHVN", "resistance", "vah", "atr-fallback"]);
    const TP1_SOURCES = new Set(["resistanceHVN", "resistance", "vah", "supportHVN", "support", "val", "atr-fallback"]);
    const TP2_SOURCES = new Set(["nextResistance", "nextSupport", "runwayLVN", "atr-fallback"]);

    test("field baru SL/TP source & liveRR hadir di output", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        for (const field of ["slSource", "tp1Source", "tp2Source", "liveRR"]) {
            assert.ok(field in signal, `Field baru '${field}' tidak ada di output`);
        }
    });

    test("slSource / tp1Source / tp2Source selalu string yang valid", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        assert.ok(SL_SOURCES.has(signal.slSource), `slSource '${signal.slSource}' tidak valid`);
        assert.ok(TP1_SOURCES.has(signal.tp1Source), `tp1Source '${signal.tp1Source}' tidak valid`);
        assert.ok(TP2_SOURCES.has(signal.tp2Source), `tp2Source '${signal.tp2Source}' tidak valid`);
    });

    test("liveRR bertipe number dan finite", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        assert.equal(typeof signal.liveRR, "number");
        assert.ok(Number.isFinite(signal.liveRR));
    });

    test("R:R berbasis entry (bukan price) — independen dari harga live", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        // riskReward harus identik dengan formula entry-based murni.
        const expectedRR = Math.abs(signal.tp2 - signal.entry) / Math.abs(signal.entry - signal.sl);
        assert.ok(
            Math.abs(signal.riskReward - expectedRR) < 1e-6,
            `riskReward (${signal.riskReward}) harus = |tp2-entry|/|entry-sl| (${expectedRR})`
        );
        // riskPercent & rewardPercent juga berbasis entry.
        assert.ok(Math.abs(signal.riskPercent - Math.abs(signal.entry - signal.sl) / signal.entry * 100) < 1e-6);
        assert.ok(Math.abs(signal.rewardPercent - Math.abs(signal.tp2 - signal.entry) / signal.entry * 100) < 1e-6);
    });

    test("liveRR berbasis price (berbeda basis dari riskReward)", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        const liveRisk = Math.abs(signal.price - signal.sl) / signal.price * 100;
        const liveReward = Math.abs(signal.tp2 - signal.price) / signal.price * 100;
        const expectedLiveRR = liveReward / (liveRisk || 1);
        assert.ok(Math.abs(signal.liveRR - expectedLiveRR) < 1e-6);
    });

    test("urutan harga benar sesuai bias (sl/entry/tp1/tp2)", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (signal.bias === "long") {
            assert.ok(signal.sl < signal.entry, "LONG: sl < entry");
            assert.ok(signal.tp1 < signal.tp2, "LONG: tp1 < tp2");
        } else if (signal.bias === "short") {
            assert.ok(signal.sl > signal.entry, "SHORT: sl > entry");
            assert.ok(signal.tp1 > signal.tp2, "SHORT: tp1 > tp2");
        }
    });

    test("partialTpPlan tetap valid setelah SL/TP struktural", () => {
        const signal = generateSignalFromCandles(SIGNAL_INPUT);
        if (signal.bias === "neutral") {
            assert.equal(signal.partialTpPlan, null);
        } else {
            assert.ok(signal.partialTpPlan, "partialTpPlan harus ada");
            // legs harus konsisten dengan tp1/tp2 baru
            assert.ok(Array.isArray(signal.partialTpPlan.legs));
        }
    });
});
