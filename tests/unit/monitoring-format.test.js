import assert from "node:assert/strict";
import test from "node:test";
import { KNOWN_TYPES, labelForType, levelClass, impactClass, formatDay, formatTime, exportFilename, summarizeEntry } from "../../app/dashboard/admin/monitoring/format.js";

test("catalog labels cover all 17 activities and four browser errors with raw fallback", () => {
    assert.equal(KNOWN_TYPES.length, 21);
    assert.equal(labelForType("MARKET_SIGNAL_SEARCH"), "Cari sinyal");
    assert.equal(labelForType("CLIENT_RENDER_ERROR"), "Crash render");
    assert.equal(labelForType("NEW_BACKEND_ERROR"), "NEW_BACKEND_ERROR");
});

test("UTC day does not shift in negative or positive local time zones", () => {
    const original = process.env.TZ;
    try {
        for (const zone of ["Pacific/Honolulu", "Asia/Jakarta", "Pacific/Kiritimati"]) {
            process.env.TZ = zone;
            assert.equal(formatDay("2026-09-04"), "4 Sep 2026");
        }
    } finally {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
    }
    assert.equal(formatDay(null), "—");
    assert.equal(formatDay("bad-date"), "—");
});

test("entry time follows local zone with HH:mm:ss format", () => {
    const original = process.env.TZ;
    try {
        process.env.TZ = "Asia/Jakarta";
        assert.equal(formatTime("2026-09-04T07:02:11Z"), "14:02:11");
    } finally {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
    }
    assert.equal(formatTime(null), "—");
});

test("export filenames include date, format and optional kind", () => {
    assert.equal(exportFilename("2026-09-04", "csv"), "dcms-logs-2026-09-04.csv");
    assert.equal(exportFilename("2026-09-04", "json", "ERROR"), "dcms-logs-2026-09-04-error.json");
});

test("backend errors summarize request; activities and frontend errors use message", () => {
    assert.equal(summarizeEntry({ kind: "ERROR", source: "BACKEND", method: "GET", path: "/v1/market/dashboard", statusCode: 500 }), "GET /v1/market/dashboard 500");
    assert.equal(summarizeEntry({ kind: "ACTIVITY", source: "BACKEND", message: "Cari BTCUSDT" }), "Cari BTCUSDT");
    assert.equal(summarizeEntry({ kind: "ERROR", source: "FRONTEND", message: "Crash" }), "Crash");
});

test("level and impact classes are safe for missing and unknown values", () => {
    assert.match(impactClass("HIGH"), /red/);
    assert.match(impactClass("MEDIUM"), /amber/);
    assert.match(impactClass(undefined), /zinc/);
    assert.match(levelClass("ERROR"), /red/);
    assert.match(levelClass("WARN"), /amber/);
    assert.match(levelClass("INFO"), /zinc/);
});
