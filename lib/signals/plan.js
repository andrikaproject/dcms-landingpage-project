// Adapter kontrak analisis/signal. Semua tampilan memakai bentuk kanonik ini,
// termasuk ketika backend masih memakai endpoint lama.

import { ANALYSIS_DECISION, SIGNAL_STATUS, isKnownStatus } from "./lifecycle.js";
import { toDecimalString } from "./format.js";

function text(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    return raw === "" ? null : raw;
}

function isoOrNull(value) {
    const raw = text(value);
    if (raw === null) return null;
    const time = new Date(raw).getTime();
    return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeSide(value) {
    const raw = text(value);
    if (raw === null) return null;
    const upper = raw.toUpperCase();
    if (upper === "LONG" || upper === "BUY") return "LONG";
    if (upper === "SHORT" || upper === "SELL") return "SHORT";
    return null;
}

function normalizeEntry(raw) {
    if (raw === null || raw === undefined) return { price: null, zoneLow: null, zoneHigh: null, triggerRule: null, fillRule: null, isZone: false };

    if (typeof raw !== "object") {
        return { price: toDecimalString(raw), zoneLow: null, zoneHigh: null, triggerRule: null, fillRule: null, isZone: false };
    }

    const zoneLow = toDecimalString(raw.zoneLow ?? raw.low ?? raw.min);
    const zoneHigh = toDecimalString(raw.zoneHigh ?? raw.high ?? raw.max);

    return {
        price: toDecimalString(raw.price ?? raw.value ?? raw.entry),
        zoneLow,
        zoneHigh,
        triggerRule: text(raw.triggerRule ?? raw.trigger),
        fillRule: text(raw.fillRule ?? raw.fill ?? raw.fillAssumption),
        isZone: zoneLow !== null && zoneHigh !== null,
    };
}

function normalizeTakeProfits(raw) {
    if (!Array.isArray(raw)) return [];

    return raw
        .map((item, index) => {
            if (item === null || item === undefined) return null;
            if (typeof item !== "object") {
                return { label: `TP${index + 1}`, price: toDecimalString(item), weight: null, rMultiple: null, isFinal: false };
            }
            return {
                label: text(item.label) || `TP${index + 1}`,
                price: toDecimalString(item.price ?? item.value ?? item.level),
                weight: numberOrNull(item.weight ?? item.exitWeight),
                rMultiple: numberOrNull(item.rMultiple),
                isFinal: item.isFinal === true,
            };
        })
        .filter((item) => item !== null && item.price !== null)
        .map((item, index, list) => ({ ...item, isFinal: item.isFinal || index === list.length - 1 }));
}

function normalizeAssessment(raw) {
    if (!raw || typeof raw !== "object") return null;

    const mode = text(raw.mode)?.toUpperCase() ?? null;
    // Shadow score bukan rekomendasi publik; probabilitas hanya lolos bila
    // backend menyatakan kalibrasinya layak dipublikasikan.
    const isPublishable = raw.probabilityPublishable === true || raw.isPublishable === true;

    return {
        mode,
        isBaseline: mode === "BASELINE",
        isShadow: mode === "SHADOW",
        isActive: mode === "ACTIVE",
        readiness: text(raw.readiness),
        reasonCodes: Array.isArray(raw.reasonCodes) ? raw.reasonCodes.map(text).filter(Boolean) : [],
        summary: text(raw.summary ?? raw.reason),
        probability: isPublishable ? numberOrNull(raw.probability) : null,
        probabilityWithheldReason: isPublishable ? null : text(raw.probabilityWithheldReason) || "Kalibrasi belum dinyatakan layak dipublikasikan",
    };
}

function normalizeTracking(raw) {
    if (!raw || typeof raw !== "object") return null;

    return {
        observedPrice: toDecimalString(raw.observedPrice ?? raw.price),
        observedAt: isoOrNull(raw.observedAt ?? raw.priceAt),
        lastEvaluatedAt: isoOrNull(raw.lastEvaluatedAt ?? raw.evaluatedAt),
        dataHealth: text(raw.dataHealth),
    };
}

function normalizeOutcome(raw) {
    if (!raw || typeof raw !== "object") return null;

    return {
        kind: text(raw.kind ?? raw.type) || "SIMULATED",
        reason: text(raw.reason),
        exitPrice: toDecimalString(raw.exitPrice),
        grossRealizedR: numberOrNull(raw.grossRealizedR),
        netRealizedR: numberOrNull(raw.netRealizedR),
        costAssumptions: raw.costAssumptions ?? raw.costAssumption ?? null,
    };
}

function normalizeProvenance(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
        engineVersion: text(source.engineVersion),
        featureSchemaVersion: text(source.featureSchemaVersion),
        policyVersion: text(source.policyVersion),
        modelVersion: text(source.modelVersion),
        evaluatorVersion: text(source.evaluatorVersion),
    };
}

