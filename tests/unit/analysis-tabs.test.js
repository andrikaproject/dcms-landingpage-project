import assert from "node:assert/strict";
import test from "node:test";
import {
    analysisKey,
    analysisTabsReducer,
    EMPTY_ANALYSIS_STATE,
    parseAnalysisTabs,
    serializeAnalysisTabs,
    TAB_STATUS,
} from "../../lib/signals/analysis-tabs.js";

const start = (state, symbol, timeframe = "5m", extra = {}) => analysisTabsReducer(state, { type: "start", symbol, timeframe, now: 1, ...extra });
const succeed = (state, symbol, timeframe = "5m") => analysisTabsReducer(state, { type: "succeed", key: analysisKey(symbol, timeframe), signal: { symbol, bias: "long" }, now: 2 });

test("analisis baru menambah tab di akhir dan menjadikannya aktif", () => {
    let state = succeed(start(EMPTY_ANALYSIS_STATE, "HIGHUSDT"), "HIGHUSDT");
    state = start(state, "SOLUSDT", "1h");

    assert.deepEqual(state.tabs.map((tab) => tab.key), ["HIGHUSDT|5m", "SOLUSDT|1h"]);
    assert.equal(state.activeKey, "SOLUSDT|1h");
    assert.equal(state.tabs[1].status, TAB_STATUS.LOADING);
    assert.equal(state.tabs[1].base, "SOL");
});

test("batalkan analisis pertama menghapus tabnya", () => {
    const state = analysisTabsReducer(start(EMPTY_ANALYSIS_STATE, "HIGHUSDT"), { type: "cancel", key: "HIGHUSDT|5m" });
    assert.deepEqual(state, { tabs: [], activeKey: null });
});

test("batalkan analisis ulang mengembalikan hasil sebelumnya", () => {
    let state = succeed(start(EMPTY_ANALYSIS_STATE, "HIGHUSDT"), "HIGHUSDT");
    state = start(state, "HIGHUSDT");
    assert.equal(state.tabs.length, 1, "koin + timeframe sama tidak membuat tab kedua");
    state = analysisTabsReducer(state, { type: "cancel", key: "HIGHUSDT|5m" });

    assert.equal(state.tabs[0].status, TAB_STATUS.READY);
    assert.equal(state.tabs[0].analyzedAt, 2);
});

test("batas tab membuang tab terlama yang tidak aktif dan tidak memuat", () => {
    let state = EMPTY_ANALYSIS_STATE;
    for (const symbol of ["AUSDT", "BUSDT", "CUSDT"]) state = succeed(start(state, symbol, "5m", { limit: 3 }), symbol);
    state = start(state, "DUSDT", "5m", { limit: 3 });

    assert.deepEqual(state.tabs.map((tab) => tab.symbol), ["BUSDT", "CUSDT", "DUSDT"]);
});

test("menutup tab aktif memindahkan fokus ke tetangganya", () => {
    let state = succeed(start(EMPTY_ANALYSIS_STATE, "AUSDT"), "AUSDT");
    state = succeed(start(state, "BUSDT"), "BUSDT");
    state = analysisTabsReducer(state, { type: "select", key: "AUSDT|5m" });
    state = analysisTabsReducer(state, { type: "remove", key: "AUSDT|5m" });

    assert.equal(state.activeKey, "BUSDT|5m");
});

test("hasil gagal tetap menjadi tab dengan pesan error", () => {
    const state = analysisTabsReducer(start(EMPTY_ANALYSIS_STATE, "XUSDT"), { type: "fail", key: "XUSDT|5m", error: "Symbol tidak ditemukan" });
    assert.equal(state.tabs[0].status, TAB_STATUS.ERROR);
    assert.equal(state.tabs[0].error, "Symbol tidak ditemukan");
});

test("hasil yang datang setelah tab ditutup diabaikan", () => {
    const removed = analysisTabsReducer(start(EMPTY_ANALYSIS_STATE, "XUSDT"), { type: "remove", key: "XUSDT|5m" });
    assert.equal(succeed(removed, "XUSDT"), removed);
});

test("penyimpanan hanya membawa hasil selesai dan dipulihkan apa adanya", () => {
    let state = succeed(start(EMPTY_ANALYSIS_STATE, "AUSDT"), "AUSDT");
    state = start(state, "BUSDT");
    const restored = parseAnalysisTabs(serializeAnalysisTabs(state));

    assert.deepEqual(restored.tabs.map((tab) => [tab.key, tab.status]), [["AUSDT|5m", TAB_STATUS.READY]]);
    assert.equal(restored.activeKey, "AUSDT|5m");
    assert.deepEqual(parseAnalysisTabs("{rusak"), EMPTY_ANALYSIS_STATE);
});
