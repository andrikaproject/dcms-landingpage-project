import assert from "node:assert/strict";
import test from "node:test";
import { createRequestSequence, isAbortError, nextBackoffMs, shouldFallbackToLegacy, supportsPendingAnalysis } from "../../lib/signals/request.js";

test("response pencarian lama tidak dianggap terbaru", () => {
    const sequence = createRequestSequence();
    const first = sequence.next();
    const second = sequence.next();

    assert.equal(sequence.isCurrent(first), false);
    assert.equal(sequence.isCurrent(second), true);
});

test("hanya endpoint yang belum ada yang jatuh ke jalur lama", () => {
    assert.equal(shouldFallbackToLegacy({ status: 404 }), true);
    assert.equal(shouldFallbackToLegacy({ status: 501 }), true);
    assert.equal(shouldFallbackToLegacy({ status: 401 }), false);
    assert.equal(shouldFallbackToLegacy({ status: 429 }), false);
    assert.equal(shouldFallbackToLegacy({ status: 500 }), false);
    assert.equal(shouldFallbackToLegacy(null), false);
});

test("flag backend mati memakai jalur lama, penyimpanan gagal tetap error", () => {
    assert.equal(shouldFallbackToLegacy({ status: 503, code: "FEATURE_DISABLED" }), true);
    assert.equal(shouldFallbackToLegacy({ status: 503, code: "RECORDING_FAILED" }), false);
    assert.equal(shouldFallbackToLegacy({ status: 503 }), false);
    assert.equal(shouldFallbackToLegacy({ status: 500, code: "FEATURE_DISABLED" }), false);
});

test("timeframe di luar dukungan engine pending langsung memakai jalur lama", () => {
    const supported = ["15m", "1h"];
    assert.equal(supportsPendingAnalysis("15m", supported), true);
    assert.equal(supportsPendingAnalysis("1H", supported), true);
    assert.equal(supportsPendingAnalysis("4h", supported), false);
    assert.equal(supportsPendingAnalysis("1m", supported), false);
    assert.equal(supportsPendingAnalysis(null, supported), false);
    // Daftar kosong berarti belum dikonfigurasi; jangan memblokir apa pun.
    assert.equal(supportsPendingAnalysis("4h", []), true);
});

test("abort dikenali walau error sudah dibungkus ApiError", () => {
    assert.equal(isAbortError({ name: "ApiError", message: "The operation was aborted." }), true);
    assert.equal(isAbortError({ name: "ApiError", message: "Timeout" }, { aborted: true }), true);
    assert.equal(isAbortError({ name: "ApiError", message: "Timeout" }), false);
});

test("backoff naik dua kali lipat sampai batas", () => {
    assert.equal(nextBackoffMs(0, { baseMs: 30_000, maxMs: 300_000 }), 30_000);
    assert.equal(nextBackoffMs(30_000, { baseMs: 30_000, maxMs: 300_000 }), 60_000);
    assert.equal(nextBackoffMs(200_000, { baseMs: 30_000, maxMs: 300_000 }), 300_000);
});