export function normalizeSignalPlan(raw) {
    if (!raw || typeof raw !== "object") return null;

    const status = text(raw.status)?.toUpperCase() ?? null;
    const symbol = text(raw.symbol);

    return {
        signalId: text(raw.signalId ?? raw.id),
        analysisId: text(raw.analysisId),
        candidateId: text(raw.candidateId),
        symbol,
        base: text(raw.base) || (symbol ? symbol.replace(/USDT$|USD$/i, "") : null),
        timeframe: text(raw.timeframe),
        source: text(raw.source),
        marketType: text(raw.marketType),
        side: normalizeSide(raw.side ?? raw.bias),
        status,
        hasKnownStatus: isKnownStatus(status),
        entry: normalizeEntry(raw.entry),
        stopLoss: toDecimalString(raw.stopLoss ?? raw.sl),
        takeProfits: normalizeTakeProfits(raw.takeProfits),
        grossRewardRisk: numberOrNull(raw.grossRewardRisk),
        generatedAt: isoOrNull(raw.generatedAt),
        publishedAt: isoOrNull(raw.publishedAt),
        expiresAt: isoOrNull(raw.expiresAt),
        activatedAt: isoOrNull(raw.activatedAt),
        activeUntil: isoOrNull(raw.activeUntil),
        resolvedAt: isoOrNull(raw.resolvedAt),
        invalidationRule: text(raw.invalidationRule ?? raw.invalidation),
        selectionReason: text(raw.selectionReason ?? raw.reason),
        provenance: normalizeProvenance(raw.provenance ?? raw),
        assessment: normalizeAssessment(raw.assessment),
        tracking: normalizeTracking(raw.tracking),
        outcome: normalizeOutcome(raw.outcome),
        revisionOf: text(raw.revisionOf),
        eventVersion: numberOrNull(raw.eventVersion),
        tickSize: toDecimalString(raw.tickSize),
        pricePrecision: numberOrNull(raw.pricePrecision),
        isLegacy: false,
    };
}

function hasLegacyTradePlan(signal) {
    return numberOrNull(signal?.entry) !== null
        && numberOrNull(signal?.sl) !== null
        && numberOrNull(signal?.tp1 ?? signal?.tp) !== null;
}

// Backend lama tidak punya lifecycle pending. Rencananya dipetakan apa adanya
// dan ditandai legacy supaya UI tidak mengklaim pemantauan yang belum ada.
export function adaptLegacyMarketSignal(signal, meta = {}) {
    if (!signal || typeof signal !== "object") return null;

    const takeProfits = [signal.tp1, signal.tp2 ?? signal.tp]
        .map((price, index) => ({ label: `TP${index + 1}`, price: toDecimalString(price), weight: null, isFinal: false }))
        .filter((item) => item.price !== null)
        .map((item, index, list) => ({ ...item, isFinal: index === list.length - 1 }));

    const symbol = text(signal.symbol);

    return {
        signalId: null,
        analysisId: null,
        candidateId: null,
        symbol,
        base: text(signal.base) || (symbol ? symbol.replace(/USDT$|USD$/i, "") : null),
        timeframe: text(signal.timeframe) || text(meta.timeframe),
        source: text(signal.source),
        marketType: text(signal.marketType),
        side: normalizeSide(signal.bias),
        status: null,
        hasKnownStatus: false,
        entry: normalizeEntry(signal.entryZone && signal.entryZone.low !== undefined
            ? { price: signal.entry, zoneLow: signal.entryZone.low, zoneHigh: signal.entryZone.high }
            : signal.entry),
        stopLoss: toDecimalString(signal.sl),
        takeProfits,
        grossRewardRisk: numberOrNull(signal.riskReward),
        generatedAt: isoOrNull(meta.updatedAt ?? signal.updatedAt),
        publishedAt: null,
        expiresAt: null,
        activatedAt: null,
        activeUntil: null,
        resolvedAt: null,
        invalidationRule: null,
        selectionReason: null,
        provenance: normalizeProvenance({}),
        assessment: null,
        tracking: null,
        outcome: null,
        revisionOf: null,
        eventVersion: null,
        tickSize: null,
        pricePrecision: null,
        isLegacy: true,
        legacySignal: signal,
        hasTradePlan: hasLegacyTradePlan(signal),
    };
}

