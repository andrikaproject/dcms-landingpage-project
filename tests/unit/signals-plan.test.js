import assert from "node:assert/strict";
import test from "node:test";
import {
    adaptLegacyMarketSignal,
    finalTakeProfit,
    hasPartialTakeProfit,
    isNewerSignalUpdate,
    mergeSignalUpdate,
    normalizeAnalysisResponse,
    normalizeSignalPlan,
    planKey,
} from "../../lib/signals/plan.js";
import {
    ANALYSIS_FIXTURES,
    BACKEND_NO_SETUP_FIXTURE,
    BACKEND_PUBLISHED_FIXTURE,
    LEGACY_ANALYSIS_FIXTURE,
    SIGNAL_FIXTURES,
    listSignalFixtures,
} from "../../lib/signals/fixtures.js";

test("setiap fixture lifecycle bisa dinormalisasi tanpa kehilangan identitas", () => {
    for (const { name, signal } of listSignalFixtures()) {
        const plan = normalizeSignalPlan(signal);
        assert.ok(plan, `${name} gagal dinormalisasi`);
        assert.equal(plan.signalId, signal.signalId);
        assert.equal(plan.isLegacy, false);
        assert.equal(planKey(plan), signal.signalId);
    }
});

test("harga rencana tetap decimal string, bukan angka float", () => {
    const plan = normalizeSignalPlan(SIGNAL_FIXTURES.pendingEntry);
    assert.equal(typeof plan.entry.price, "string");
    assert.equal(plan.entry.isZone, true);
    assert.equal(plan.stopLoss, "63200.0");
    assert.equal(finalTakeProfit(plan).label, "TP2");
    assert.equal(hasPartialTakeProfit(plan), true);
});

test("PUBLISHED membawa rencana, NO_SETUP tidak membawa angka rekaan", () => {
    const published = normalizeAnalysisResponse(ANALYSIS_FIXTURES.published);
    assert.equal(published.decision, "PUBLISHED");
    assert.equal(published.plan.status, "PENDING_ENTRY");

    const noSetup = normalizeAnalysisResponse(ANALYSIS_FIXTURES.noSetup);
    assert.equal(noSetup.decision, "NO_SETUP");
    assert.equal(noSetup.plan, null);
    assert.deepEqual(noSetup.reasons, ["RR_BELOW_MINIMUM", "RANGE_COMPRESSION"]);
});

test("payload endpoint lama dipetakan sebagai rencana legacy", () => {
    const result = normalizeAnalysisResponse(LEGACY_ANALYSIS_FIXTURE, { timeframe: "1h" });
    assert.equal(result.isLegacy, true);
    assert.equal(result.decision, "PUBLISHED");
    assert.equal(result.plan.isLegacy, true);
    assert.equal(result.plan.signalId, null);
    assert.equal(result.plan.side, "SHORT");
    assert.equal(planKey(result.plan), "legacy:SOLUSDT:1h");
});

test("signal lama tanpa level lengkap jadi NO_SETUP, bukan signal gagal", () => {
    const result = normalizeAnalysisResponse({ signal: { symbol: "ETHUSDT", bias: "neutral" } });
    assert.equal(result.decision, "NO_SETUP");
    assert.equal(result.plan, null);
    assert.deepEqual(result.reasons, ["LEGACY_NO_TRADE_PLAN"]);
});

test("decision di luar kontrak ditandai sebagai masalah kontrak", () => {
    const result = normalizeAnalysisResponse({ decision: "MAYBE", signal: null });
    assert.equal(result.isContractIssue, true);
    assert.equal(result.plan, null);
    assert.equal(normalizeAnalysisResponse(null).isContractIssue, true);
});

test("probabilitas hanya tampil ketika backend menyatakannya layak dipublikasikan", () => {
    const baseline = normalizeSignalPlan(SIGNAL_FIXTURES.pendingEntry);
    assert.equal(baseline.assessment.probability, null);
    assert.equal(baseline.assessment.isBaseline, true);
    assert.ok(baseline.assessment.probabilityWithheldReason);

    const active = normalizeSignalPlan(SIGNAL_FIXTURES.activeModelAssessment);
    assert.equal(active.assessment.probability, 0.58);
    assert.equal(active.assessment.isActive, true);
});

test("status asing dari server ditandai tetapi tetap dipertahankan apa adanya", () => {
    const plan = normalizeSignalPlan(SIGNAL_FIXTURES.unknownStatus);
    assert.equal(plan.status, "SOMETHING_NEW");
    assert.equal(plan.hasKnownStatus, false);
});

test("update dengan eventVersion lebih lama ditolak", () => {
    const current = normalizeSignalPlan(SIGNAL_FIXTURES.active);
    const older = normalizeSignalPlan({ ...SIGNAL_FIXTURES.pendingEntry, signalId: SIGNAL_FIXTURES.active.signalId, eventVersion: 2 });
    const newer = normalizeSignalPlan({ ...SIGNAL_FIXTURES.tpHit, signalId: SIGNAL_FIXTURES.active.signalId, eventVersion: 9 });

    assert.equal(isNewerSignalUpdate(current, older), false);
    assert.equal(isNewerSignalUpdate(current, newer), true);
    assert.equal(mergeSignalUpdate(current, older).status, "ACTIVE");
    assert.equal(mergeSignalUpdate(current, newer).status, "TP_HIT");
});

