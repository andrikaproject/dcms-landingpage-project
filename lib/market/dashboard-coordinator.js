import { createRequestSequence, isAbortError } from "../signals/request.js";
import {
    DEFAULT_TIMEFRAME,
    TIMEFRAME_DEBOUNCE_MS,
    describeTimeframeError,
    normalizeTimeframe,
} from "./dashboard-core.js";

// Koordinator request market dashboard. Ini satu-satunya jalur yang dijalankan
// saat timeframe berganti; locked signal dan ringkasan admin punya jalurnya
// sendiri dan tidak ikut dimuat ulang.
//
// Empat aturan yang dijaga di sini:
//   1. Data yang sedang tampil tidak dihapus selama request berikutnya berjalan.
//   2. Klik beruntun diredam, lalu request sebelumnya dibatalkan.
//   3. Response yang sudah didahului pilihan baru tidak boleh dipasang.
//   4. URL baru dipasang setelah datanya tampil, bukan saat diklik.
export function createDashboardCoordinator({
    loadDashboard,
    commitUrl = () => {},
    createController = () => new AbortController(),
    schedule = (callback, ms) => setTimeout(callback, ms),
    cancelSchedule = (handle) => clearTimeout(handle),
    debounceMs = TIMEFRAME_DEBOUNCE_MS,
    timeframe = DEFAULT_TIMEFRAME,
    symbol = "",
} = {}) {
    const sequence = createRequestSequence();
    const listeners = new Set();
    let pendingTimer = null;
    let activeController = null;
    let destroyed = false;

    let state = {
        dashboard: null,
        displayedTimeframe: normalizeTimeframe(timeframe),
        requestedTimeframe: normalizeTimeframe(timeframe),
        symbol,
        pendingTimeframe: null,
        initialLoading: true,
        refreshing: false,
        error: "",
    };

    function setState(patch) {
        if (destroyed) return;
        state = { ...state, ...patch };
        for (const listener of listeners) listener(state);
    }

    async function run({ nextTimeframe, nextSymbol }) {
        // Request browser sebelumnya dibatalkan. Backend tetap perlu menggabungkan
        // miss yang sama karena request HTTP bisa berjalan terus setelah browser
        // memutus koneksinya.
        activeController?.abort();
        const controller = createController();
        activeController = controller;
        const token = sequence.next();

        try {
            const dashboard = await loadDashboard({ timeframe: nextTimeframe, symbol: nextSymbol, signal: controller.signal });
            if (!sequence.isCurrent(token) || destroyed) return;

            setState({
                dashboard,
                displayedTimeframe: normalizeTimeframe(dashboard?.timeframe || nextTimeframe),
                symbol: nextSymbol,
                pendingTimeframe: null,
                initialLoading: false,
                refreshing: false,
                error: "",
            });
            // Alamat baru dipasang hanya setelah datanya benar-benar tampil.
            commitUrl({ timeframe: normalizeTimeframe(dashboard?.timeframe || nextTimeframe), symbol: nextSymbol });
        } catch (error) {
            // Request yang dibatalkan bukan kegagalan yang perlu dilihat user.
            if (isAbortError(error, controller.signal)) return;
            if (!sequence.isCurrent(token) || destroyed) return;

            setState({
                pendingTimeframe: null,
                initialLoading: false,
                refreshing: false,
                error: describeTimeframeError({
                    requestedTimeframe: nextTimeframe,
                    displayedTimeframe: state.dashboard ? state.displayedTimeframe : null,
                    message: error instanceof Error ? error.message : "Data market gagal diperbarui.",
                }),
            });
        } finally {
            if (activeController === controller) activeController = null;
        }
    }

    function request({ nextTimeframe, nextSymbol, immediate }) {
        if (destroyed) return;
        if (pendingTimer !== null) cancelSchedule(pendingTimer);

        setState({
            requestedTimeframe: nextTimeframe,
            pendingTimeframe: nextTimeframe === state.displayedTimeframe && state.dashboard ? null : nextTimeframe,
            refreshing: Boolean(state.dashboard),
            initialLoading: !state.dashboard,
            error: "",
        });

        pendingTimer = schedule(() => {
            pendingTimer = null;
            run({ nextTimeframe, nextSymbol });
        }, immediate ? 0 : debounceMs);
    }

    return {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        start() {
            request({ nextTimeframe: state.requestedTimeframe, nextSymbol: state.symbol, immediate: true });
        },
        select({ timeframe: nextTimeframe, symbol: nextSymbol } = {}) {
            const target = normalizeTimeframe(nextTimeframe ?? state.requestedTimeframe);
            const targetSymbol = nextSymbol ?? state.symbol;
            if (target === state.requestedTimeframe && targetSymbol === state.symbol && state.dashboard && !state.error) return;
            request({ nextTimeframe: target, nextSymbol: targetSymbol, immediate: false });
        },
        // Refresh berkala memakai timeframe yang sedang tampil dan tidak
        // menampilkan keadaan memuat penuh.
        refresh() {
            request({ nextTimeframe: state.displayedTimeframe, nextSymbol: state.symbol, immediate: true });
        },
        retry() {
            request({ nextTimeframe: state.requestedTimeframe, nextSymbol: state.symbol, immediate: true });
        },
        destroy() {
            destroyed = true;
            if (pendingTimer !== null) cancelSchedule(pendingTimer);
            activeController?.abort();
            listeners.clear();
        },
    };
}
