import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentPlan } from "../../lib/ai/agent-plan.js";

test("membaca setup long dari blok yaml", () => {
    const reply = "**SETUP**\n```yaml\nbias: LONG\nentry: 0.1195\ntp1: 0.1230\ntp2: 0.1270\nsl: 0.1169\n```\nRisiko: funding tinggi.";
    assert.deepEqual(parseAgentPlan(reply, { currentPrice: 0.1196 }), {
        bias: "long", entry: 0.1195, entryLow: null, entryHigh: null, tp1: 0.123, tp2: 0.127, sl: 0.1169,
    });
});

test("membaca zona entry, TP ganda, dan label tebal di luar blok kode", () => {
    const plan = parseAgentPlan("- **Entry:** 63,200 - 63,600\n- **TP:** 65,000 / 66,500\n- **Stop Loss:** 62,100 (-1.8%)", { currentPrice: 63_400 });
    assert.equal(plan.bias, "long");
    assert.equal(plan.entryLow, 63_200);
    assert.equal(plan.entryHigh, 63_600);
    assert.equal(plan.entry, 63_400);
    assert.equal(plan.tp1, 65_000);
    assert.equal(plan.tp2, 66_500);
    assert.equal(plan.sl, 62_100);
});

test("membaca setup short dengan koma desimal", () => {
    const plan = parseAgentPlan("```\nEntry: 0,1195\nTP1: 0,1150\nSL: 0,1220\n```");
    assert.equal(plan.bias, "short");
    assert.equal(plan.entry, 0.1195);
    assert.equal(plan.tp2, null);
});

test("angka rasio di baris TP tidak membatalkan rencana short", () => {
    const plan = parseAgentPlan("entry: 100\ntp: 95 (RR 0.5)\nsl: 103", { currentPrice: 100 });
    assert.equal(plan.tp1, 95);
    assert.equal(plan.tp2, null);
    const long = parseAgentPlan("entry: 100\ntp: 105 (vol 5000)\nsl: 97", { currentPrice: 100 });
    assert.equal(long.tp2, null);
});

test("persentase tidak terbaca sebagai harga", () => {
    const plan = parseAgentPlan("entry: 100\ntp1: +5% ke 105\nsl: 97");
    assert.equal(plan.tp1, 105);
});

test("tidak menggambar apa pun saat susunan level tidak masuk akal", () => {
    // SL di atas entry padahal TP juga di atas: tidak bisa long maupun short.
    assert.equal(parseAgentPlan("entry: 100\ntp1: 110\nsl: 105"), null);
    // Bias tertulis short tapi angkanya long.
    assert.equal(parseAgentPlan("bias: short\nentry: 100\ntp1: 110\nsl: 95"), null);
    // Level terlalu jauh dari harga sekarang, kemungkinan salah baca satuan.
    assert.equal(parseAgentPlan("entry: 1195\ntp1: 1230\nsl: 1169", { currentPrice: 0.1195 }), null);
});

test("jawaban tanpa setup lengkap tidak menghasilkan level", () => {
    assert.equal(parseAgentPlan("BTC sekarang 63.400, naik 2% dalam 24 jam."), null);
    assert.equal(parseAgentPlan("entry: 100\nsl: 95"), null);
    assert.equal(parseAgentPlan(""), null);
});
