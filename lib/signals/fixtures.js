// Fixture sintetis untuk pengembangan dan pengujian UI. Bukan performa nyata dan
// tidak boleh dipublikasikan sebagai hasil trading.

import { SIGNAL_STATUS } from "./lifecycle.js";

export const FIXTURE_DISCLAIMER = "Data contoh sintetis. Bukan hasil analisis atau performa nyata.";

const BASE_TIME = Date.UTC(2026, 8, 9, 6, 0, 0);

function at(minutesFromBase) {
    return new Date(BASE_TIME + minutesFromBase * 60_000).toISOString();
}

function basePlan(overrides = {}) {
    return {
        signalId: "sig_synthetic_0001",
        analysisId: "ana_synthetic_0001",
        candidateId: "cnd_synthetic_0001",
        symbol: "BTCUSDT",
        base: "BTC",
        timeframe: "15m",
        source: "BITUNIX",
        marketType: "FUTURES",
        side: "LONG",
        status: SIGNAL_STATUS.PENDING_ENTRY,
        entry: {
            price: "63850.5",
            zoneLow: "63780.0",
            zoneHigh: "63920.0",
            triggerRule: "Sentuh zona entry pada candle 15m",
            fillRule: "Fill diasumsikan pada batas zona terdekat",
        },
        stopLoss: "63200.0",
        takeProfits: [
            { label: "TP1", price: "64500.0", weight: 0.5 },
            { label: "TP2", price: "65150.0", weight: 0.5, isFinal: true },
        ],
        grossRewardRisk: 2,
        generatedAt: at(0),
        publishedAt: at(0),
        expiresAt: at(180),
        activatedAt: null,
        activeUntil: null,
        resolvedAt: null,
        invalidationRule: "Batal jika harga menutup di bawah 63.100 sebelum entry",
        selectionReason: "Pullback ke HVN dengan struktur higher low",
        tickSize: "0.1",
        provenance: {
            engineVersion: "express-v1",
            featureSchemaVersion: "fs-2026.09",
            policyVersion: "pol-0.1",
            modelVersion: null,
            evaluatorVersion: "eval-0.1",
        },
        assessment: {
            mode: "BASELINE",
            readiness: "DATA_INSUFFICIENT",
            reasonCodes: ["BASELINE_ONLY"],
            summary: "Model belum aktif; rencana dipilih aturan baseline.",
            probability: 0.61,
            probabilityPublishable: false,
        },
        tracking: {
            observedPrice: "64010.0",
            observedAt: at(12),
            lastEvaluatedAt: at(12),
            dataHealth: "OK",
        },
        outcome: null,
        eventVersion: 3,
        ...overrides,
    };
}

