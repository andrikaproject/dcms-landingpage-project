import assert from "node:assert/strict";
import test from "node:test";
import {
    applyLivePrice,
    describeTimeframeTrend,
    distanceFromPrice,
    emaSeries,
    formatLevelsForClipboard,
    dimLevels,
    levelsFromAgentPlan,
    levelsFromAnalysis,
    levelsFromLocked,
} from "../../lib/market/chart-levels.js";

const longSignal = { bias: "long", entry: 100, price: 100, atr: 4, support: 90, resistance: 120, sl: 94, tp1: 106, tp2: 112 };

test("hasil analisis berarah menghasilkan zona entry, SL, TP1, TP2", () => {
    const levels = levelsFromAnalysis(longSignal);
    assert.deepEqual(levels.map((level) => [level.key, level.kind]), [["entry", "zone"], ["sl", "line"], ["tp1", "line"], ["tp2", "line"]]);
    assert.ok(levels[0].low < 100 && levels[0].high > 100);
});

test("bias netral menggambar PDH/PDL/PWH/PWL, bukan range 30 candle", () => {
    const keyLevels = { pdh: 73.6, pdl: 70.8, pwh: 76, pwl: null, pdm: 72.2 };
    const levels = levelsFromAnalysis({ bias: "neutral", support: 60, resistance: 80 }, keyLevels);
    assert.deepEqual(levels.map((level) => [level.key, level.price]), [["pwh", 76], ["pdh", 73.6], ["pdl", 70.8]]);
});

test("bias netral tanpa data key level tidak menggambar apa pun", () => {
    assert.deepEqual(levelsFromAnalysis({ bias: "neutral", support: 60, resistance: 80 }), []);
});

test("sinyal terkunci memakai satu harga entry dan melewati level kosong", () => {
    const levels = levelsFromLocked({ entry: "0.00124", sl: "0.00108", tp1: "0.00149", tp2: null });
    assert.deepEqual(levels.map((level) => level.key), ["entry", "sl", "tp1"]);
    assert.equal(levels[0].price, 0.00124);
});

test("jarak level dihitung dari harga terbaru", () => {
    assert.equal(distanceFromPrice(110, 100), 10);
    assert.equal(distanceFromPrice(90, 100), -10);
    assert.equal(distanceFromPrice(90, null), null);
});

test("EMA tidak menggambar titik sebelum periode terpenuhi", () => {
    const candles = Array.from({ length: 5 }, (_, index) => ({ time: index, close: 10 }));
    assert.equal(emaSeries(candles, 6).length, 0);
    assert.deepEqual(emaSeries(candles, 3).map((point) => point.time), [2, 3, 4]);
});

test("harga live menggeser candle yang sedang berjalan saja", () => {
    const candles = [{ time: 0, open: 1, high: 2, low: 1, close: 1.5 }, { time: 300, open: 1.5, high: 1.6, low: 1.4, close: 1.5 }];
    const updated = applyLivePrice(candles, 1.8, { nowSeconds: 400, timeframe: "5m" });
    assert.deepEqual(updated.at(-1), { time: 300, open: 1.5, high: 1.8, low: 1.4, close: 1.8 });
    assert.equal(applyLivePrice(candles, 1.8, { nowSeconds: 600, timeframe: "5m" }), candles, "candle sudah tutup");
});

test("banner timeframe menjelaskan arah EMA di timeframe chart", () => {
    assert.equal(describeTimeframeTrend({ emaFast: 1, emaSlow: 2, timeframe: "1H" }), "Di 1H tren turun (EMA 21 di bawah EMA 50), jadi bias di timeframe ini bisa berbeda.");
});

test("teks salin level memuat zona dan tiap garis", () => {
    const text = formatLevelsForClipboard({
        pair: "HIGH/USDT",
        bias: "long",
        timeframe: "5m",
        levels: [{ kind: "zone", label: "Zona entry", low: 1, high: 2 }, { kind: "line", label: "TP1", price: 3 }],
        formatPrice: String,
    });
    assert.equal(text, "HIGH/USDT LONG 5m\nZona entry 1–2\nTP1 3");
});

test("level AI violet dengan SL titik-titik dan TP2 opsional", () => {
    const levels = levelsFromAgentPlan({ bias: "long", entry: 100, tp1: 106, tp2: null, sl: 96 });
    assert.deepEqual(levels.map((level) => [level.key, level.price, level.lineStyle]), [["aiTp1", 106, "dashed"], ["aiEntry", 100, "dashed"], ["aiSl", 96, "dotted"]]);
    assert.ok(levels.every((level) => level.color === "#a78bfa"));
    assert.deepEqual(levelsFromAgentPlan(null), []);
});

test("level DCMS diredupkan tanpa mengubah harga", () => {
    const [dim] = dimLevels([{ key: "sl", price: 90, color: "#f87171" }]);
    assert.equal(dim.color, "rgba(248, 113, 113, 0.35)");
    assert.equal(dim.price, 90);
});