export function normalizeAnalysisResponse(payload, meta = {}) {
    if (!payload || typeof payload !== "object") {
        return { decision: null, isContractIssue: true, analysisId: null, plan: null, reasons: [], generatedAt: null, isLegacy: false };
    }

    if (text(payload.decision)) {
        const decision = String(payload.decision).toUpperCase();
        const plan = decision === ANALYSIS_DECISION.PUBLISHED ? normalizeSignalPlan(payload.signal) : null;

        return {
            decision,
            isContractIssue: decision !== ANALYSIS_DECISION.PUBLISHED && decision !== ANALYSIS_DECISION.NO_SETUP,
            analysisId: text(payload.analysisId),
            plan,
            reasons: Array.isArray(payload.reasons)
                ? payload.reasons.map(text).filter(Boolean)
                : [text(payload.rejectionReason)].filter(Boolean),
            reasonSummary: text(payload.reasonSummary ?? payload.reason),
            generatedAt: isoOrNull(payload.generatedAt ?? meta.updatedAt),
            isLegacy: false,
        };
    }

    const legacyPlan = adaptLegacyMarketSignal(payload.signal, { updatedAt: payload.updatedAt, timeframe: meta.timeframe });
    const published = Boolean(legacyPlan?.hasTradePlan);

    return {
        decision: published ? ANALYSIS_DECISION.PUBLISHED : ANALYSIS_DECISION.NO_SETUP,
        isContractIssue: false,
        analysisId: null,
        plan: published ? legacyPlan : null,
        reasons: published ? [] : ["LEGACY_NO_TRADE_PLAN"],
        reasonSummary: published ? null : "Analisis lama tidak menghasilkan level entry, SL, dan TP yang lengkap.",
        generatedAt: isoOrNull(payload.updatedAt),
        isLegacy: true,
        legacyPayload: payload,
    };
}

export function planKey(plan) {
    if (!plan) return null;
    if (plan.signalId) return plan.signalId;
    return `legacy:${plan.symbol || "unknown"}:${plan.timeframe || "unknown"}`;
}

// Response lama tidak boleh memundurkan status. eventVersion menang; kalau
// backend belum mengirimnya, pakai waktu evaluasi/penyelesaian sebagai cadangan.
export function isNewerSignalUpdate(current, next) {
    if (!next) return false;
    if (!current) return true;

    const currentVersion = numberOrNull(current.eventVersion);
    const nextVersion = numberOrNull(next.eventVersion);
    if (currentVersion !== null && nextVersion !== null) {
        if (nextVersion > currentVersion) return true;
        if (nextVersion < currentVersion) return false;
        // Evaluasi tanpa transisi status tidak menaikkan eventVersion, tetapi tetap
        // membawa lastEvaluatedAt dan dataHealth yang lebih baru.
    }
    if (nextVersion !== null && currentVersion === null) return true;
    if (nextVersion === null && currentVersion !== null) return false;

    const currentTime = new Date(current.tracking?.lastEvaluatedAt || current.resolvedAt || current.publishedAt || 0).getTime();
    const nextTime = new Date(next.tracking?.lastEvaluatedAt || next.resolvedAt || next.publishedAt || 0).getTime();
    if (Number.isNaN(nextTime)) return false;
    if (Number.isNaN(currentTime)) return true;

    return nextTime > currentTime;
}

export function mergeSignalUpdate(current, next) {
    return isNewerSignalUpdate(current, next) ? next : current;
}

export function finalTakeProfit(plan) {
    if (!plan?.takeProfits?.length) return null;
    return plan.takeProfits.find((item) => item.isFinal) || plan.takeProfits[plan.takeProfits.length - 1];
}

export function hasPartialTakeProfit(plan) {
    return (plan?.takeProfits || []).some((item) => item.weight !== null && item.weight > 0 && item.weight < 1);
}

export { SIGNAL_STATUS, ANALYSIS_DECISION };
