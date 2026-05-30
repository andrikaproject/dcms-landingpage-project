"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ClearableSignalBoard from "@/components/ClearableSignalBoard";
import CoinSearchForm from "./CoinSearchForm";
import DashboardToast from "./DashboardToast";

const SIGNAL_BOARD_STORAGE_PREFIX = "dcms-dashboard-signal-board";
const SIGNAL_FILTER_OPTIONS = [
    { value: "all", label: "Semua Signal" },
    { value: "bias-short", label: "Bias Short" },
    { value: "bias-long", label: "Bias Long" },
    { value: "bias-neutral", label: "Bias Neutral" },
    { value: "near-target", label: "Terdekat TP1 / TP2" },
    { value: "near-sl", label: "Terdekat SL" },
    { value: "near-entry", label: "Terdekat Entry" },
];
const BOARD_TABS = [
    { value: "signal", label: "Signal Board" },
    { value: "scam-pump", label: "Scam Pump Board" },
];
const SCAM_PUMP_ANALYZE_COOLDOWN_SECONDS = 120;

function DashboardSignalBoardSkeleton() {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-5">
            {[0, 1, 2, 3].map((item) => (
                <div
                    key={item}
                    className="min-h-[420px] animate-pulse rounded-lg bg-gradient-to-br from-[#374151] to-[#111827] p-5"
                >
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="space-y-3">
                            <div className="h-5 w-24 rounded bg-white/10" />
                            <div className="h-6 w-32 rounded bg-white/10" />
                            <div className="h-4 w-20 rounded bg-white/10" />
                        </div>
                        <div className="h-10 w-28 rounded-lg bg-white/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[0, 1, 2, 3, 4, 5].map((metric) => (
                            <div key={metric} className="h-12 rounded-lg bg-white/10" />
                        ))}
                    </div>
                    <div className="mt-6 h-20 rounded-lg bg-white/10" />
                    <div className="mt-6 grid grid-cols-3 gap-3">
                        <div className="h-12 rounded-lg bg-white/10" />
                        <div className="h-12 rounded-lg bg-white/10" />
                        <div className="h-12 rounded-lg bg-white/10" />
                    </div>
                </div>
            ))}
        </div>
    );
}

const DashboardSignalBoard = dynamic(() => import("./DashboardSignalBoard"), {
    ssr: false,
    loading: DashboardSignalBoardSkeleton,
});

function normalizeSearchKeyword(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getStorageKey(timeframe) {
    return `${SIGNAL_BOARD_STORAGE_PREFIX}:${timeframe}`;
}

function getRemovedStorageKey(timeframe) {
    return `${SIGNAL_BOARD_STORAGE_PREFIX}:removed:${timeframe}`;
}

function readPersistedSignals(timeframe) {
    if (typeof window === "undefined") return [];

    try {
        const rawValue = window.localStorage.getItem(getStorageKey(timeframe));
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];

        return Array.isArray(parsedValue)
            ? parsedValue.filter((signal) => signal?.symbol)
            : [];
    } catch {
        return [];
    }
}

function readPersistedRemovedSymbols(timeframe) {
    if (typeof window === "undefined") return [];

    try {
        const rawValue = window.localStorage.getItem(getRemovedStorageKey(timeframe));
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];

        return Array.isArray(parsedValue)
            ? parsedValue.filter(Boolean)
            : [];
    } catch {
        return [];
    }
}

function writePersistedSignals(timeframe, signals) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(getStorageKey(timeframe), JSON.stringify(signals));
    } catch {
        // Ignore storage failures so the dashboard remains usable in private/limited storage modes.
    }
}

function writePersistedRemovedSymbols(timeframe, symbols) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(getRemovedStorageKey(timeframe), JSON.stringify([...new Set(symbols)]));
    } catch {
        // Ignore storage failures so local board edits never block the dashboard.
    }
}

function upsertSignal(signals, nextSignal) {
    const nextSymbol = nextSignal.symbol;
    const existingIndex = signals.findIndex((signal) => signal.symbol === nextSymbol);

    if (existingIndex === -1) return [nextSignal, ...signals];

    return [
        nextSignal,
        ...signals.slice(0, existingIndex),
        ...signals.slice(existingIndex + 1),
    ];
}

