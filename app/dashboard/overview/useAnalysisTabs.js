"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { apiRequest } from "@/lib/api/client";
import {
    ANALYSIS_TABS_STORAGE_KEY,
    analysisKey,
    analysisTabsReducer,
    EMPTY_ANALYSIS_STATE,
    parseAnalysisTabs,
    serializeAnalysisTabs,
} from "@/lib/signals/analysis-tabs";
import { isAbortError } from "@/lib/signals/request";

function readStoredTabs() {
    if (typeof window === "undefined") return EMPTY_ANALYSIS_STATE;
    try {
        return parseAnalysisTabs(window.localStorage.getItem(ANALYSIS_TABS_STORAGE_KEY));
    } catch {
        return EMPTY_ANALYSIS_STATE;
    }
}

export function useAnalysisTabs() {
    const [state, dispatch] = useReducer(analysisTabsReducer, undefined, readStoredTabs);
    // Satu controller per tab: membatalkan atau menutup tab menghentikan
    // request-nya tanpa mengganggu analisis koin lain.
    const controllersRef = useRef(new Map());

    useEffect(() => {
        try {
            window.localStorage.setItem(ANALYSIS_TABS_STORAGE_KEY, serializeAnalysisTabs(state));
        } catch {
            // Storage penuh atau diblokir tidak boleh menghentikan dashboard.
        }
    }, [state]);

    useEffect(() => {
        const controllers = controllersRef.current;
        return () => controllers.forEach((controller) => controller.abort());
    }, []);

    const analyze = useCallback(async (symbol, timeframe, { reanalyze = false } = {}) => {
        const key = analysisKey(symbol, timeframe);
        controllersRef.current.get(key)?.abort();
        const controller = new AbortController();
        controllersRef.current.set(key, controller);
        dispatch({ type: "start", symbol, timeframe, now: Date.now() });

        try {
            const payload = await apiRequest(`/market/signals/${encodeURIComponent(symbol)}`, {
                cache: "no-store",
                query: { timeframe, action: reanalyze ? "REANALYZE" : "SEARCH" },
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            if (!payload?.signal) throw new Error("Hasil analisis kosong. Coba lagi sebentar lagi.");
            dispatch({ type: "succeed", key, signal: payload.signal, now: Date.now() });
        } catch (error) {
            if (isAbortError(error, controller.signal)) return;
            dispatch({ type: "fail", key, error: error?.message || `Analisis ${symbol} gagal.` });
        } finally {
            if (controllersRef.current.get(key) === controller) controllersRef.current.delete(key);
        }
    }, []);

    const stop = useCallback((key, type) => {
        controllersRef.current.get(key)?.abort();
        controllersRef.current.delete(key);
        dispatch({ type, key });
    }, []);

    return {
        tabs: state.tabs,
        activeTab: state.tabs.find((tab) => tab.key === state.activeKey) || null,
        analyze,
        cancel: useCallback((key) => stop(key, "cancel"), [stop]),
        remove: useCallback((key) => stop(key, "remove"), [stop]),
        select: useCallback((key) => dispatch({ type: "select", key }), []),
    };
}
