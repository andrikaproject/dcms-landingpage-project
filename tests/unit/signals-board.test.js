import assert from "node:assert/strict";
import test from "node:test";
import { clearSignalBoardState } from "../../lib/signals/board.js";

test("clear signal board menghapus seluruh kartu dan cache hasil pencarian", () => {
    const result = clearSignalBoardState({
        signals: [
            { symbol: "BTCUSDT" },
            { symbol: "DOGEUSDT" },
        ],
        initialSignals: [{ symbol: "BTCUSDT" }],
        removedSymbols: ["ETHUSDT"],
    });

    assert.deepEqual(result.signals, []);
    assert.deepEqual(result.persistedSignals, []);
    assert.deepEqual(result.removedSymbols, ["ETHUSDT", "BTCUSDT"]);
});

test("hasil pencarian lokal tidak dimasukkan ke daftar penghapusan server", () => {
    const result = clearSignalBoardState({
        signals: [{ symbol: "DOGEUSDT" }],
        initialSignals: [{ symbol: "BTCUSDT" }],
        removedSymbols: [],
    });

    assert.deepEqual(result.removedSymbols, []);
});

test("symbol server yang sudah dihapus tidak diduplikasi", () => {
    const result = clearSignalBoardState({
        signals: [{ symbol: "BTCUSDT" }],
        initialSignals: [{ symbol: "BTCUSDT" }],
        removedSymbols: ["BTCUSDT"],
    });

    assert.deepEqual(result.removedSymbols, ["BTCUSDT"]);
});

import { mergeSignals, rebuildBoardSignals, refreshBoardSignals, withoutRemovedSignals } from "../../lib/signals/board.js";

test("merge menaruh kartu pencarian user di depan kartu bawaan", () => {
    const merged = mergeSignals([{ symbol: "PEPEUSDT" }], [{ symbol: "BTCUSDT" }, { symbol: "PEPEUSDT" }]);
    assert.deepEqual(merged.map((signal) => signal.symbol), ["PEPEUSDT", "BTCUSDT"]);
});

test("kartu yang dihapus user tidak muncul lagi", () => {
    assert.deepEqual(
        withoutRemovedSignals([{ symbol: "BTCUSDT" }, { symbol: "ETHUSDT" }], ["ETHUSDT"]).map((signal) => signal.symbol),
        ["BTCUSDT"]
    );
});

test("ganti timeframe menyusun ulang board dari cache timeframe itu", () => {
    const result = rebuildBoardSignals({
        persistedSignals: [{ symbol: "PEPEUSDT", price: 1 }],
        initialSignals: [{ symbol: "BTCUSDT", price: 2 }, { symbol: "ETHUSDT", price: 3 }],
        removedSymbols: ["ETHUSDT"],
    });

    assert.deepEqual(result.map((signal) => signal.symbol), ["PEPEUSDT", "BTCUSDT"]);
});

test("data baru timeframe yang sama mengganti nilai kartu tanpa memindahkannya", () => {
    const result = refreshBoardSignals({
        signals: [{ symbol: "PEPEUSDT", price: 1 }, { symbol: "BTCUSDT", price: 2 }],
        initialSignals: [{ symbol: "BTCUSDT", price: 99 }, { symbol: "SOLUSDT", price: 5 }],
        removedSymbols: [],
    });

    assert.deepEqual(result.map((signal) => signal.symbol), ["PEPEUSDT", "BTCUSDT", "SOLUSDT"]);
    assert.equal(result.find((signal) => signal.symbol === "BTCUSDT").price, 99);
    assert.equal(result.find((signal) => signal.symbol === "PEPEUSDT").price, 1);
});

test("kartu server yang sudah dihapus tidak dikembalikan oleh refresh", () => {
    const result = refreshBoardSignals({
        signals: [{ symbol: "BTCUSDT" }],
        initialSignals: [{ symbol: "BTCUSDT" }, { symbol: "ETHUSDT" }],
        removedSymbols: ["ETHUSDT"],
    });

    assert.deepEqual(result.map((signal) => signal.symbol), ["BTCUSDT"]);
});

import { planToBoardSignal } from "../../lib/signals/board.js";

const shortPlan = {
    signalId: "sig-1",
    symbol: "STGUSDT",
    base: "STG",
    side: "SHORT",
    status: "PENDING_ENTRY",
    timeframe: "15m",
    source: "BITUNIX",
    entry: { price: "0.1245", zoneLow: null, zoneHigh: null, isZone: false },
    stopLoss: "0.1293",
    takeProfits: [
        { label: "TP1", price: "0.1190", isFinal: false },
        { label: "TP2", price: "0.1149", isFinal: true },
    ],
    grossRewardRisk: 2,
    tracking: { observedPrice: "0.1250" },
};

test("rencana pending dipetakan ke bentuk kartu signal board", () => {
    const signal = planToBoardSignal(shortPlan);

    assert.equal(signal.symbol, "STGUSDT");
    assert.equal(signal.bias, "short");
    assert.equal(signal.entry, 0.1245);
    assert.equal(signal.sl, 0.1293);
    assert.equal(signal.tp1, 0.119);
    assert.equal(signal.tp2, 0.1149);
    assert.equal(signal.tp, 0.1149);
    assert.equal(signal.price, 0.125);
    assert.equal(signal.signalId, "sig-1");
    assert.equal(signal.indicatorAvailable, true);
});

test("harga di atas entry pada rencana short dihitung sebagai pergerakan negatif", () => {
    const signal = planToBoardSignal(shortPlan);

    assert.ok(signal.sinceEntryPercent < 0);
    assert.ok(Math.abs(signal.riskPercent - 3.86) < 0.01);
    assert.ok(Math.abs(signal.rewardPercent - 7.71) < 0.01);
});

test("zona entry dipetakan dengan kosakata badge board, bukan status lifecycle", () => {
    const signal = planToBoardSignal({
        ...shortPlan,
        entry: { price: null, zoneLow: "0.1240", zoneHigh: "0.1250", isZone: true },
    });

    assert.deepEqual(signal.entryZone, { low: 0.124, high: 0.125, status: "valid" });
    assert.equal(signal.entry, 0.1245);
});

test("rencana kedaluwarsa menandai zona entry sebagai expired", () => {
    const signal = planToBoardSignal({
        ...shortPlan,
        status: "EXPIRED",
        entry: { price: null, zoneLow: "0.1240", zoneHigh: "0.1250", isZone: true },
    });

    assert.equal(signal.entryZone.status, "expired");
});

test("rencana DEX tidak mengklaim indikator tersedia", () => {
    const signal = planToBoardSignal({ ...shortPlan, source: "DEXSCREENER" });

    assert.equal(signal.marketType, "DEX");
    assert.equal(signal.indicatorAvailable, false);
});

test("rencana tanpa symbol tidak menghasilkan kartu", () => {
    assert.equal(planToBoardSignal({ base: "STG" }), null);
    assert.equal(planToBoardSignal(null), null);
});
