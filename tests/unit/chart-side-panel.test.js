import assert from "node:assert/strict";
import test from "node:test";
import { clampSidePanelWidth, SIDE_PANEL, sidePanelMax, widthAfterKey } from "../../lib/charting/side-panel.js";

test("lebar panel dibatasi antara minimum dan maksimum", () => {
    assert.equal(clampSidePanelWidth(100, 1400), SIDE_PANEL.min);
    assert.equal(clampSidePanelWidth(900, 1400), SIDE_PANEL.max);
    assert.equal(clampSidePanelWidth(400.4, 1400), 400);
    assert.equal(clampSidePanelWidth("rusak", 1400), SIDE_PANEL.default);
});

test("chart selalu menyisakan ruang minimum", () => {
    // 1000 - 20 pegangan - 480 chart = 500.
    assert.equal(sidePanelMax(1000), 500);
    assert.equal(clampSidePanelWidth(560, 1000), 500);
    // Layar sempit: batas atas tidak pernah di bawah minimum panel.
    assert.equal(sidePanelMax(600), SIDE_PANEL.min);
    assert.equal(sidePanelMax(undefined), SIDE_PANEL.max);
});

test("panah kiri melebarkan panel, panah kanan menyempitkan", () => {
    assert.equal(widthAfterKey("ArrowLeft", 320, 1400), 336);
    assert.equal(widthAfterKey("ArrowRight", 320, 1400), 304);
    assert.equal(widthAfterKey("Home", 400, 1400), SIDE_PANEL.min);
    assert.equal(widthAfterKey("End", 400, 1000), 500);
    assert.equal(widthAfterKey("Enter", 400, 1400), null);
});
