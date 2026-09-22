import assert from "node:assert/strict";
import test from "node:test";
import { describeFillRule, describeTriggerRule } from "../../lib/signals/rules.js";

test("TOUCH dijelaskan sebagai syarat, bukan laporan sudah tersentuh", () => {
    const rule = describeTriggerRule("TOUCH");
    assert.equal(rule.isKnown, true);
    assert.equal(rule.short, "Harga menyentuh level ini");
    assert.match(rule.long, /Menunggu Entry/);
    assert.doesNotMatch(rule.short, /sudah|tersentuh\b/i);
});

test("asumsi fill menjelaskan perlakuan gap yang merugikan", () => {
    const rule = describeFillRule("PLANNED_LEVEL_ADVERSE_STOP_GAP");
    assert.equal(rule.isKnown, true);
    assert.match(rule.long, /merugikan/);
});

test("kode baru tetap ditampilkan dengan konteks, bukan sebagai status", () => {
    const rule = describeTriggerRule("CLOSE_BEYOND");
    assert.equal(rule.isKnown, false);
    assert.equal(rule.short, "Aturan pemicu CLOSE_BEYOND");
    assert.equal(describeFillRule("NEXT_OPEN").short, "Asumsi fill NEXT_OPEN");
});

test("nilai kosong tidak menghasilkan label palsu", () => {
    assert.equal(describeTriggerRule(null), null);
    assert.equal(describeFillRule(""), null);
});