export const SIGNAL_FIXTURES = {
    pendingEntry: basePlan(),

    pendingEntryStale: basePlan({
        signalId: "sig_synthetic_0002",
        tracking: { observedPrice: "63990.0", observedAt: at(-45), lastEvaluatedAt: at(-45), dataHealth: "DELAYED" },
        eventVersion: 4,
    }),

    active: basePlan({
        signalId: "sig_synthetic_0003",
        status: SIGNAL_STATUS.ACTIVE,
        activatedAt: at(35),
        activeUntil: at(395),
        tracking: { observedPrice: "64240.0", observedAt: at(48), lastEvaluatedAt: at(48), dataHealth: "OK" },
        eventVersion: 6,
    }),

    tpHit: basePlan({
        signalId: "sig_synthetic_0004",
        status: SIGNAL_STATUS.TP_HIT,
        activatedAt: at(35),
        resolvedAt: at(180),
        outcome: { kind: "SIMULATED", reason: "FINAL_TP", exitPrice: "65150.0", grossRealizedR: 2, netRealizedR: 1.84, costAssumptions: { feeBps: 8, slippageBps: 4 } },
        eventVersion: 9,
    }),

    slHit: basePlan({
        signalId: "sig_synthetic_0005",
        status: SIGNAL_STATUS.SL_HIT,
        activatedAt: at(35),
        resolvedAt: at(96),
        outcome: { kind: "SIMULATED", reason: "STOP", exitPrice: "63200.0", grossRealizedR: -1, netRealizedR: -1.12, costAssumptions: { feeBps: 8, slippageBps: 4 } },
        eventVersion: 8,
    }),

    timeExit: basePlan({
        signalId: "sig_synthetic_0006",
        status: SIGNAL_STATUS.TIME_EXIT,
        activatedAt: at(35),
        resolvedAt: at(395),
        outcome: { kind: "SIMULATED", reason: "MAX_DURATION", exitPrice: "64120.0", grossRealizedR: 0.42, netRealizedR: 0.3 },
        eventVersion: 11,
    }),

    expired: basePlan({
        signalId: "sig_synthetic_0007",
        status: SIGNAL_STATUS.EXPIRED,
        resolvedAt: at(180),
        outcome: { kind: "SIMULATED", reason: "NO_ENTRY_BEFORE_EXPIRY" },
        eventVersion: 5,
    }),

    invalidated: basePlan({
        signalId: "sig_synthetic_0008",
        status: SIGNAL_STATUS.INVALIDATED,
        resolvedAt: at(64),
        outcome: { kind: "SIMULATED", reason: "STRUCTURE_BROKEN_BEFORE_ENTRY" },
        eventVersion: 5,
    }),

    ambiguous: basePlan({
        signalId: "sig_synthetic_0009",
        status: SIGNAL_STATUS.AMBIGUOUS,
        activatedAt: at(35),
        resolvedAt: at(37),
        outcome: { kind: "SIMULATED", reason: "ENTRY_AND_EXIT_IN_SAME_INTERVAL" },
        eventVersion: 7,
    }),

    unknownStatus: basePlan({
        signalId: "sig_synthetic_0010",
        status: "SOMETHING_NEW",
        eventVersion: 2,
    }),

    revision: basePlan({
        signalId: "sig_synthetic_0011",
        revisionOf: "sig_synthetic_0001",
        entry: { price: "63600.0", zoneLow: null, zoneHigh: null, triggerRule: "Sentuh harga entry", fillRule: "Fill pada harga rencana" },
        stopLoss: "63050.0",
        takeProfits: [{ label: "TP1", price: "64700.0", weight: 1, isFinal: true }],
        eventVersion: 1,
    }),

    activeModelAssessment: basePlan({
        signalId: "sig_synthetic_0012",
        assessment: {
            mode: "ACTIVE",
            readiness: "READY",
            reasonCodes: ["TREND_ALIGNED", "LIQUIDITY_OK"],
            summary: "Model aktif memilih pullback entry dengan RR rencana 1:2.",
            probability: 0.58,
            probabilityPublishable: true,
        },
        eventVersion: 4,
    }),
};

export const ANALYSIS_FIXTURES = {
    published: {
        decision: "PUBLISHED",
        analysisId: "ana_synthetic_0001",
        generatedAt: at(0),
        reasons: ["PULLBACK_TO_HVN"],
        reasonSummary: "Kandidat terpilih karena pullback ke HVN dengan RR rencana 1:2.",
        signal: SIGNAL_FIXTURES.pendingEntry,
    },

    noSetup: {
        decision: "NO_SETUP",
        analysisId: "ana_synthetic_0002",
        generatedAt: at(5),
        reasons: ["RR_BELOW_MINIMUM", "RANGE_COMPRESSION"],
        reasonSummary: "Tidak ada kandidat dengan RR rencana minimal 1:2 pada timeframe ini.",
        signal: null,
    },

    dataInsufficient: {
        decision: "NO_SETUP",
        analysisId: "ana_synthetic_0003",
        generatedAt: at(6),
        reasons: ["DATA_INSUFFICIENT"],
        reasonSummary: "Data candle belum cukup untuk menilai setup.",
        signal: null,
    },
};

export const LEGACY_ANALYSIS_FIXTURE = {
    signal: {
        symbol: "SOLUSDT",
        base: "SOL",
        bias: "short",
        timeframe: "1h",
        source: "BITUNIX",
        marketType: "FUTURES",
        entry: 182.4,
        sl: 187.1,
        tp1: 176.2,
        tp2: 172.8,
        riskReward: 2.04,
    },
    conservativeGate: null,
    updatedAt: at(3),
};


