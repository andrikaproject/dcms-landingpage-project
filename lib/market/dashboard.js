"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { isAbortError } from "@/lib/signals/request";
import { createDashboardCoordinator } from "./dashboard-coordinator";
import { dashboardSearch, readDashboardQuery } from "./dashboard-core";

export const DASHBOARD_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Tiga jalur berikut sengaja terpisah. Pergantian timeframe hanya menjalankan
// yang pertama; kegagalan salah satu tidak mengosongkan yang lain.

export function useMarketDashboard({ enabled = true } = {}) {
    const coordinatorRef = useRef(null);
    const [state, setState] = useState({
        dashboard: null,
        displayedTimeframe: "15m",
        requestedTimeframe: "15m",
        symbol: "",
        pendingTimeframe: null,
        initialLoading: true,
        refreshing: false,
        error: "",
    });

    useEffect(() => {
        if (!enabled) return undefined;

        const startQuery = readDashboardQuery(window.location.search);
        const coordinator = createDashboardCoordinator({
            timeframe: startQuery.timeframe,
            symbol: startQuery.symbol,
            loadDashboard: ({ timeframe, symbol, signal }) => apiRequest("/market/dashboard", {
                query: { timeframe, symbol },
                signal,
            }),
            commitUrl: ({ timeframe, symbol }) => {
                const next = `${window.location.pathname}${dashboardSearch({ timeframe, symbol })}`;
                // Refresh berkala memakai parameter yang sama; jangan menumpuk riwayat.
                if (next === `${window.location.pathname}${window.location.search}`) return;
                window.history.pushState({}, "", next);
            },
        });

        coordinatorRef.current = coordinator;
        const unsubscribe = coordinator.subscribe(setState);
        coordinator.start();

        const syncFromUrl = () => coordinator.select(readDashboardQuery(window.location.search));
        window.addEventListener("popstate", syncFromUrl);
        const interval = window.setInterval(() => coordinator.refresh(), DASHBOARD_REFRESH_INTERVAL_MS);

        return () => {
            window.removeEventListener("popstate", syncFromUrl);
            window.clearInterval(interval);
            unsubscribe();
            coordinator.destroy();
            coordinatorRef.current = null;
        };
    }, [enabled]);

    const selectTimeframe = useCallback((timeframe) => coordinatorRef.current?.select({ timeframe }), []);
    const retry = useCallback(() => coordinatorRef.current?.retry(), []);
    const refresh = useCallback(() => coordinatorRef.current?.refresh(), []);

    return { ...state, selectTimeframe, retry, refresh };
}

export function useLockedSignals({ enabled = true } = {}) {
    // `loaded` disimpan, `loading` diturunkan. Dengan begitu efek tidak perlu
    // memanggil setState secara sinkron hanya untuk menandai awal pemuatan.
    const [state, setState] = useState({ items: [], meta: null, error: "", loaded: false });
    const [refreshing, setRefreshing] = useState(false);
    const activeRef = useRef(null);

    const run = useCallback(async ({ quiet = false } = {}) => {
        activeRef.current?.abort();
        const controller = new AbortController();
        activeRef.current = controller;

        try {
            const data = await apiRequest("/signals/locked", {
                query: { page: 1, status: "ACTIVE" },
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setState({ items: data.items || data.lockedSignals || [], meta: data.meta || null, error: "", loaded: true });
        } catch (loadError) {
            if (isAbortError(loadError, controller.signal)) return;
            setState((current) => ({
                ...current,
                error: loadError instanceof Error ? loadError.message : "Lock signal gagal dimuat.",
                loaded: true,
            }));
        } finally {
            if (activeRef.current === controller) activeRef.current = null;
            if (quiet && !controller.signal.aborted) setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;
        run();
        return () => activeRef.current?.abort();
    }, [enabled, run]);

    const setItems = useCallback((updater) => setState((current) => ({
        ...current,
        items: typeof updater === "function" ? updater(current.items) : updater,
    })), []);

    const refresh = useCallback(() => {
        setRefreshing(true);
        run({ quiet: true });
    }, [run]);

    const retry = useCallback(() => {
        setState((current) => ({ ...current, error: "", loaded: false }));
        run();
    }, [run]);

    return {
        items: state.items,
        meta: state.meta,
        error: state.error,
        loading: enabled && !state.loaded,
        refreshing,
        setItems,
        refresh,
        retry,
    };
}

export function useAdminSummary({ enabled = false } = {}) {
    const [state, setState] = useState({ pendingCount: 0, error: "", loaded: false });

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();

        apiRequest("/admin/users", { query: { page: 1, limit: 100 }, signal: controller.signal })
            .then((data) => {
                if (controller.signal.aborted) return;
                setState({
                    pendingCount: (data?.items || data?.users || []).filter((item) => item.statusReview === "PENDING").length,
                    error: "",
                    loaded: true,
                });
            })
            // Ringkasan admin yang gagal tidak boleh mengosongkan data market.
            .catch((summaryError) => {
                if (isAbortError(summaryError, controller.signal)) return;
                setState({
                    pendingCount: 0,
                    error: summaryError instanceof Error ? summaryError.message : "Ringkasan admin gagal dimuat.",
                    loaded: true,
                });
            });

        return () => controller.abort();
    }, [enabled]);

    return { pendingCount: state.pendingCount, error: state.error, loading: enabled && !state.loaded };
}
