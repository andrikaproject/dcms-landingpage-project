import assert from "node:assert/strict";
import test from "node:test";
import { formatAlertState, formatRangeState } from "../../app/dashboard/market-analysis/format.js";

test("formatAlertState renders the API alert message instead of its object", () => {
    assert.equal(
        formatAlertState({ active: true, level: "pwl", message: "Harga dekat PWL" }),
        "Harga dekat PWL"
    );
});

test("formatAlertState gives inactive and legacy alerts a safe label", () => {
    assert.equal(formatAlertState({ active: false, level: null, message: null }), "Tidak ada proximity alert");
    assert.equal(formatAlertState("Harga dekat PDL"), "Harga dekat PDL");
});

test("formatRangeState renders API range flags as text", () => {
    assert.equal(
        formatRangeState({ abovePwm: true, abovePdm: false }),
        "Harga di atas PWM · Harga di bawah PDM"
    );
    assert.equal(formatRangeState({ abovePwm: null, abovePdm: null }), "Range tidak tersedia");
});
