// State tab "Hasil Analisis": satu tab per pasangan koin + timeframe yang
// dianalisis user. Murni supaya urutan, batas, dan pembatalan bisa diuji di Node.

export const ANALYSIS_TABS_STORAGE_KEY = "dcms-analysis-tabs:v1";
export const MAX_ANALYSIS_TABS = 8;
export const TAB_STATUS = { LOADING: "loading", READY: "ready", ERROR: "error" };

export function analysisKey(symbol, timeframe) {
    return `${symbol}|${timeframe}`;
}

export function baseOf(symbol) {
    return String(symbol || "").replace(/USDT$|USD$/i, "");
}

export const EMPTY_ANALYSIS_STATE = { tabs: [], activeKey: null };

// Tab terlama yang tidak sedang aktif dan tidak sedang memuat dibuang lebih
// dulu saat batas tercapai.
function enforceLimit(tabs, activeKey, limit) {
    const next = [...tabs];
    while (next.length > limit) {
        const index = next.findIndex((tab) => tab.key !== activeKey && tab.status !== TAB_STATUS.LOADING);
        next.splice(index === -1 ? 0 : index, 1);
    }
    return next;
}

function neighbourKey(tabs, removedIndex) {
    const neighbour = tabs[removedIndex] || tabs[removedIndex - 1];
    return neighbour ? neighbour.key : null;
}

export function analysisTabsReducer(state, action) {
    switch (action.type) {
        case "start": {
            const key = analysisKey(action.symbol, action.timeframe);
            const existing = state.tabs.find((tab) => tab.key === key);
            if (existing) {
                // Analisis ulang: hasil lama disimpan supaya Batalkan bisa kembali ke sana.
                const tabs = state.tabs.map((tab) => (tab.key === key
                    ? { ...tab, status: TAB_STATUS.LOADING, error: "", requestedAt: action.now, previous: tab.signal ? { signal: tab.signal, analyzedAt: tab.analyzedAt } : null }
                    : tab));
                return { tabs, activeKey: key };
            }

            const tab = {
                key,
                symbol: action.symbol,
                base: baseOf(action.symbol),
                timeframe: action.timeframe,
                status: TAB_STATUS.LOADING,
                signal: null,
                error: "",
                requestedAt: action.now,
                analyzedAt: null,
                previous: null,
            };
            return { tabs: enforceLimit([...state.tabs, tab], key, action.limit ?? MAX_ANALYSIS_TABS), activeKey: key };
        }
        case "succeed": {
            if (!state.tabs.some((tab) => tab.key === action.key)) return state;
            const tabs = state.tabs.map((tab) => (tab.key === action.key
                ? { ...tab, status: TAB_STATUS.READY, signal: action.signal, analyzedAt: action.now, error: "", previous: null }
                : tab));
            return { ...state, tabs };
        }
        case "fail": {
            if (!state.tabs.some((tab) => tab.key === action.key)) return state;
            const tabs = state.tabs.map((tab) => (tab.key === action.key
                ? { ...tab, status: TAB_STATUS.ERROR, error: action.error }
                : tab));
            return { ...state, tabs };
        }
        case "cancel": {
            const index = state.tabs.findIndex((tab) => tab.key === action.key);
            if (index === -1) return state;
            const tab = state.tabs[index];
            if (tab.previous) {
                const tabs = state.tabs.map((item) => (item.key === action.key
                    ? { ...item, status: TAB_STATUS.READY, signal: tab.previous.signal, analyzedAt: tab.previous.analyzedAt, previous: null, error: "" }
                    : item));
                return { ...state, tabs };
            }
            return analysisTabsReducer(state, { type: "remove", key: action.key });
        }
        case "remove": {
            const index = state.tabs.findIndex((tab) => tab.key === action.key);
            if (index === -1) return state;
            const tabs = state.tabs.filter((tab) => tab.key !== action.key);
            const activeKey = state.activeKey === action.key ? neighbourKey(tabs, index) : state.activeKey;
            return { tabs, activeKey };
        }
        case "select":
            return state.tabs.some((tab) => tab.key === action.key) ? { ...state, activeKey: action.key } : state;
        default:
            return state;
    }
}

// Hanya hasil yang selesai yang disimpan. Analisis yang sedang berjalan tidak
// bisa dilanjutkan setelah reload, jadi tidak ada gunanya diingat.
export function serializeAnalysisTabs(state) {
    const tabs = state.tabs
        .filter((tab) => tab.signal)
        .map((tab) => ({
            symbol: tab.symbol,
            timeframe: tab.timeframe,
            signal: tab.status === TAB_STATUS.READY ? tab.signal : tab.previous?.signal ?? tab.signal,
            analyzedAt: tab.status === TAB_STATUS.READY ? tab.analyzedAt : tab.previous?.analyzedAt ?? tab.analyzedAt,
        }));
    return JSON.stringify({ tabs, activeKey: state.activeKey });
}

export function parseAnalysisTabs(raw) {
    try {
        const parsed = JSON.parse(raw || "null");
        if (!parsed || !Array.isArray(parsed.tabs)) return EMPTY_ANALYSIS_STATE;
        const tabs = parsed.tabs
            .filter((tab) => tab?.symbol && tab?.timeframe && tab?.signal)
            .slice(-MAX_ANALYSIS_TABS)
            .map((tab) => ({
                key: analysisKey(tab.symbol, tab.timeframe),
                symbol: tab.symbol,
                base: baseOf(tab.symbol),
                timeframe: tab.timeframe,
                status: TAB_STATUS.READY,
                signal: tab.signal,
                error: "",
                requestedAt: null,
                analyzedAt: tab.analyzedAt || null,
                previous: null,
            }));
        const activeKey = tabs.some((tab) => tab.key === parsed.activeKey) ? parsed.activeKey : tabs.at(-1)?.key ?? null;
        return { tabs, activeKey };
    } catch {
        return EMPTY_ANALYSIS_STATE;
    }
}
