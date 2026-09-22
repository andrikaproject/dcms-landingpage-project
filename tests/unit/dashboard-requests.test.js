import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../app/dashboard/page.jsx", import.meta.url), "utf8");
const hooks = readFileSync(new URL("../../lib/market/dashboard.js", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../app/dashboard/DashboardSignalWorkspace.jsx", import.meta.url), "utf8");

test("hanya jalur market yang membawa timeframe", () => {
    const lockedHook = hooks.slice(hooks.indexOf("export function useLockedSignals"), hooks.indexOf("export function useAdminSummary"));
    const adminHook = hooks.slice(hooks.indexOf("export function useAdminSummary"));

    assert.equal(lockedHook.includes("timeframe"), false, "locked signal tidak boleh ikut timeframe");
    assert.equal(adminHook.includes("timeframe"), false, "ringkasan admin tidak boleh ikut timeframe");
});

test("locked signal dan ringkasan admin dipanggil tanpa timeframe di halaman", () => {
    assert.match(page, /useLockedSignals\(\{\s*enabled:[^}]*\}\)/);
    assert.match(page, /useAdminSummary\(\{\s*enabled:[^}]*\}\)/);
    assert.equal(/useLockedSignals\([^)]*timeframe/.test(page), false);
    assert.equal(/useAdminSummary\([^)]*timeframe/.test(page), false);
});

test("halaman tidak lagi memuat tiga endpoint dalam satu Promise.all", () => {
    assert.equal(page.includes("Promise.all"), false, "muat awal harus tiga jalur terpisah");
});

test("workspace tidak dipasang ulang lewat key timeframe", () => {
    const usage = page.slice(page.indexOf("<DashboardSignalWorkspace"));
    assert.equal(/key=\{[^}]*timeframe[^}]*\}/.test(usage), false, "timeframe sebagai key menghapus state yang tidak terkait");
    assert.ok(usage.includes("timeframe={displayedTimeframe}"), "timeframe tetap dikirim lewat props");
});

test("workspace menyinkronkan state timeframe lewat prop, bukan pemasangan ulang", () => {
    assert.ok(workspace.includes("rebuildBoardSignals"), "ganti timeframe menyusun ulang board");
    assert.ok(workspace.includes("refreshBoardSignals"), "data baru timeframe sama memperbarui kartu di tempat");
    assert.ok(workspace.includes("syncedBoard"), "perubahan prop timeframe dilacak eksplisit");
});

test("state workspace yang tidak terkait timeframe tidak ikut disetel ulang", () => {
    const sync = workspace.slice(workspace.indexOf("if (syncedBoard.timeframe !== timeframe)"), workspace.indexOf("useEffect(() => {\n        if (scamPumpCooldownUntil"));

    for (const preserved of ["setActiveBoardTab", "setSignalFilter", "setSearchKeyword", "setToasts", "setScamPumpRecommendations"]) {
        assert.equal(sync.includes(preserved), false, `${preserved} tidak boleh direset oleh pergantian timeframe`);
    }
});

test("board memberi tahu pembaca layar saat sedang menyegarkan", () => {
    assert.ok(page.includes('aria-busy={refreshing ? "true" : "false"}'));
});