test("tanpa eventVersion, waktu evaluasi backend jadi penentu urutan", () => {
    const current = { eventVersion: null, tracking: { lastEvaluatedAt: "2026-09-09T08:00:00Z" } };
    const older = { eventVersion: null, tracking: { lastEvaluatedAt: "2026-09-09T07:00:00Z" } };
    const newer = { eventVersion: null, tracking: { lastEvaluatedAt: "2026-09-09T09:00:00Z" } };

    assert.equal(isNewerSignalUpdate(current, older), false);
    assert.equal(isNewerSignalUpdate(current, newer), true);
    assert.equal(isNewerSignalUpdate(null, newer), true);
    assert.equal(isNewerSignalUpdate(current, null), false);
});

test("eventVersion sama tetap menerima metadata evaluasi yang lebih baru", () => {
    const current = {
        eventVersion: 1,
        tracking: { lastEvaluatedAt: null, dataHealth: "OK" },
    };
    const evaluated = {
        eventVersion: 1,
        tracking: { lastEvaluatedAt: "2026-09-18T01:16:29Z", dataHealth: "NO_CANDLES" },
    };
    const older = {
        eventVersion: 1,
        tracking: { lastEvaluatedAt: "2026-09-18T01:00:00Z", dataHealth: "OK" },
    };

    assert.equal(isNewerSignalUpdate(current, evaluated), true);
    assert.equal(isNewerSignalUpdate(evaluated, older), false);
});

test("revisi menyimpan hubungan ke rencana lama tanpa mengganti levelnya", () => {
    const original = normalizeSignalPlan(SIGNAL_FIXTURES.pendingEntry);
    const revision = normalizeSignalPlan(SIGNAL_FIXTURES.revision);

    assert.equal(revision.revisionOf, original.signalId);
    assert.notEqual(revision.signalId, original.signalId);
    assert.equal(original.stopLoss, "63200.0");
    assert.equal(revision.stopLoss, "63050.0");
    assert.equal(isNewerSignalUpdate(original, revision), false);
});

test("adapter legacy menolak input yang bukan objek", () => {
    assert.equal(adaptLegacyMarketSignal(null), null);
    assert.equal(normalizeSignalPlan(undefined), null);
});

// Kontrak nyata dcms-api memakai nama field yang berbeda dari tebakan awal adapter.
test("response asli backend terbaca lengkap oleh adapter", () => {
    const result = normalizeAnalysisResponse(BACKEND_PUBLISHED_FIXTURE);
    assert.equal(result.decision, "PUBLISHED");
    assert.equal(result.isLegacy, false);
    assert.equal(result.analysisId, "an_01J8Z0");

    const plan = result.plan;
    assert.equal(plan.signalId, "sp_01J8Z0");
    assert.equal(plan.side, "SHORT");
    assert.equal(plan.status, "PENDING_ENTRY");
    assert.equal(plan.stopLoss, "79436.7");

    // takeProfits backend memakai `level` dan `exitWeight`, bukan `price`/`weight`.
    assert.equal(plan.takeProfits.length, 1);
    assert.equal(finalTakeProfit(plan).price, "77284.8");
    assert.equal(plan.takeProfits[0].weight, 1);
    assert.equal(plan.takeProfits[0].rMultiple, 2);
    assert.equal(hasPartialTakeProfit(plan), false);

    // entry memakai `fillAssumption`.
    assert.equal(plan.entry.price, "78719.4");
    assert.equal(plan.entry.fillRule, "PLANNED_LEVEL_ADVERSE_STOP_GAP");
    assert.equal(plan.entry.isZone, false);

    // provenance datar di objek plan, bukan bersarang.
    assert.equal(plan.provenance.engineVersion, "pending-v1");
    assert.equal(plan.provenance.modelVersion, null);
    assert.equal(plan.assessment.isBaseline, true);
    assert.equal(plan.assessment.probability, null);
    assert.equal(plan.eventVersion, 1);
});

test("NO_SETUP backend memakai rejectionReason tunggal", () => {
    const result = normalizeAnalysisResponse(BACKEND_NO_SETUP_FIXTURE);
    assert.equal(result.decision, "NO_SETUP");
    assert.equal(result.plan, null);
    assert.deepEqual(result.reasons, ["NO_DIRECTIONAL_BIAS"]);
    assert.equal(result.isContractIssue, false);
});

test("outcome backend memakai costAssumption tunggal", () => {
    const plan = normalizeSignalPlan({
        ...BACKEND_PUBLISHED_FIXTURE.signal,
        status: "TP_HIT",
        outcome: { kind: "SIMULATED", reason: "FINAL_TP", exitPrice: "77284.8", grossRealizedR: "2", netRealizedR: "1.86", costAssumption: { feeBps: 6 } },
    });
    assert.equal(plan.outcome.netRealizedR, 1.86);
    assert.deepEqual(plan.outcome.costAssumptions, { feeBps: 6 });
});
