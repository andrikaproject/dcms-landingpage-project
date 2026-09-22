import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardCoordinator } from "../../lib/market/dashboard-coordinator.js";

// Timer palsu supaya redaman 150 ms bisa dikendalikan per test.
function fakeTimers() {
    let nextId = 1;
    const pending = new Map();
    return {
        schedule(callback) {
            const id = nextId;
            nextId += 1;
            pending.set(id, callback);
            return id;
        },
        cancelSchedule(id) {
            pending.delete(id);
        },
        get pendingCount() {
            return pending.size;
        },
        flush() {
            const callbacks = [...pending.values()];
            pending.clear();
            for (const callback of callbacks) callback();
        },
    };
}

// Menunggu satu putaran macrotask: seluruh microtask promise sudah selesai
// sebelum ini berjalan, jadi test tidak perlu menghitung tick.
const settle = () => new Promise((resolve) => setImmediate(resolve));

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

function board(timeframe, extra = {}) {
    return { timeframe, signals: [{ symbol: "BTCUSDT" }], meta: { cacheStatus: "MISS", dataHealth: "OK", failedSymbols: [], asOf: null }, ...extra };
}

function harness({ loadDashboard, timeframe = "15m" } = {}) {
    const timers = fakeTimers();
    const calls = [];
    const committed = [];
    const controllers = [];

    const coordinator = createDashboardCoordinator({
        timeframe,
        schedule: timers.schedule,
        cancelSchedule: timers.cancelSchedule,
        createController: () => {
            const controller = new AbortController();
            controllers.push(controller);
            return controller;
        },
        commitUrl: (value) => committed.push(value),
        loadDashboard: async (request) => {
            calls.push(request);
            return loadDashboard ? loadDashboard(request) : board(request.timeframe);
        },
    });

    return { coordinator, timers, calls, committed, controllers };
}

test("muat awal hanya meminta dashboard market", async () => {
    const { coordinator, timers, calls } = harness();
    coordinator.start();
    timers.flush();
    await settle();

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].timeframe, "15m");
    assert.equal(coordinator.getState().initialLoading, false);
});

test("klik beruntun diredam jadi satu request terakhir", async () => {
    const { coordinator, timers, calls } = harness();
    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "15m" });
    coordinator.select({ timeframe: "1h" });
    coordinator.select({ timeframe: "4h" });
    coordinator.select({ timeframe: "1d" });
    assert.equal(timers.pendingCount, 1, "hanya request terakhir yang dijadwalkan");

    timers.flush();
    await settle();
    assert.deepEqual(calls.map((call) => call.timeframe), ["15m", "1d"]);
});

test("data lama tetap tampil selama timeframe baru dimuat", async () => {
    const pending = deferred();
    let first = true;
    const { coordinator, timers } = harness({
        loadDashboard: async ({ timeframe }) => {
            if (first) { first = false; return board(timeframe); }
            return pending.promise;
        },
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "4h" });
    timers.flush();

    const state = coordinator.getState();
    assert.equal(state.dashboard.timeframe, "15m", "board lama tidak boleh dihapus");
    assert.equal(state.displayedTimeframe, "15m");
    assert.equal(state.pendingTimeframe, "4h");
    assert.equal(state.refreshing, true);
    assert.equal(state.initialLoading, false);

    pending.resolve(board("4h"));
    await settle();
    assert.equal(coordinator.getState().displayedTimeframe, "4h");
    assert.equal(coordinator.getState().pendingTimeframe, null);
});

test("response yang sudah didahului pilihan baru tidak dipasang", async () => {
    const slow = deferred();
    const responses = { "4h": slow.promise, "1d": Promise.resolve(board("1d")) };
    const { coordinator, timers } = harness({
        loadDashboard: async ({ timeframe }) => (timeframe === "15m" ? board("15m") : responses[timeframe]),
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "4h" });
    timers.flush();
    coordinator.select({ timeframe: "1d" });
    timers.flush();
    await settle();

    assert.equal(coordinator.getState().displayedTimeframe, "1d");

    // Response 4H baru tiba setelah 1D terpasang.
    slow.resolve(board("4h"));
    await settle();
    assert.equal(coordinator.getState().displayedTimeframe, "1d", "response lama tidak boleh menimpa yang baru");
});

test("request sebelumnya dibatalkan saat pilihan berganti", async () => {
    const slow = deferred();
    const { coordinator, timers, controllers } = harness({
        loadDashboard: async ({ timeframe }) => (timeframe === "15m" ? board("15m") : slow.promise),
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "4h" });
    timers.flush();
    coordinator.select({ timeframe: "1d" });
    timers.flush();

    assert.equal(controllers[1].signal.aborted, true, "request 4H harus dibatalkan");
});

