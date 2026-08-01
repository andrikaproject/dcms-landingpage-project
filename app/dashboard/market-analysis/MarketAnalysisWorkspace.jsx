"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import MarketAnalysisControls from "./MarketAnalysisControls";
import PwlProximityScanner from "./PwlProximityScanner";
import MarketWatchlist from "./MarketWatchlist";
import InsightPanel from "./InsightPanel";
import { normalizeInput } from "./normalize";

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

function ChartSkeleton() {
    return (
        <div className="market-skeleton h-full w-full" />
    );
}

const KeyLevelChart = dynamic(() => import("./KeyLevelChart"), {
    ssr: false,
    loading: ChartSkeleton,
});

const BASIS_LABEL = {
    utc: "UTC Exchange",
    session: { asia: "Session: Asia", london: "Session: London", "new-york": "Session: New York" },
};

function activeBasisLabel(basis, session) {
    return basis === "session" ? BASIS_LABEL.session[session] : BASIS_LABEL.utc;
}

async function fetchKeyLevels(symbol, basis, session, interval, signal, forceRefresh = false) {
    const params = new URLSearchParams({ symbol, basis, interval });
    if (basis === "session") params.set("session", session);
    if (forceRefresh) params.set("refresh", "1");
    const res = await fetch(`/api/market-analysis/key-levels?${params.toString()}`, { signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        return { ok: false, status: res.status, error: body.error || "Data market belum bisa dimuat." };
    }
    return { ok: true, payload: body };
}

// Module-scoped last-good payloads, keyed per symbol+context. Survives client
// navigation so a failed refetch can keep showing the previous chart instead of
// blanking a watchlist row (mirrors the old stale-on-failure behavior).
const lastGoodPayloads = new Map();

// SWR fetcher: resolves every watchlist symbol into the { [symbol]: entry } shape
// the UI already expects. SWR caches the result globally, so returning to this
// page renders instantly from cache while revalidating in the background.
async function entriesFetcher([, symbolsKey, basis, session, interval, forceRefresh]) {
    const symbols = symbolsKey.split(",");
    const results = await Promise.all(
        symbols.map((sym) =>
            fetchKeyLevels(sym, basis, session, interval, undefined, forceRefresh).catch(() => ({
                ok: false,
                status: 0,
                error: "Data market belum bisa dimuat.",
            }))
        )
    );

    const entries = {};
    symbols.forEach((sym, index) => {
        const result = results[index];
        const cacheKey = `${sym}|${basis}|${session}|${interval}`;
        if (result.ok) {
            lastGoodPayloads.set(cacheKey, result.payload);
            entries[sym] = { loading: false, payload: result.payload, error: null };
        } else {
            const previous = lastGoodPayloads.get(cacheKey) || null;
            entries[sym] = {
                loading: false,
                payload: previous,
                error: result.error,
                notFound: result.status === 404,
                stale: Boolean(previous),
            };
        }
    });
    return entries;
}

export default function MarketAnalysisWorkspace() {
    const [basis, setBasis] = useState("utc");
    const [session, setSession] = useState("new-york");
    const [interval, setInterval] = useState("15m");
    const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
    const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
    const [refreshing, setRefreshing] = useState(false);

    // SWR keeps this result in a global cache keyed by the tuple below. Navigating
    // away and back re-mounts this component, but the cache persists across the
    // client-side navigation, so data renders instantly instead of refetching.
    const swrKey = ["key-levels", symbols.join(","), basis, session, interval, false];
    const { data: entries = {}, mutate } = useSWR(swrKey, entriesFetcher, {
        refreshInterval: 30_000,
        revalidateOnFocus: false,
        keepPreviousData: true,
        dedupingInterval: 5_000,
    });

    // Force-refresh: bypass the server response cache, then write the fresh data
    // straight into SWR's cache without an extra revalidation round trip.
    const refreshAll = useCallback(async () => {
        setRefreshing(true);
        try {
            await mutate(
                () => entriesFetcher(["key-levels", symbols.join(","), basis, session, interval, true]),
                { revalidate: false }
            );
        } finally {
            setRefreshing(false);
        }
    }, [mutate, symbols, basis, session, interval]);

    const handleAnalyze = useCallback((raw) => {
        const symbol = normalizeInput(raw);
        if (!symbol) return;
        setSymbols((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
        setSelectedSymbol(symbol);
    }, []);

    const handleBasisChange = useCallback((value) => setBasis(value), []);
    const handleSessionChange = useCallback((value) => {
        setSession(value);
        setBasis("session");
    }, []);

    const handleOpen4H = useCallback((symbol) => {
        setSymbols((previous) =>
            previous.includes(symbol) ? previous : [...previous, symbol]
        );
        setSelectedSymbol(symbol);
        setBasis("utc");
        setInterval("4h");
    }, []);

    const selected = entries[selectedSymbol] || { loading: true };
    const selectedPayload = selected.payload;

    function retry() {
        mutate();
    }

    return (
        <div className="market-analysis-workspace space-y-8">
            <MarketAnalysisControls
                basis={basis}
                session={session}
                onBasisChange={handleBasisChange}
                onSessionChange={handleSessionChange}
                onAnalyze={handleAnalyze}
                activeBasisLabel={activeBasisLabel(basis, session)}
                onRefresh={refreshAll}
                refreshing={refreshing}
                updatedAt={selectedPayload?.updatedAt}
                interval={interval}
            />

            <PwlProximityScanner onOpen4H={handleOpen4H} />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
                <div className="order-2 lg:order-1">
                    <MarketWatchlist
                        symbols={symbols}
                        entries={entries}
                        selectedSymbol={selectedSymbol}
                        onSelect={setSelectedSymbol}
                    />
                </div>

                <div className="order-1 lg:order-2">
                    <div className="market-chart-surface relative h-[460px] border border-white/10 bg-[#0b0f17] p-2 sm:h-[600px]">
                        {selected.stale && selectedPayload && (
                            <span className="absolute right-4 top-4 z-10 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">
                                Data terakhir
                            </span>
                        )}

                        {selected.loading && !selectedPayload ? (
                            <ChartSkeleton />
                        ) : selected.notFound && !selectedPayload ? (
                            <div className="flex h-full items-center justify-center px-6 text-center">
                                <p className="text-sm text-gray-400">
                                    Symbol tidak ditemukan di Bitunix futures. Coba gunakan format seperti BTCUSDT.
                                </p>
                            </div>
                        ) : selected.error && !selectedPayload ? (
                            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                                <p className="text-sm text-gray-400">
                                    Data market belum bisa dimuat. Coba lagi dalam beberapa saat.
                                </p>
                                <button
                                    type="button"
                                    onClick={retry}
                                    className="rounded-xl border border-white/15 px-4 py-1.5 text-sm text-gray-200 hover:border-[#B7FB5B] hover:text-[#B7FB5B]"
                                >
                                    Coba lagi
                                </button>
                            </div>
                        ) : (
                            <KeyLevelChart payload={selectedPayload} />
                        )}
                    </div>
                </div>

                <div className="order-3">
                    <InsightPanel payload={selectedPayload} loading={selected.loading && !selectedPayload} />
                </div>
            </div>
        </div>
    );
}
