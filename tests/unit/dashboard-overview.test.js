import assert from "node:assert/strict";
import test from "node:test";
import { buildBiasFactors, formatFundingRate, gaugePosition, summarizeFactors, VERDICT } from "../../lib/market/bias-factors.js";
import { sparklinePath } from "../../lib/market/sparkline.js";
import { lockedTrackZones, TRACK_ZONE } from "../../lib/signals/locked-track.js";

const longSignal = {
    bias: "long",
    emaFast: 101, emaSlow: 100, fastPeriod: 9, slowPeriod: 21,
    rsi: 50, stochK: 71.5,
    structure: { trend: "up", recentLow: 0.00118, recentHigh: 0.0013 },
    volumeRatio: 1.8, lastCandleDirection: "up",
    fundingRate: 0.021,
};

test("faktor dipetakan dari indikator engine dan funding rate", () => {
    const factors = buildBiasFactors(longSignal);

    assert.deepEqual(factors.map((factor) => [factor.key, factor.verdict]), [
        ["trend", VERDICT.LONG],
        ["momentum", VERDICT.NEUTRAL],
        ["structure", VERDICT.LONG],
        ["volume", VERDICT.LONG],
        ["funding", VERDICT.SHORT],
    ]);
    assert.equal(factors[0].detail, "EMA 9 di atas EMA 21");
    assert.equal(factors[1].detail, "RSI 50, Stoch 71.5: belum ada dorongan kuat");
    assert.equal(factors[3].detail, "1.8× rata-rata 20 candle terakhir, candle naik");
    assert.equal(factors[4].detail, "+0.021%, posisi long mulai ramai");
});

test("ringkasan menghitung faktor yang searah dengan bias engine", () => {
    const summary = summarizeFactors(buildBiasFactors(longSignal), "long");

    assert.deepEqual(
        { long: summary.long, neutral: summary.neutral, short: summary.short, supporting: summary.supporting, confidence: summary.confidence },
        { long: 3, neutral: 1, short: 1, supporting: 3, confidence: 60 },
    );
});

test("faktor tanpa data tidak ikut dihitung dan tidak menebak arah", () => {
    const factors = buildBiasFactors({ ...longSignal, fundingRate: null, volumeRatio: undefined, structure: null });
    const summary = summarizeFactors(factors, "long");

    assert.equal(factors.filter((factor) => factor.verdict === null).length, 3);
    assert.equal(factors[4].detail, "Data belum tersedia");
    assert.equal(summary.available, 2);
    assert.equal(summary.confidence, 50);
});

test("bias netral tidak punya angka keyakinan", () => {
    assert.equal(summarizeFactors(buildBiasFactors(longSignal), "neutral").confidence, null);
});

test("volume tinggi tanpa arah candle tetap netral", () => {
    const [, , , volume] = buildBiasFactors({ ...longSignal, lastCandleDirection: "flat" });
    assert.equal(volume.verdict, VERDICT.NEUTRAL);
});

test("funding negatif dalam dibaca sebagai short yang ramai", () => {
    const [, , , , funding] = buildBiasFactors({ ...longSignal, fundingRate: -0.015 });
    assert.equal(funding.verdict, VERDICT.LONG);
    assert.equal(formatFundingRate(-0.015), "−0.015%");
});

test("posisi gauge mengikuti skor engine dan dibatasi", () => {
    assert.equal(gaugePosition(2), 0.4);
    assert.equal(gaugePosition(-9), -1);
    assert.equal(gaugePosition(null), 0);
});

test("sparkline butuh minimal dua titik valid", () => {
    assert.equal(sparklinePath([1]), "");
    assert.equal(sparklinePath([1, "x", 3], { width: 10, height: 10, padding: 0 }), "M0.00 10.00 L10.00 0.00");
});

test("track long: harga di bawah entry menyalakan zona rugi", () => {
    assert.deepEqual(
        lockedTrackZones({ bias: "long", entry: 100, tp1: 110, currentPrice: 95, status: "ACTIVE" }),
        [TRACK_ZONE.LOSS, TRACK_ZONE.IDLE, TRACK_ZONE.IDLE],
    );
});

test("track short: harga turun melewati TP1 menandai zona yang dilewati", () => {
    assert.deepEqual(
        lockedTrackZones({ bias: "short", entry: 41.2, tp1: 39, currentPrice: 38.64, status: "ACTIVE" }),
        [TRACK_ZONE.IDLE, TRACK_ZONE.PASSED, TRACK_ZONE.PROFIT],
    );
    assert.deepEqual(
        lockedTrackZones({ bias: "short", entry: 0.884, tp1: 0.8, currentPrice: 0.8512, status: "ACTIVE" }),
        [TRACK_ZONE.IDLE, TRACK_ZONE.PROFIT, TRACK_ZONE.IDLE],
    );
});

test("track rencana yang belum entry tidak menyalakan zona", () => {
    assert.deepEqual(
        lockedTrackZones({ bias: "long", entry: 100, tp1: 110, currentPrice: 120, signalPlanId: "p", lifecycleStatus: "PENDING_ENTRY" }),
        [TRACK_ZONE.IDLE, TRACK_ZONE.IDLE, TRACK_ZONE.IDLE],
    );
});

test("notifikasi pantauan: TP1 tersentuh dan sinyal keluar dari daftar aktif", async () => {
    const { lockedAlerts, LOCKED_ALERT } = await import("../../lib/signals/locked-track.js");
    const hype = { id: "h", bias: "short", entry: 41.2, tp1: 39, currentPrice: 40, status: "ACTIVE" };
    const sol = { id: "s", bias: "long", entry: 73.4, tp1: 75, currentPrice: 73, status: "ACTIVE" };
    const deleted = { id: "d", bias: "long", entry: 1, tp1: 2, currentPrice: 1, status: "ACTIVE" };

    const first = lockedAlerts(null, [hype, sol, deleted]);
    assert.deepEqual(first.alerts, [], "pembacaan pertama tidak memicu notifikasi");

    const second = lockedAlerts(first.snapshot, [{ ...hype, currentPrice: 38.64 }], { ignoreIds: new Set(["d"]) });
    assert.deepEqual(second.alerts.map((alert) => [alert.kind, alert.signal.id]), [
        [LOCKED_ALERT.TP1, "h"],
        [LOCKED_ALERT.CLOSED, "s"],
    ]);

    const third = lockedAlerts(second.snapshot, [{ ...hype, currentPrice: 38 }]);
    assert.deepEqual(third.alerts, [], "TP1 yang sudah diberitahukan tidak diulang");
});