// Bentuk response nyata dari dcms-api (serializeAnalysis + serializePlan), disalin
// dari kontrak backend 9 Sep 2026. Dipakai untuk menjaga adapter tetap cocok.
export const BACKEND_PUBLISHED_FIXTURE = {
    analysisId: "an_01J8Z0",
    decision: "PUBLISHED",
    rejectionReason: null,
    symbol: "BTCUSDT",
    base: "BTC",
    timeframe: "15m",
    source: "BITUNIX",
    marketType: "CEX",
    side: "SHORT",
    score: "-5",
    priceAtDecision: "78672.9",
    engineVersion: "pending-v1",
    featureSchemaVersion: "features-v1",
    policyVersion: "policy-v1",
    modelVersion: null,
    selectionPolicy: "RULE_BASELINE",
    universePolicy: "USER_SEARCH",
    decidedAt: "2026-09-09T15:40:00.000Z",
    dataHealth: "OK",
    candidates: [
        { candidateId: "cd_1", entrySource: "swing_high", side: "SHORT", entry: "78719.4", stopLoss: "79436.7", takeProfit: "77284.8", grossRewardRisk: "2.0001", netRewardRisk: "1.86", entryDistanceAtr: "0.12", selected: true, rejectionReason: null },
        { candidateId: "cd_2", entrySource: "ema_fast", side: "SHORT", entry: "78900.1", stopLoss: "79612.0", takeProfit: "77476.3", grossRewardRisk: "2.0", netRewardRisk: "1.85", entryDistanceAtr: "0.44", selected: false, rejectionReason: "NOT_SELECTED" },
    ],
    signal: {
        signalId: "sp_01J8Z0",
        analysisId: "an_01J8Z0",
        candidateId: "cd_1",
        planRole: "PUBLISHED",
        decision: "PUBLISHED",
        symbol: "BTCUSDT",
        base: "BTC",
        timeframe: "15m",
        source: "BITUNIX",
        marketType: "CEX",
        side: "SHORT",
        status: "PENDING_ENTRY",
        entry: { price: "78719.4", triggerRule: "TOUCH", fillAssumption: "PLANNED_LEVEL_ADVERSE_STOP_GAP" },
        stopLoss: "79436.7",
        takeProfits: [{ level: "77284.8", rMultiple: 2, exitWeight: "1" }],
        tp1Reference: "78002.1",
        riskDistance: "717.3",
        grossRewardRisk: "2.0001",
        netRewardRisk: "1.86",
        generatedAt: "2026-09-09T15:40:00.000Z",
        publishedAt: "2026-09-09T15:40:00.000Z",
        expiresAt: "2026-09-09T18:40:00.000Z",
        activatedAt: null,
        activeUntil: null,
        resolvedAt: null,
        engineVersion: "pending-v1",
        featureSchemaVersion: "features-v1",
        policyVersion: "policy-v1",
        modelVersion: null,
        evaluatorVersion: null,
        assessment: { mode: "BASELINE", selectionPolicy: "RULE_BASELINE", reasonCodes: [], probability: null },
        tracking: { lastEvaluatedAt: null, lastObservedTime: null, observationStartTime: null, dataHealth: "OK" },
        outcome: null,
        revisionOf: null,
        eventVersion: 1,
        events: [],
    },
};

export const BACKEND_NO_SETUP_FIXTURE = {
    analysisId: "an_01J8Z1",
    decision: "NO_SETUP",
    rejectionReason: "NO_DIRECTIONAL_BIAS",
    symbol: "ETHUSDT",
    base: "ETH",
    timeframe: "15m",
    source: "BITUNIX",
    marketType: "CEX",
    side: null,
    decidedAt: "2026-09-09T15:41:00.000Z",
    dataHealth: "OK",
    candidates: [],
    signal: null,
};

export const BACKEND_EVENT_FIXTURE = {
    id: "ev_1",
    eventVersion: 2,
    eventType: "ENTRY_TOUCHED",
    fromStatus: "PENDING_ENTRY",
    toStatus: "ACTIVE",
    occurredAt: "2026-09-09T16:10:00.000Z",
    observedTime: 1789000000000,
    evidence: null,
    evaluatorVersion: "evaluator-v1",
    dataHealth: "OK",
    recordedAt: "2026-09-09T16:10:05.000Z",
};

export function listSignalFixtures() {
    return Object.entries(SIGNAL_FIXTURES).map(([name, signal]) => ({ name, signal }));
}