function mergeSignals(primarySignals, fallbackSignals) {
    return fallbackSignals.reduce(
        (mergedSignals, signal) => (
            mergedSignals.some((currentSignal) => currentSignal.symbol === signal.symbol)
                ? mergedSignals
                : [...mergedSignals, signal]
        ),
        primarySignals
    );
}

function withoutRemovedSignals(signals, removedSymbols) {
    const removedSet = new Set(removedSymbols);
    return signals.filter((signal) => !removedSet.has(signal.symbol));
}

function getPersistableSignals(signals, initialSignals) {
    const initialSymbols = new Set(initialSignals.map((signal) => signal.symbol));

    return signals.filter((signal) => !initialSymbols.has(signal.symbol));
}

function formatCompactUsd(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    if (number >= 1_000_000_000) return `$${(number / 1_000_000_000).toFixed(1)}B`;
    if (number >= 1_000_000) return `$${(number / 1_000_000).toFixed(1)}M`;
    if (number >= 1_000) return `$${(number / 1_000).toFixed(1)}K`;
    if (number >= 1) return `$${number.toFixed(2)}`;
    return `$${number.toFixed(6)}`;
}

function formatSignedPercent(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}%`;
}

function BoardTabs({ activeTab, onChange }) {
    return (
        <div className="mb-5 mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2">
            <div className="grid grid-cols-2 gap-2">
                {BOARD_TABS.map((tab) => {
                    const isActive = activeTab === tab.value;

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => onChange(tab.value)}
                            className={`min-h-11 rounded-xl px-3 font-chakra text-sm font-bold transition active:scale-[0.99] ${isActive
                                ? "bg-[#B7FB5B] text-black"
                                : "bg-black/20 text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                                }`}
                            aria-pressed={isActive}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function ScamPumpCard({ recommendation }) {
    const isPump = recommendation.isPump;

    return (
        <article className="rounded-xl border border-zinc-800 bg-gradient-to-br from-[#202838] to-[#111827] p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className={`rounded-md px-2 py-1 font-chakra text-[10px] font-bold uppercase tracking-[0.18em] ${isPump
                        ? "bg-red-500/20 text-red-200"
                        : "bg-[#B7FB5B]/15 text-[#D9FF9A]"
                        }`}
                    >
                        {recommendation.status}
                    </span>
                    <h3 className="mt-2 truncate font-nebulica text-xl font-bold text-white">
                        {recommendation.base}/USDT
                    </h3>
                    <p className="font-chakra text-xs text-zinc-400">
                        Score {Number(recommendation.score || 0).toFixed(1)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-chakra text-xs font-bold text-zinc-500">Price</p>
                    <p className="font-chakra text-sm font-bold text-white">{formatCompactUsd(recommendation.price)}</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">1m Move</p>
                    <p className={`mt-1 font-chakra text-sm font-bold ${recommendation.change1m >= 0 ? "text-[#B7FB5B]" : "text-red-300"}`}>
                        {formatSignedPercent(recommendation.change1m)}
                    </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Volume Spike</p>
                    <p className="mt-1 font-chakra text-sm font-bold text-white">
                        {recommendation.volumeRatioLabel || `${Number(recommendation.volumeRatio || 0).toFixed(1)}x`}
                    </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">24h Move</p>
                    <p className={`mt-1 font-chakra text-sm font-bold ${recommendation.change24h >= 0 ? "text-[#B7FB5B]" : "text-red-300"}`}>
                        {formatSignedPercent(recommendation.change24h)}
                    </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">24h Volume</p>
                    <p className="mt-1 font-chakra text-sm font-bold text-white">
                        {formatCompactUsd(recommendation.volume24h)}
                    </p>
                </div>
            </div>

            <p className="mt-4 rounded-lg border border-white/[0.06] bg-black/15 p-3 font-chakra text-xs leading-5 text-zinc-300">
                {recommendation.reason}
            </p>
        </article>
    );
}

function ScamPumpBoard({
    recommendations,
    isAnalyzing,
    cooldownRemaining,
    error,
    updatedAt,
    inspectedCount,
    onAnalyze,
}) {
    const hasResults = recommendations.length > 0;
    const isCoolingDown = cooldownRemaining > 0;
    const isAnalyzeDisabled = isAnalyzing || isCoolingDown;

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Scam Pump Board</p>
                    <h2 className="mt-1 font-nebulica text-[clamp(1.25rem,1.1rem+0.75vw,1.5rem)] font-bold text-white">
                        1m Pump Scanner
                    </h2>
                    <p className="mt-1 font-chakra text-xs text-zinc-500">
                        Scan pair USDT aktif berdasarkan spike volume dan candle 1 menit.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={isAnalyzeDisabled}
                    aria-busy={isAnalyzing || isCoolingDown}
                    className="min-h-11 rounded-lg border-2 border-white/10 bg-[#B7FB5B] px-5 font-chakra text-sm font-bold text-black transition hover:bg-[#a8ec4c] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isAnalyzing
                        ? "Analyzing..."
                        : isCoolingDown
                            ? `Analyze lagi ${cooldownRemaining}s`
                            : "Analyze"}
                </button>
            </div>

            {updatedAt && (
                <p className="mt-3 font-chakra text-xs text-zinc-500">
                    Updated {new Date(updatedAt).toLocaleTimeString("id-ID")} · Inspected {inspectedCount} pairs
                </p>
            )}

            {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 font-chakra text-sm text-red-200">
                    {error}
                </div>
            )}

            {isAnalyzing && (
                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
                    {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="h-64 animate-pulse rounded-xl bg-white/[0.06]" />
                    ))}
                </div>
            )}

            {!isAnalyzing && hasResults && (
                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
                    {recommendations.map((recommendation) => (
                        <ScamPumpCard key={recommendation.symbol} recommendation={recommendation} />
                    ))}
                </div>
            )}

            {!isAnalyzing && !hasResults && !error && (
                <div className="mt-5 rounded-xl border border-dashed border-zinc-800 bg-black/20 p-5 font-chakra text-sm text-zinc-500">
                    Klik Analyze untuk menjalankan scan scam pump terbaru.
                </div>
            )}
        </section>
    );
}

function SignalBoardFilters({ value, onChange, onReset }) {
    return (
        <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-600">Filter Signal</p>
                    <p className="mt-1 font-chakra text-xs text-zinc-500">Urutkan bias atau jarak harga terhadap level signal.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {SIGNAL_FILTER_OPTIONS.map((option) => {
                        const isActive = value === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onChange(option.value)}
                                aria-pressed={isActive}
                                className={`min-h-10 rounded-lg border px-3 font-chakra text-xs font-bold transition active:scale-95 ${isActive
                                    ? "border-[#B7FB5B]/40 bg-[#B7FB5B] text-black"
                                    : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700 hover:text-white"
                                    }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                    {value !== "all" && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="min-h-10 rounded-lg border border-red-500/20 bg-red-500/10 px-3 font-chakra text-xs font-bold text-red-300 transition hover:bg-red-500/15 hover:text-red-200 active:scale-95"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DashboardSignalWorkspace({
    initialSignals,
    initialSearchKeyword = "",
    timeframe,
    updatedAt,
}) {
    const [, setRemovedSymbols] = useState(() => readPersistedRemovedSymbols(timeframe));
    const [signals, setSignals] = useState(() => (
        withoutRemovedSignals(
            mergeSignals(readPersistedSignals(timeframe), initialSignals),
            readPersistedRemovedSymbols(timeframe)
        )
    ));
    const [searchKeyword, setSearchKeyword] = useState(initialSearchKeyword);
    const [searchError, setSearchError] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [boardUpdatedAt, setBoardUpdatedAt] = useState(updatedAt);
    const [toasts, setToasts] = useState([]);
    const [signalFilter, setSignalFilter] = useState("all");
    const [activeBoardTab, setActiveBoardTab] = useState("signal");
    const [scamPumpRecommendations, setScamPumpRecommendations] = useState([]);
    const [isAnalyzingScamPump, setIsAnalyzingScamPump] = useState(false);
    const [scamPumpError, setScamPumpError] = useState("");
    const [scamPumpUpdatedAt, setScamPumpUpdatedAt] = useState("");
    const [scamPumpInspectedCount, setScamPumpInspectedCount] = useState(0);
    const [scamPumpCooldownUntil, setScamPumpCooldownUntil] = useState(0);
    const [scamPumpNow, setScamPumpNow] = useState(Date.now());
    const scamPumpCooldownRemaining = Math.max(0, Math.ceil((scamPumpCooldownUntil - scamPumpNow) / 1000));

    useEffect(() => {
        if (scamPumpCooldownUntil <= Date.now()) return undefined;

        const timer = window.setInterval(() => {
            const nextNow = Date.now();
            setScamPumpNow(nextNow);

            if (scamPumpCooldownUntil <= nextNow) {
                window.clearInterval(timer);
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [scamPumpCooldownUntil]);

    function showToast(type, message, action) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((currentToasts) => [
            ...currentToasts.slice(-2),
            { id, type, message, action },
        ]);
    }

    function dismissToast(id) {
        setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }

    async function handleSearchSubmit(event) {
        event.preventDefault();

        const activeKeyword = normalizeSearchKeyword(searchKeyword);
        if (!activeKeyword) {
            const message = "Masukkan symbol coin dulu sebelum Analyze.";
            setSearchError(message);
            showToast("error", message);
            return;
        }

        setIsSearching(true);
        setSearchError("");

        try {
            const searchParams = new URLSearchParams({
                symbol: activeKeyword,
                timeframe,
            });
            const response = await fetch(`/api/market-signal?${searchParams.toString()}`, {
                cache: "no-store",
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error || `Symbol ${activeKeyword} tidak ditemukan.`);
            }

            setSignals((currentSignals) => {
                const nextSignals = upsertSignal(currentSignals, payload.signal);
                writePersistedSignals(timeframe, getPersistableSignals(nextSignals, initialSignals));

                return nextSignals;
            });
            setRemovedSymbols((currentSymbols) => {
                const nextSymbols = currentSymbols.filter((symbol) => symbol !== payload.signal.symbol);
                writePersistedRemovedSymbols(timeframe, nextSymbols);

                return nextSymbols;
            });
            setBoardUpdatedAt(payload.updatedAt || new Date().toISOString());
            showToast("success", `${payload.signal.base} berhasil ditambahkan ke Signal Board.`);
        } catch (error) {
            const message = error.message || `Symbol ${activeKeyword} tidak ditemukan.`;
            setSearchError(message);
            showToast("error", message);
        } finally {
            setIsSearching(false);
        }
    }

    function handleSignalUpdate(nextSignal, nextUpdatedAt) {
        setSignals((currentSignals) => {
            const nextSignals = upsertSignal(currentSignals, nextSignal);
            writePersistedSignals(timeframe, getPersistableSignals(nextSignals, initialSignals));

            return nextSignals;
        });
        setRemovedSymbols((currentSymbols) => {
            const nextSymbols = currentSymbols.filter((symbol) => symbol !== nextSignal.symbol);
            writePersistedRemovedSymbols(timeframe, nextSymbols);

            return nextSymbols;
        });
        setBoardUpdatedAt(nextUpdatedAt || new Date().toISOString());
    }

    function restoreSignal(signal) {
        setSignals((currentSignals) => {
            const nextSignals = upsertSignal(currentSignals, signal);
            writePersistedSignals(timeframe, getPersistableSignals(nextSignals, initialSignals));

            return nextSignals;
        });
        setRemovedSymbols((currentSymbols) => {
            const nextSymbols = currentSymbols.filter((symbol) => symbol !== signal.symbol);
            writePersistedRemovedSymbols(timeframe, nextSymbols);

            return nextSymbols;
        });
        setBoardUpdatedAt(new Date().toISOString());
    }

    function handleSignalDelete(signal) {
        setSignals((currentSignals) => {
            const nextSignals = currentSignals.filter((currentSignal) => currentSignal.symbol !== signal.symbol);
            writePersistedSignals(timeframe, getPersistableSignals(nextSignals, initialSignals));

            return nextSignals;
        });

        if (initialSignals.some((initialSignal) => initialSignal.symbol === signal.symbol)) {
            setRemovedSymbols((currentSymbols) => {
                const nextSymbols = [...new Set([...currentSymbols, signal.symbol])];
                writePersistedRemovedSymbols(timeframe, nextSymbols);

                return nextSymbols;
            });
        }

        setBoardUpdatedAt(new Date().toISOString());
        showToast("success", `${signal.base} dihapus dari Signal Board.`, {
            label: "Undo",
            onClick: () => restoreSignal(signal),
        });
    }

    async function handleScamPumpAnalyze() {
        const remaining = Math.max(0, Math.ceil((scamPumpCooldownUntil - Date.now()) / 1000));

        if (remaining > 0) {
            setScamPumpNow(Date.now());
            return;
        }

        const nextCooldownUntil = Date.now() + SCAM_PUMP_ANALYZE_COOLDOWN_SECONDS * 1000;
        setScamPumpCooldownUntil(nextCooldownUntil);
        setScamPumpNow(Date.now());
        setIsAnalyzingScamPump(true);
        setScamPumpError("");

        try {
            const response = await fetch("/api/scam-pump-board", {
                cache: "no-store",
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error || "Analisis Scam Pump Board gagal.");
            }

            const recommendations = Array.isArray(payload.recommendations)
                ? payload.recommendations
                : [];

            setScamPumpRecommendations(recommendations);
            setScamPumpUpdatedAt(payload.updatedAt || new Date().toISOString());
            setScamPumpInspectedCount(Number(payload.inspectedCount || 0));
            showToast("success", recommendations.length > 0
                ? "Scam Pump Board selesai dianalisis."
                : "Analisis selesai, belum ada kandidat kuat.");
        } catch (error) {
            const message = error.message || "Analisis Scam Pump Board gagal.";
            setScamPumpError(message);
            showToast("error", message);
        } finally {
            setIsAnalyzingScamPump(false);
        }
    }

    return (
        <>
            <DashboardToast toasts={toasts} onDismiss={dismissToast} />

            <BoardTabs activeTab={activeBoardTab} onChange={setActiveBoardTab} />

            {activeBoardTab === "signal" ? (
                <>
                    <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
                        <CoinSearchForm
                            searchValue={searchKeyword}
                            isSearching={isSearching}
                            onSearchChange={setSearchKeyword}
                            onSearchSubmit={handleSearchSubmit}
                            onClearSearch={() => {
                                setSearchKeyword("");
                                setSearchError("");
                            }}
                        />
                        {searchError && (
                            <p className="mt-3 text-sm text-red-300">
                                {searchError}
                            </p>
                        )}
                    </section>

                    <ClearableSignalBoard
                        updatedAt={new Date(boardUpdatedAt).toLocaleTimeString("id-ID")}
                        signalCount={signals.length}
                        controls={(
                            <SignalBoardFilters
                                value={signalFilter}
                                onChange={setSignalFilter}
                                onReset={() => setSignalFilter("all")}
                            />
                        )}
                    >
                        <DashboardSignalBoard
                            signals={signals}
                            searchKeyword={searchKeyword}
                            filterMode={signalFilter}
                            onSignalUpdate={handleSignalUpdate}
                            onSignalDelete={handleSignalDelete}
                            onToast={showToast}
                        />
                    </ClearableSignalBoard>
                </>
            ) : (
                <ScamPumpBoard
                    recommendations={scamPumpRecommendations}
                    isAnalyzing={isAnalyzingScamPump}
                    cooldownRemaining={scamPumpCooldownRemaining}
                    error={scamPumpError}
                    updatedAt={scamPumpUpdatedAt}
                    inspectedCount={scamPumpInspectedCount}
                    onAnalyze={handleScamPumpAnalyze}
                />
            )}
        </>
    );
}
