import { apiRequest } from "@/lib/api/client";
import { normalizeAnalysisResponse, normalizeSignalPlan } from "./plan";
import { SIGNAL_ANALYSIS_TIMEFRAMES } from "./flags";
import { shouldFallbackToLegacy, supportsPendingAnalysis } from "./request";

export { createRequestSequence, isAbortError } from "./request";

const ANALYSIS_PATH = "/signal-analyses";

async function legacyAnalysis({ symbol, timeframe, action, signal }) {
    const payload = await apiRequest(`/market/signals/${encodeURIComponent(symbol)}`, {
        cache: "no-store",
        query: { timeframe, action },
        signal,
    });
    return normalizeAnalysisResponse(payload, { timeframe });
}

// Kontrak baru dipakai lebih dulu; endpoint lama dipertahankan selama rollout.
// Kunci idempotensi sengaja tidak dikirim. Backend menurunkannya sendiri dari
// symbol + timeframe + candle keputusan + pengguna, sehingga menganalisis coin
// yang sama pada candle yang sama mengembalikan analisis yang sama. Mengirim
// kunci dari browser justru mematikan dedupe itu dan menghasilkan rencana ganda.
export async function requestAnalysis({ symbol, timeframe, action = "SEARCH", signal }) {
    if (!supportsPendingAnalysis(timeframe, SIGNAL_ANALYSIS_TIMEFRAMES)) {
        return legacyAnalysis({ symbol, timeframe, action, signal });
    }

    try {
        const payload = await apiRequest(ANALYSIS_PATH, {
            method: "POST",
            cache: "no-store",
            body: { symbol, timeframe, action },
            signal,
        });
        return normalizeAnalysisResponse(payload, { timeframe });
    } catch (error) {
        if (!shouldFallbackToLegacy(error)) throw error;
        return legacyAnalysis({ symbol, timeframe, action, signal });
    }
}

export async function fetchSignalById(signalId, { signal } = {}) {
    const payload = await apiRequest(`/signals/${encodeURIComponent(signalId)}`, { cache: "no-store", signal });
    return normalizeSignalPlan(payload?.signal ?? payload);
}

export async function fetchSignalEvents(signalId, { page = 1, limit = 50, signal } = {}) {
    const payload = await apiRequest(`/signals/${encodeURIComponent(signalId)}/events`, {
        cache: "no-store",
        query: { page, limit },
        signal,
    });

    return {
        events: Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.events) ? payload.events : [],
        page: payload?.page ?? page,
        hasMore: Boolean(payload?.hasMore),
    };
}

// Lock mengikuti signalId. Level kiriman browser bukan sumber otoritatif.
export async function lockSignalPlan(plan, legacyBody = null) {
    if (plan?.signalId) {
        return apiRequest("/signals/locked", { method: "POST", body: { signalId: plan.signalId } });
    }
    if (!legacyBody) throw new Error("Signal ini belum punya signalId dari backend.");
    return apiRequest("/signals/locked", { method: "POST", body: legacyBody });
}

// Overview hanya menerima filter timeframe; tidak ada filter source di kontrak.
export async function fetchMlOverview({ timeframe, signal } = {}) {
    return apiRequest("/admin/ml/overview", { cache: "no-store", query: { timeframe }, signal });
}

export async function fetchMlModels({ page = 1, limit = 20, label, signal } = {}) {
    return apiRequest("/admin/ml/models", { cache: "no-store", query: { page, limit, label }, signal });
}

// Perbandingan wajib menyebut modelVersion, jadi hanya dipanggil bila ada model.
export async function fetchMlComparison({ modelVersion, label = "TARGET_BEFORE_STOP", signal } = {}) {
    return apiRequest("/admin/ml/comparison", { cache: "no-store", query: { modelVersion, label }, signal });
}