test("request yang dibatalkan tidak memunculkan pesan error", async () => {
    const { coordinator, timers } = harness({
        loadDashboard: async ({ timeframe, signal }) => {
            if (timeframe === "15m") return board("15m");
            return new Promise((_resolve, reject) => {
                signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
            });
        },
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "4h" });
    timers.flush();
    coordinator.select({ timeframe: "1d" });
    timers.flush();
    await settle();

    assert.equal(coordinator.getState().error, "", "pembatalan bukan kegagalan yang dilaporkan");
});

test("request terbaru yang gagal mempertahankan board sebelumnya", async () => {
    const { coordinator, timers } = harness({
        loadDashboard: async ({ timeframe }) => {
            if (timeframe === "15m") return board("15m");
            throw new Error("Jaringan putus.");
        },
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "4h" });
    timers.flush();
    await settle();

    const state = coordinator.getState();
    assert.equal(state.dashboard.timeframe, "15m", "board lama tetap tampil");
    assert.equal(state.displayedTimeframe, "15m");
    assert.equal(state.error, "Data 4H gagal diperbarui. Data 15M masih ditampilkan.");
    assert.equal(state.refreshing, false);
    assert.equal(state.pendingTimeframe, null);
});

test("URL hanya dipasang setelah data penggantinya tampil", async () => {
    const pending = deferred();
    const { coordinator, timers, committed } = harness({
        loadDashboard: async ({ timeframe }) => (timeframe === "15m" ? board("15m") : pending.promise),
    });

    coordinator.start();
    timers.flush();
    await settle();
    assert.deepEqual(committed, [{ timeframe: "15m", symbol: "" }]);

    coordinator.select({ timeframe: "4h" });
    timers.flush();
    assert.equal(committed.length, 1, "URL belum boleh berubah selama data belum tampil");

    pending.resolve(board("4h"));
    await settle();
    assert.deepEqual(committed.at(-1), { timeframe: "4h", symbol: "" });
});

test("URL tidak berubah saat request gagal", async () => {
    const { coordinator, timers, committed } = harness({
        loadDashboard: async ({ timeframe }) => {
            if (timeframe === "15m") return board("15m");
            throw new Error("gagal");
        },
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "1d" });
    timers.flush();
    await settle();

    assert.deepEqual(committed, [{ timeframe: "15m", symbol: "" }]);
});

test("coba lagi mengulang timeframe yang diminta, bukan yang tampil", async () => {
    let failing = true;
    const { coordinator, timers, calls } = harness({
        loadDashboard: async ({ timeframe }) => {
            if (timeframe === "15m") return board("15m");
            if (failing) throw new Error("gagal");
            return board(timeframe);
        },
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "4h" });
    timers.flush();
    await settle();
    assert.ok(coordinator.getState().error);

    failing = false;
    coordinator.retry();
    timers.flush();
    await settle();

    assert.equal(calls.at(-1).timeframe, "4h");
    assert.equal(coordinator.getState().displayedTimeframe, "4h");
    assert.equal(coordinator.getState().error, "");
});

test("memilih timeframe yang sedang tampil tidak mengirim request baru", async () => {
    const { coordinator, timers, calls } = harness();
    coordinator.start();
    timers.flush();
    await settle();

    coordinator.select({ timeframe: "15m" });
    assert.equal(timers.pendingCount, 0);
    assert.equal(calls.length, 1);
});

test("refresh berkala tidak menampilkan keadaan memuat penuh", async () => {
    const pending = deferred();
    let first = true;
    const { coordinator, timers } = harness({
        loadDashboard: async ({ timeframe }) => {
            if (first) { first = false; return board(timeframe); }
            return pending.promise;
        },
    });

    coordinator.start();
    timers.flush();
    await settle();

    coordinator.refresh();
    timers.flush();

    const state = coordinator.getState();
    assert.equal(state.initialLoading, false);
    assert.equal(state.refreshing, true);
    assert.equal(state.pendingTimeframe, null, "refresh timeframe yang sama bukan pergantian");
    assert.ok(state.dashboard);

    pending.resolve(board("15m"));
    await settle();
});

test("dibongkar saat unmount tanpa menyisakan timer atau request", async () => {
    const { coordinator, timers, controllers } = harness({
        loadDashboard: async () => new Promise(() => {}),
    });

    coordinator.start();
    timers.flush();
    coordinator.select({ timeframe: "4h" });
    coordinator.destroy();

    assert.equal(timers.pendingCount, 0);
    assert.equal(controllers[0].signal.aborted, true);
});
