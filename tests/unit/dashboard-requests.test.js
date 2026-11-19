import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../app/dashboard/page.jsx", import.meta.url), "utf8");
const hooks = readFileSync(new URL("../../lib/market/dashboard.js", import.meta.url), "utf8");

test("hanya jalur market yang membawa timeframe", () => {
    const lockedHook = hooks.slice(hooks.indexOf("export function useLockedSignals"));

    assert.equal(lockedHook.includes("timeframe"), false, "locked signal tidak boleh ikut timeframe");
});

test("locked signal dipanggil tanpa timeframe di halaman", () => {
    assert.match(page, /useLockedSignals\(\{\s*enabled:[^}]*\}\)/);
    assert.equal(/useLockedSignals\([^)]*timeframe/.test(page), false);
});

test("dashboard tidak lagi memuat daftar review user", () => {
    assert.equal(page.includes("/admin/users"), false);
    assert.equal(hooks.includes("useAdminSummary"), false);
});

test("halaman tidak lagi memuat tiga endpoint dalam satu Promise.all", () => {
    assert.equal(page.includes("Promise.all"), false, "muat awal harus tiga jalur terpisah");
});

test("Signal Board lama dilepas, slideout detail tetap bisa dibuka dari hasil analisis", () => {
    assert.equal(page.includes("DashboardSignalWorkspace"), false);
    assert.equal(page.includes("DashboardSignalBoard"), false);
    assert.ok(page.includes('import("./SignalDetailSideout")'), "slideout dimuat dari modulnya sendiri");
    assert.ok(page.includes("onOpenDetail={setDetailSignal}"), "CTA Detail informasi membuka slideout");
});

test("hasil analisis tidak bergantung pada data dashboard bersama", () => {
    assert.ok(page.includes("useAnalysisTabs()"));
    assert.equal(/<AnalysisPanel[^>]*dashboard/.test(page), false);
});
