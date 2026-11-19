import assert from "node:assert/strict";
import test from "node:test";
import {
    addIndicator,
    MAX_ACTIVE_INDICATORS,
    moveIndicatorUp,
    normalizePreferences,
    persistablePreferences,
    promoteDraft,
    removeIndicatorEntry,
    setPaneMode,
} from "../../lib/charting/chart-preferences.js";

test("preferensi rusak dinormalkan ke nilai bawaan", () => {
    const prefs = normalizePreferences({ activeIndicators: [{ kind: "draft", uid: "x", refId: "y" }, null], dcmsLayer: { visible: false } });
    assert.deepEqual(prefs.activeIndicators, []);
    assert.equal(prefs.dcmsLayer.visible, false);
    assert.equal(prefs.dcmsLayer.levels, true);
    assert.equal(prefs.toggles.volume, true);
});

test("draft tidak ikut dipersist dan berubah jadi rujukan setelah disimpan", () => {
    let prefs = normalizePreferences({});
    const added = addIndicator(prefs, { kind: "draft", refId: "draft-1", source: "x".repeat(80_000) });
    prefs = added.preferences;
    assert.equal(persistablePreferences(prefs).activeIndicators.length, 0);
    prefs = promoteDraft(prefs, added.entry.uid, "saved-9");
    assert.deepEqual(persistablePreferences(prefs).activeIndicators.map((entry) => [entry.kind, entry.refId, entry.source]), [["saved", "saved-9", undefined]]);
});

test("jumlah indikator aktif dibatasi", () => {
    let prefs = normalizePreferences({});
    for (let index = 0; index < MAX_ACTIVE_INDICATORS; index += 1) prefs = addIndicator(prefs, { kind: "builtin", refId: "rsi" }).preferences;
    const result = addIndicator(prefs, { kind: "builtin", refId: "rsi" });
    assert.match(result.error, /Maksimal/);
});

test("pindah ke atas hanya melompati sesama panel, maksimalkan hanya satu panel", () => {
    let prefs = normalizePreferences({});
    const ids = ["rsi", "bb", "macd"].map((refId) => {
        const result = addIndicator(prefs, { kind: "builtin", refId });
        prefs = result.preferences;
        return result.entry.uid;
    });
    const isPane = (entry) => entry.refId !== "bb";
    prefs = moveIndicatorUp(prefs, ids[2], isPane);
    assert.deepEqual(prefs.activeIndicators.map((entry) => entry.refId), ["macd", "bb", "rsi"]);
    prefs = setPaneMode(prefs, ids[0], "maximized");
    prefs = setPaneMode(prefs, ids[2], "maximized");
    assert.deepEqual(prefs.activeIndicators.map((entry) => entry.pane.maximized), [true, false, false]);
    prefs = removeIndicatorEntry(prefs, ids[1]);
    assert.equal(prefs.activeIndicators.length, 2);
});
