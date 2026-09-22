import assert from "node:assert/strict";
import test from "node:test";
import { describeLockedMovement, resolveLockedLifecycleStatus } from "../../lib/signals/locked.js";

test("linked locked signal memakai lifecycle plan, bukan status subscription", () => {
    assert.equal(resolveLockedLifecycleStatus({ signalPlanId: "plan-1", status: "ACTIVE", lifecycleStatus: "PENDING_ENTRY" }), "PENDING_ENTRY");
    assert.equal(resolveLockedLifecycleStatus({ signalPlanId: "plan-1", status: "ACTIVE", lifecycleStatus: "ACTIVE" }), "ACTIVE");
});

test("locked legacy tetap memetakan status lama ke lifecycle yang setara", () => {
    assert.equal(resolveLockedLifecycleStatus({ status: "ACTIVE" }), "ACTIVE");
    assert.equal(resolveLockedLifecycleStatus({ status: "HIT_TP" }), "TP_HIT");
    assert.equal(resolveLockedLifecycleStatus({ status: "HIT_SL" }), "SL_HIT");
});

test("pending menampilkan jarak harga, bukan return trade", () => {
    const movement = describeLockedMovement({
        lifecycleStatus: "PENDING_ENTRY",
        entry: "0.16076",
        currentPrice: "0.16672",
        bias: "long",
    });

    assert.equal(movement.kind, "distance");
    assert.equal(movement.position, "above");
    assert.ok(Math.abs(movement.percent - 3.70739) < 0.000001);
});

test("return trade menyesuaikan arah long dan short setelah entry aktif", () => {
    const long = describeLockedMovement({ lifecycleStatus: "ACTIVE", entry: 100, currentPrice: 105, bias: "long" });
    const short = describeLockedMovement({ lifecycleStatus: "ACTIVE", entry: 100, currentPrice: 95, bias: "short" });

    assert.deepEqual(long, { kind: "return", percent: 5 });
    assert.deepEqual(short, { kind: "return", percent: 5 });
});

test("terminal tanpa entry tidak mengarang performa", () => {
    assert.deepEqual(describeLockedMovement({ lifecycleStatus: "EXPIRED", entry: 100, currentPrice: 110, bias: "long" }), { kind: "none" });
});
