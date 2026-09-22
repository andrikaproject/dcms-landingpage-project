import assert from "node:assert/strict";
import test from "node:test";
import {
    decimalPlaces,
    decimalPlacesFromTick,
    describeFreshness,
    describeValidity,
    formatDecimalPrice,
    formatRealizedR,
    formatRewardRisk,
    formatUserTime,
    roundDecimalString,
    toDecimalString,
} from "../../lib/signals/format.js";

test("decimal string dipertahankan, bukan dibulatkan lewat float", () => {
    assert.equal(toDecimalString("0.000000000000000009"), "0.000000000000000009");
    assert.equal(roundDecimalString("0.000000000000000009", 18), "0.000000000000000009");
    assert.equal(toDecimalString("abc"), null);
    assert.equal(toDecimalString(""), null);
    assert.equal(toDecimalString("1e-7"), "0.0000001");
});

test("pembulatan half-up membawa carry sampai bagian bulat", () => {
    assert.equal(roundDecimalString("9.9995", 3), "10.000");
    assert.equal(roundDecimalString("1.2344", 3), "1.234");
    assert.equal(roundDecimalString("-1.2345", 3), "-1.235");
    assert.equal(roundDecimalString("5", 2), "5.00");
    assert.equal(roundDecimalString("0.4", 0), "0");
});

test("presisi tampilan mengikuti tick size ketika tersedia", () => {
    assert.equal(decimalPlacesFromTick("0.001"), 3);
    assert.equal(decimalPlacesFromTick("0"), null);
    assert.equal(decimalPlaces("1.2300"), 2);
    assert.equal(formatDecimalPrice("64123.456789", { tickSize: "0.01" }), "$64,123.46");
    assert.equal(formatDecimalPrice("0.00001234567", { precision: 8 }), "$0.00001235");
    assert.equal(formatDecimalPrice(null), "-");
});

test("RR rencana dan R terealisasi ditampilkan berbeda", () => {
    assert.equal(formatRewardRisk(2), "1:2.0");
    assert.equal(formatRewardRisk(0), "-");
    assert.equal(formatRealizedR(1.84), "+1.84R");
    assert.equal(formatRealizedR(-1), "-1.00R");
    assert.equal(formatRealizedR(null), "-");
});

test("waktu ditampilkan di zona pengguna dengan label zona", () => {
    const original = process.env.TZ;
    try {
        process.env.TZ = "Asia/Jakarta";
        const label = formatUserTime("2026-09-09T07:02:00Z");
        assert.match(label, /14\.02|14:02/);
        assert.match(label, /WIB|GMT\+7/);
    } finally {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
    }
    assert.equal(formatUserTime(null), "-");
    assert.equal(formatUserTime("bukan-tanggal"), "-");
});

test("data terlambat dan belum dievaluasi dibedakan dari data segar", () => {
    const now = Date.parse("2026-09-09T08:00:00Z");
    const fresh = describeFreshness("2026-09-09T07:59:00Z", { now });
    assert.equal(fresh.isStale, false);

    const stale = describeFreshness("2026-09-09T07:30:00Z", { now });
    assert.equal(stale.isStale, true);
    assert.match(stale.label, /tertunda/);

    const unhealthy = describeFreshness("2026-09-09T07:59:30Z", { now, dataHealth: "DELAYED" });
    assert.equal(unhealthy.isStale, true);

    const never = describeFreshness(null, { now });
    assert.equal(never.isUnknown, true);
});

test("countdown habis tidak mengubah status, hanya menunggu backend", () => {
    const now = Date.parse("2026-09-09T08:00:00Z");
    const elapsed = describeValidity("2026-09-09T07:00:00Z", { now });
    assert.equal(elapsed.isElapsed, true);
    assert.match(elapsed.label, /menunggu keputusan backend/);

    const active = describeValidity("2026-09-09T09:30:00Z", { now });
    assert.equal(active.isElapsed, false);
    assert.equal(active.label, "Berlaku 1j 30m lagi");

    assert.equal(describeValidity(null).hasDeadline, false);
});
