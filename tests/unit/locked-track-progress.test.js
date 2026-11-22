import assert from "node:assert/strict";
import test from "node:test";
import { lockedTrackProgress, SEGMENT_STATE, TRACK_LEVEL } from "../../lib/signals/locked-track.js";

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test("short yang rugi mengisi segmen SL sebanding jarak, belum penuh", () => {
    // Entry 100, SL 102: harga 101 berarti separuh jalan menuju SL.
    const { segments, marker, target } = lockedTrackProgress({ bias: "short", entry: 100, sl: 102, tp1: 98, tp2: 96, currentPrice: 101, status: "ACTIVE" });
    near(segments[0].fill, 0.5);
    assert.equal(segments[0].state, SEGMENT_STATE.APPROACH);
    assert.equal(segments[1].state, SEGMENT_STATE.IDLE);
    assert.deepEqual(marker, { segment: 0, position: 0.5 });
    assert.equal(target.level, TRACK_LEVEL.SL);
    near(target.remainingPercent, (1 / 101) * 100);
});

test("long yang untung mengisi segmen TP1 sebagian, TP2 masih kosong", () => {
    const { segments, marker, target } = lockedTrackProgress({ bias: "long", entry: 100, sl: 95, tp1: 110, tp2: 120, currentPrice: 102.5, status: "ACTIVE" });
    assert.equal(segments[0].state, SEGMENT_STATE.IDLE);
    near(segments[1].fill, 0.25);
    assert.equal(segments[1].state, SEGMENT_STATE.APPROACH);
    assert.equal(segments[2].state, SEGMENT_STATE.IDLE);
    assert.equal(marker.segment, 1);
    near(marker.position, 0.25);
    assert.equal(target.level, TRACK_LEVEL.TP1);
});

test("TP1 terlewati: segmen TP1 penuh, TP2 terisi sebagian dan jadi target", () => {
    const { segments, target } = lockedTrackProgress({ bias: "short", entry: 41.2, sl: 42, tp1: 39, tp2: 37, currentPrice: 38, status: "ACTIVE" });
    assert.equal(segments[1].state, SEGMENT_STATE.HIT);
    near(segments[2].fill, 0.5);
    assert.equal(target.level, TRACK_LEVEL.TP2);
});

test("status dari backend menang atas harga yang sudah berbalik", () => {
    const sl = lockedTrackProgress({ bias: "long", entry: 100, sl: 95, tp1: 110, currentPrice: 97, lifecycleStatus: "SL_HIT" });
    assert.equal(sl.segments[0].state, SEGMENT_STATE.HIT);
    assert.equal(sl.target, null);
    const tp = lockedTrackProgress({ bias: "long", entry: 100, sl: 95, tp1: 110, tp2: 120, currentPrice: 104, lifecycleStatus: "TP_HIT" });
    assert.deepEqual(tp.segments.map((segment) => segment.state), [SEGMENT_STATE.IDLE, SEGMENT_STATE.HIT, SEGMENT_STATE.HIT]);
});

test("harga melewati SL tetap dijepit di ujung track", () => {
    const { segments, marker, target } = lockedTrackProgress({ bias: "long", entry: 100, sl: 95, tp1: 110, currentPrice: 90, status: "ACTIVE" });
    assert.equal(segments[0].state, SEGMENT_STATE.HIT);
    assert.deepEqual(marker, { segment: 0, position: 0 });
    assert.equal(target, null);
});

test("pending entry dan data kosong tidak mengarang progres", () => {
    const pending = lockedTrackProgress({ bias: "long", entry: 100, sl: 95, tp1: 110, currentPrice: 120, signalPlanId: "p", lifecycleStatus: "PENDING_ENTRY" });
    assert.equal(pending.pending, true);
    assert.equal(pending.marker, null);
    assert.ok(pending.segments.every((segment) => segment.state === SEGMENT_STATE.IDLE));
    const missing = lockedTrackProgress({ bias: "long", entry: null, currentPrice: 100 });
    assert.equal(missing.marker, null);
    assert.equal(missing.target, null);
});

test("tanpa SL, segmen SL tidak diisi walau harga di bawah entry", () => {
    const { segments, marker } = lockedTrackProgress({ bias: "long", entry: 100, tp1: 110, currentPrice: 98, status: "ACTIVE" });
    assert.equal(segments[0].state, SEGMENT_STATE.IDLE);
    assert.deepEqual(marker, { segment: 0, position: 1 });
});
