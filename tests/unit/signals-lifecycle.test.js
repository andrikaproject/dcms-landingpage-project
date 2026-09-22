import assert from "node:assert/strict";
import test from "node:test";
import {
    SIGNAL_STATUS,
    describeStatus,
    isKnownStatus,
    isLiveStatus,
    isTerminalStatus,
    isTradeOutcomeStatus,
    STATUS_FILTER_OPTIONS,
} from "../../lib/signals/lifecycle.js";

test("delapan status kontrak punya label FE sendiri", () => {
    const labels = Object.values(SIGNAL_STATUS).map((status) => describeStatus(status).label);
    assert.equal(new Set(labels).size, 8);
    assert.equal(describeStatus(SIGNAL_STATUS.PENDING_ENTRY).label, "Menunggu Entry");
    assert.equal(describeStatus(SIGNAL_STATUS.EXPIRED).label, "Kedaluwarsa Tanpa Entry");
    assert.equal(describeStatus(SIGNAL_STATUS.INVALIDATED).label, "Setup Dibatalkan");
});

test("status asing memakai fallback informatif dan tidak dianggap ACTIVE", () => {
    const unknown = describeStatus("SOMETHING_NEW");
    assert.equal(unknown.isKnown, false);
    assert.equal(unknown.phase, "unknown");
    assert.equal(isLiveStatus("SOMETHING_NEW"), false);
    assert.equal(isTerminalStatus("SOMETHING_NEW"), false);
    assert.equal(isKnownStatus("SOMETHING_NEW"), false);
    assert.equal(describeStatus(null).isKnown, false);
});

test("expired dan invalidated bukan hasil trade", () => {
    assert.equal(isTradeOutcomeStatus(SIGNAL_STATUS.TP_HIT), true);
    assert.equal(isTradeOutcomeStatus(SIGNAL_STATUS.SL_HIT), true);
    assert.equal(isTradeOutcomeStatus(SIGNAL_STATUS.TIME_EXIT), true);
    assert.equal(isTradeOutcomeStatus(SIGNAL_STATUS.EXPIRED), false);
    assert.equal(isTradeOutcomeStatus(SIGNAL_STATUS.INVALIDATED), false);
    assert.equal(isTradeOutcomeStatus(SIGNAL_STATUS.AMBIGUOUS), false);
});

test("pending menunggu, active berjalan, sisanya terminal", () => {
    assert.equal(describeStatus(SIGNAL_STATUS.PENDING_ENTRY).phase, "waiting");
    assert.equal(describeStatus(SIGNAL_STATUS.ACTIVE).phase, "open");
    assert.equal(isLiveStatus(SIGNAL_STATUS.PENDING_ENTRY), true);
    assert.equal(isLiveStatus(SIGNAL_STATUS.ACTIVE), true);
    assert.equal(isTerminalStatus(SIGNAL_STATUS.AMBIGUOUS), true);
});

test("opsi filter status memuat semua status ditambah pilihan semua", () => {
    assert.equal(STATUS_FILTER_OPTIONS.length, 9);
    assert.equal(STATUS_FILTER_OPTIONS[0].value, "");
});
