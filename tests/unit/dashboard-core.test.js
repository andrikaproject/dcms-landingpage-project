import assert from "node:assert/strict";
import test from "node:test";
import {
    dashboardSearch,
    describeDataHealth,
    describePartialData,
    describePendingTimeframe,
    describeStaleData,
    describeTimeframeError,
    isStaleDashboard,
    normalizeTimeframe,
    readDashboardQuery,
} from "../../lib/market/dashboard-core.js";

test("timeframe di luar daftar jatuh ke default, bukan diteruskan ke API", () => {
    assert.equal(normalizeTimeframe("4h"), "4h");
    assert.equal(normalizeTimeframe("4H"), "4h");
    assert.equal(normalizeTimeframe("2h"), "15m");
    assert.equal(normalizeTimeframe(null), "15m");
});

test("URL dashboard membawa timeframe dan symbol yang sedang tampil", () => {
    assert.equal(dashboardSearch({ timeframe: "4h" }), "?timeframe=4h");
    assert.equal(dashboardSearch({ timeframe: "4h", symbol: "BTCUSDT" }), "?timeframe=4h&symbol=BTCUSDT");
    assert.deepEqual(readDashboardQuery("?timeframe=1d&symbol=ETHUSDT"), { timeframe: "1d", symbol: "ETHUSDT" });
    assert.deepEqual(readDashboardQuery(""), { timeframe: "15m", symbol: "" });
});

test("kontrol timeframe yang dipilih menyebut apa yang sedang dimuat", () => {
    assert.equal(describePendingTimeframe("4h"), "Memuat 4H...");
});

test("pesan gagal menyebut timeframe yang diminta dan yang masih tampil", () => {
    assert.equal(
        describeTimeframeError({ requestedTimeframe: "4h", displayedTimeframe: "1h" }),
        "Data 4H gagal diperbarui. Data 1H masih ditampilkan."
    );
});

test("gagal pada timeframe yang sama memakai pesan error aslinya", () => {
    assert.equal(
        describeTimeframeError({ requestedTimeframe: "4h", displayedTimeframe: "4h", message: "Jaringan putus." }),
        "Jaringan putus."
    );
});

test("data tertunda disebut umurnya dalam teks, bukan hanya warna", () => {
    const now = Date.parse("2026-09-18T00:00:24.000Z");
    assert.equal(describeStaleData({ asOf: "2026-09-18T00:00:00.000Z", now }), "Data tertunda, diperbarui 24 detik lalu.");
    assert.equal(
        describeStaleData({ asOf: "2026-09-18T00:00:00.000Z", now: Date.parse("2026-09-18T00:03:00.000Z") }),
        "Data tertunda, diperbarui 3 menit lalu."
    );
    assert.equal(describeStaleData({ asOf: null, now }), "");
});

test("board partial menyebut koin mana yang belum terisi", () => {
    assert.equal(describePartialData(["SOLUSDT", "ADAUSDT"]), "2 koin belum bisa dimuat: SOLUSDT, ADAUSDT.");
    assert.equal(describePartialData([]), "");
});

test("status data dibaca dari meta backend", () => {
    const now = Date.parse("2026-09-18T00:00:30.000Z");
    assert.deepEqual(
        describeDataHealth({ dataHealth: "DELAYED", asOf: "2026-09-18T00:00:00.000Z", failedSymbols: [] }, { now }),
        { tone: "delayed", text: "Data tertunda, diperbarui 30 detik lalu." }
    );
    assert.deepEqual(
        describeDataHealth({ dataHealth: "PARTIAL", asOf: null, failedSymbols: ["SOLUSDT"] }, { now }),
        { tone: "partial", text: "1 koin belum bisa dimuat: SOLUSDT." }
    );
    assert.deepEqual(describeDataHealth({ dataHealth: "OK", failedSymbols: [] }, { now }), { tone: "ok", text: "" });
});

test("backend tanpa meta tidak memunculkan status palsu", () => {
    assert.deepEqual(describeDataHealth(undefined), { tone: "ok", text: "" });
    assert.equal(isStaleDashboard(undefined), false);
    assert.equal(isStaleDashboard({ cacheStatus: "STALE" }), true);
    assert.equal(isStaleDashboard({ dataHealth: "DELAYED" }), true);
    assert.equal(isStaleDashboard({ dataHealth: "OK", cacheStatus: "HIT" }), false);
});
