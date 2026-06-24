"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Config ───────────────────────────────────────────────────────────────────

const OUTCOME_CONFIG = {
    OPEN: { label: "Masih berjalan", className: "border-sky-400/20 bg-sky-500/10 text-sky-300" },
    WIN: { label: "TP1 tercapai", className: "border-[#B7FB5B]/20 bg-[#B7FB5B]/10 text-[#B7FB5B]" },
    LOSS: { label: "SL tersentuh", className: "border-red-400/20 bg-red-500/10 text-red-300" },
    LOSS_SOFT: { label: "Balik arah", className: "border-orange-400/20 bg-orange-500/10 text-orange-300" },
    AMBIGUOUS: { label: "Volatilitas tinggi", className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300" },
};

const OUTCOME_HIT_LABEL = {
    WIN: { prefix: "TP1 hit", color: "text-[#B7FB5B]" },
    LOSS: { prefix: "SL hit", color: "text-red-300" },
    LOSS_SOFT: { prefix: "Reversed", color: "text-orange-300" },
    AMBIGUOUS: { prefix: "Closed", color: "text-yellow-300" },
};

const LOCKED_STATUS_CONFIG = {
    ACTIVE: { label: "Aktif", className: "border-sky-400/20 bg-sky-500/10 text-sky-300" },
    HIT_TP: { label: "TP2 tercapai", className: "border-[#B7FB5B]/20 bg-[#B7FB5B]/10 text-[#B7FB5B]" },
    HIT_SL: { label: "SL tersentuh", className: "border-red-400/20 bg-red-500/10 text-red-300" },
};

const LOCKED_HIT_LABEL = {
    HIT_TP: { prefix: "TP2 hit", color: "text-[#B7FB5B]" },
    HIT_SL: { prefix: "SL hit", color: "text-red-300" },
};

const LOCKED_STATUS_OPTIONS = [
    { value: "", label: "Semua Status" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "HIT_TP", label: "TP2 tercapai" },
    { value: "HIT_SL", label: "SL tersentuh" },
];

const GATE_CONFIG = {
    LONG_VALID: { label: "✓ Long valid", className: "border-[#B7FB5B]/20 bg-[#B7FB5B]/10 text-[#B7FB5B]" },
    SHORT_VALID: { label: "✓ Short valid", className: "border-red-400/20 bg-red-500/10 text-red-300" },
    NOT_READY: { label: "✗ Belum saatnya", className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300" },
};

const ACTION_LABELS = {
    SEARCH: "Search",
    REANALYZE: "Re-analyze",
    DASHBOARD_VIEW: "Dashboard",
    LOCK: "Lock",
};

const TIMEFRAMES = ["1m", "15m", "1h", "4h", "1d"];

const OUTCOME_OPTIONS = [
    { value: "", label: "Semua Outcome" },
    { value: "OPEN", label: "Masih berjalan" },
    { value: "WIN", label: "TP1 tercapai" },
    { value: "LOSS", label: "SL tersentuh" },
    { value: "LOSS_SOFT", label: "Balik arah" },
    { value: "AMBIGUOUS", label: "Volatilitas tinggi" },
];

const ACTION_OPTIONS = [
    { value: "", label: "Semua Aksi" },
    { value: "SEARCH", label: "Search" },
    { value: "REANALYZE", label: "Re-analyze" },
    { value: "DASHBOARD_VIEW", label: "Dashboard" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value) {
    if (value === null || value === undefined) return "-";
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    if (n >= 1000) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    return `$${n.toFixed(6)}`;
}

function relativeTime(iso) {
    if (!iso) return "-";
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Baru saja";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    if (diffSec < 30 * 86400) return `${Math.floor(diffSec / 86400)} hari lalu`;
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function absoluteTime(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(fromIso, toIso) {
    if (!fromIso || !toIso) return null;
    const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
    if (ms <= 0) return null;
    const totalMin = Math.floor(ms / 60_000);
    if (totalMin < 60) return `${totalMin} mnt`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h < 24) return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d} hari ${rh} jam` : `${d} hari`;
}

function biasBadgeClass(bias) {
    if (bias === "long") return "bg-gradient-to-br from-[#8AEF5A] to-[#4ADE80] text-[#052e16]";
    if (bias === "short") return "bg-gradient-to-br from-[#f49062] to-[#fd371f] text-[#fef3f2]";
    return "bg-gradient-to-br from-[#38bdf8] to-[#184BFF] text-white";
}

function biasText(bias) {
    if (bias === "long") return "LONG";
    if (bias === "short") return "SHORT";
    return "NEUTRAL";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`min-h-8 rounded-md border px-3 font-chakra text-xs font-bold transition ${
                active
                    ? "border-[#B7FB5B]/30 bg-[#B7FB5B]/15 text-[#B7FB5B]"
                    : "border-zinc-700 bg-black/10 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
        >
            {children}
        </button>
    );
}

function Badge({ config, fallback = null }) {
    if (!config) return fallback;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-chakra text-[11px] font-bold ${config.className}`}>
            {config.label}
        </span>
    );
}

function LockButton({ item }) {
    const [state, setState] = useState("idle"); // idle | loading | done | error
    const [errMsg, setErrMsg] = useState("");

    async function handleLock() {
        setState("loading");
        setErrMsg("");
        try {
            const res = await fetch("/api/locked-signals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: item.symbol,
                    base: item.base,
                    timeframe: item.timeframe,
                    bias: item.bias,
                    source: item.source,
                    marketType: item.marketType,
                    entry: Number(item.entry),
                    price: Number(item.currentPriceAtSignal ?? item.entry),
                    sl: item.sl != null ? Number(item.sl) : null,
                    tp1: item.tp1 != null ? Number(item.tp1) : null,
                    tp2: item.tp2 != null ? Number(item.tp2) : null,
                    rsi: item.rsi != null ? Number(item.rsi) : null,
                    emaFast: item.emaFast != null ? Number(item.emaFast) : null,
                    emaSlow: item.emaSlow != null ? Number(item.emaSlow) : null,
                    fastPeriod: item.fastPeriod != null ? Number(item.fastPeriod) : null,
                    slowPeriod: item.slowPeriod != null ? Number(item.slowPeriod) : null,
                    stochK: item.stochK != null ? Number(item.stochK) : null,
                    stochD: item.stochD != null ? Number(item.stochD) : null,
                    riskPercent: item.riskPercent != null ? Number(item.riskPercent) : null,
                    rewardPercent: item.rewardPercent != null ? Number(item.rewardPercent) : null,
                    riskReward: item.riskReward != null ? Number(item.riskReward) : null,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.error) {
                setErrMsg(json?.error || `Error ${res.status}`);
                setState("error");
            } else {
                setState("done");
            }
        } catch (e) {
            setErrMsg(e?.message || "Network error");
            setState("error");
        }
    }

    if (state === "done") {
        return (
            <Link
                href="/dashboard#lock-signal-list"
                className="inline-flex items-center gap-1 rounded-md border border-[#B7FB5B]/20 bg-[#B7FB5B]/10 px-2.5 py-1 font-chakra text-[10px] font-bold text-[#B7FB5B] transition hover:bg-[#B7FB5B]/20"
            >
                ✓ Terkunci · Lihat →
            </Link>
        );
    }

    return (
        <span className="inline-flex flex-col items-end gap-0.5">
            <button
                type="button"
                onClick={handleLock}
                disabled={state === "loading"}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-600 bg-black/20 px-2.5 py-1 font-chakra text-[10px] font-bold text-zinc-400 transition hover:border-[#B7FB5B]/40 hover:text-[#B7FB5B] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {state === "loading" ? "…" : state === "error" ? "Coba lagi" : "🔒 Lock"}
            </button>
            {state === "error" && errMsg && (
                <span className="font-chakra text-[9px] text-red-400">{errMsg}</span>
            )}
        </span>
    );
}

function HistoryCard({ item }) {
    const outcome = OUTCOME_CONFIG[item.outcomeStatus];
    const gate = item.gateLog ? GATE_CONFIG[item.gateLog.result] : null;
    const actionLabel = ACTION_LABELS[item.actionType] || item.actionType;
    const pairQuote = item.source === "DEXSCREENER" ? "USD" : "USDT";
    const hitMeta = OUTCOME_HIT_LABEL[item.outcomeStatus];
    const hitTime = hitMeta && item.outcomeResolvedAt ? absoluteTime(item.outcomeResolvedAt) : null;
    const hitDuration = hitMeta && item.outcomeResolvedAt ? formatDuration(item.seenAt, item.outcomeResolvedAt) : null;

    return (
        <article className="rounded-lg border border-white/[0.06] bg-[#1a1d24] p-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 font-chakra text-[10px] font-bold uppercase ${biasBadgeClass(item.bias)}`}>
                    {biasText(item.bias)}
                </span>
                <span className="font-chakra text-sm font-bold text-white">{item.base}/{pairQuote}</span>
                <span className="font-chakra text-xs text-zinc-500">{item.timeframe?.toUpperCase()}</span>
                <span className="font-chakra text-xs text-zinc-600">·</span>
                <span className="font-chakra text-xs text-zinc-500">{item.source}</span>
                <span className="ml-auto flex items-center gap-2">
                    {item.outcomeStatus === "OPEN" && <LockButton item={item} />}
                    <span className="font-chakra text-[10px] text-zinc-600">{actionLabel} · {relativeTime(item.seenAt)}</span>
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-chakra text-xs text-zinc-400">
                <span>Entry <span className="text-white">{formatPrice(item.entry)}</span></span>
                <span>SL <span className="text-red-300">{formatPrice(item.sl)}</span></span>
                <span>TP1 <span className="text-[#B7FB5B]">{formatPrice(item.tp1)}</span></span>
                {item.riskReward && (
                    <span>R:R <span className="text-zinc-300">1:{Number(item.riskReward).toFixed(1)}</span></span>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge config={outcome} fallback={
                    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-black/10 px-2.5 py-0.5 font-chakra text-[11px] text-zinc-500">
                        {item.outcomeStatus}
                    </span>
                } />
                <Badge config={gate} fallback={
                    <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-black/5 px-2.5 py-0.5 font-chakra text-[11px] text-zinc-600">
                        Gate belum dievaluasi
                    </span>
                } />
                {hitTime && (
                    <span className={`ml-auto font-chakra text-[10px] ${hitMeta.color}`}>
                        {hitMeta.prefix} · {hitTime}
                        {hitDuration && (
                            <span className="ml-1 text-zinc-500">({hitDuration} setelah analyze)</span>
                        )}
                    </span>
                )}
            </div>
        </article>
    );
}

function LockedCard({ item }) {
    const statusCfg = LOCKED_STATUS_CONFIG[item.status];
    const hitMeta = LOCKED_HIT_LABEL[item.status];
    const hitTime = hitMeta && item.hitAt ? absoluteTime(item.hitAt) : null;
    const hitDuration = hitMeta && item.hitAt ? formatDuration(item.createdAt, item.hitAt) : null;
    const pairQuote = item.source === "DEXSCREENER" ? "USD" : "USDT";

    return (
        <article className="rounded-lg border border-white/[0.06] bg-[#1a1d24] p-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 font-chakra text-[10px] font-bold uppercase ${biasBadgeClass(item.bias)}`}>
                    {biasText(item.bias)}
                </span>
                <span className="font-chakra text-sm font-bold text-white">{item.base}/{pairQuote}</span>
                <span className="font-chakra text-xs text-zinc-500">{item.timeframe?.toUpperCase()}</span>
                <span className="font-chakra text-xs text-zinc-600">·</span>
                <span className="font-chakra text-xs text-zinc-500">{item.source}</span>
                <span className="ml-auto font-chakra text-[10px] text-zinc-600">
                    Lock · {relativeTime(item.createdAt)}
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-chakra text-xs text-zinc-400">
                <span>Entry <span className="text-white">{formatPrice(item.entry)}</span></span>
                <span>SL <span className="text-red-300">{formatPrice(item.sl)}</span></span>
                <span>TP1 <span className="text-[#B7FB5B]">{formatPrice(item.tp1)}</span></span>
                <span>TP2 <span className="text-emerald-400">{formatPrice(item.tp2)}</span></span>
                {item.riskReward && (
                    <span>R:R <span className="text-zinc-300">1:{Number(item.riskReward).toFixed(1)}</span></span>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {statusCfg && (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-chakra text-[11px] font-bold ${statusCfg.className}`}>
                        {statusCfg.label}
                    </span>
                )}
                {hitTime && (
                    <span className={`ml-auto font-chakra text-[10px] ${hitMeta.color}`}>
                        {hitMeta.prefix} · {hitTime}
                        {hitDuration && (
                            <span className="ml-1 text-zinc-500">({hitDuration} setelah lock)</span>
                        )}
                    </span>
                )}
            </div>
        </article>
    );
}

function SkeletonCard() {
    return <div className="h-[116px] animate-pulse rounded-lg border border-white/[0.04] bg-[#1a1d24]" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SignalHistoryList() {
    const [activeTab, setActiveTab] = useState("history");

    // History tab state
    const [symbolInput, setSymbolInput] = useState("");
    const [symbol, setSymbol] = useState("");
    const [timeframe, setTimeframe] = useState("");
    const [outcomeStatus, setOutcomeStatus] = useState("");
    const [actionType, setActionType] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], hasMore: false });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Locked tab state
    const [lockedStatus, setLockedStatus] = useState("");
    const [lockedPage, setLockedPage] = useState(1);
    const [lockedData, setLockedData] = useState({ items: [], hasMore: false });
    const [isLockedLoading, setIsLockedLoading] = useState(false);
    const [lockedError, setLockedError] = useState("");

    const debounceRef = useRef(null);

    function handleSymbolInput(e) {
        const value = e.target.value;
        setSymbolInput(value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSymbol(value);
            setPage(1);
        }, 450);
    }

    function setFilterAndReset(setter, value) {
        setter(value);
        setPage(1);
    }

    function resetFilters() {
        setSymbolInput("");
        setSymbol("");
        setTimeframe("");
        setOutcomeStatus("");
        setActionType("");
        setPage(1);
    }

    useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
            if (!cancelled) {
                setIsLoading(true);
                setError("");
            }
        });

        const params = new URLSearchParams({ page: String(page) });
        if (symbol) params.set("symbol", symbol);
        if (timeframe) params.set("timeframe", timeframe);
        if (outcomeStatus) params.set("outcomeStatus", outcomeStatus);
        if (actionType) params.set("actionType", actionType);

        fetch(`/api/signal-history?${params.toString()}`, { cache: "no-store" })
            .then((res) => {
                if (!res.ok) throw new Error("Gagal mengambil data.");
                return res.json();
            })
            .then((json) => { if (!cancelled) setData(json); })
            .catch((err) => { if (!cancelled) setError(err.message || "Gagal mengambil data."); })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return () => { cancelled = true; };
    }, [symbol, timeframe, outcomeStatus, actionType, page]);

    useEffect(() => {
        if (activeTab !== "locked") return;
        let cancelled = false;
        setIsLockedLoading(true);
        setLockedError("");

        const params = new URLSearchParams({ page: String(lockedPage) });
        if (lockedStatus) params.set("status", lockedStatus);

        fetch(`/api/locked-signals?${params.toString()}`, { cache: "no-store" })
            .then((res) => {
                if (!res.ok) throw new Error("Gagal mengambil locked signals.");
                return res.json();
            })
            .then((json) => { if (!cancelled) setLockedData(json); })
            .catch((err) => { if (!cancelled) setLockedError(err.message || "Gagal mengambil locked signals."); })
            .finally(() => { if (!cancelled) setIsLockedLoading(false); });

        return () => { cancelled = true; };
    }, [activeTab, lockedStatus, lockedPage]);

    const hasActiveFilter = Boolean(symbol || timeframe || outcomeStatus || actionType);

    return (
        <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-chakra text-xl font-bold text-white sm:text-2xl">Signal History</h1>
                    <p className="mt-1 font-chakra text-sm text-zinc-400">
                        Signal yang pernah kamu search, re-analyze, atau lihat di dashboard.
                    </p>
                </div>
                <Link
                    href="/dashboard"
                    className="shrink-0 rounded-md border border-zinc-700 bg-black/10 px-3 py-2 font-chakra text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                >
                    ← Dashboard
                </Link>
            </div>

            {/* Tab toggle */}
            <div className="mt-5 flex gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-1 w-fit">
                {[{ key: "history", label: "History" }, { key: "locked", label: "Lock Signal" }].map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`rounded-md px-4 py-1.5 font-chakra text-xs font-bold transition ${
                            activeTab === key
                                ? "bg-[#B7FB5B]/20 text-[#B7FB5B]"
                                : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* History tab */}
            {activeTab === "history" && (
                <>
                    {/* Filters */}
                    <div className="mt-6 space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Cari symbol (BTC, ETH, SOL...)"
                                value={symbolInput}
                                onChange={handleSymbolInput}
                                className="min-h-9 flex-1 rounded-md border border-zinc-700 bg-black/20 px-3 font-chakra text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#B7FB5B]/50 focus:ring-1 focus:ring-[#B7FB5B]/20"
                            />
                            {hasActiveFilter && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="min-h-9 rounded-md border border-zinc-700 bg-black/10 px-3 font-chakra text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <FilterChip active={!timeframe} onClick={() => setFilterAndReset(setTimeframe, "")}>Semua TF</FilterChip>
                            {TIMEFRAMES.map((tf) => (
                                <FilterChip key={tf} active={timeframe === tf} onClick={() => setFilterAndReset(setTimeframe, timeframe === tf ? "" : tf)}>
                                    {tf.toUpperCase()}
                                </FilterChip>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <select value={outcomeStatus} onChange={(e) => setFilterAndReset(setOutcomeStatus, e.target.value)} className="min-h-9 rounded-md border border-zinc-700 bg-[#1a1d24] px-3 font-chakra text-xs text-zinc-300 outline-none focus:border-[#B7FB5B]/50">
                                {OUTCOME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <select value={actionType} onChange={(e) => setFilterAndReset(setActionType, e.target.value)} className="min-h-9 rounded-md border border-zinc-700 bg-[#1a1d24] px-3 font-chakra text-xs text-zinc-300 outline-none focus:border-[#B7FB5B]/50">
                                {ACTION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mt-6">
                        {isLoading ? (
                            <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
                        ) : error ? (
                            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 font-chakra text-sm text-red-200">{error}</p>
                        ) : data.items.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/70 px-6 py-12 text-center">
                                <p className="font-chakra text-sm font-bold text-zinc-400">Belum ada historical signal</p>
                                <p className="mt-2 font-chakra text-xs text-zinc-600">
                                    {hasActiveFilter ? "Tidak ada signal yang cocok dengan filter ini." : "Signal yang kamu search atau re-analyze akan muncul di sini."}
                                </p>
                                {hasActiveFilter ? (
                                    <button type="button" onClick={resetFilters} className="mt-4 font-chakra text-xs text-[#B7FB5B] hover:underline">Reset filter</button>
                                ) : (
                                    <Link href="/dashboard" className="mt-4 inline-block font-chakra text-xs text-[#B7FB5B] hover:underline">Kembali ke Dashboard →</Link>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {data.items.map((item) => <HistoryCard key={item.exposureId} item={item} />)}
                                </div>
                                <div className="mt-6 flex items-center justify-between gap-4">
                                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="min-h-9 rounded-md border border-zinc-700 bg-black/10 px-4 font-chakra text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">← Sebelumnya</button>
                                    <span className="font-chakra text-xs text-zinc-600">Halaman {page}</span>
                                    <button type="button" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)} className="min-h-9 rounded-md border border-zinc-700 bg-black/10 px-4 font-chakra text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya →</button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Locked tab */}
            {activeTab === "locked" && (
                <>
                    {/* Filter status */}
                    <div className="mt-6">
                        <div className="flex flex-wrap gap-2">
                            {LOCKED_STATUS_OPTIONS.map((opt) => (
                                <FilterChip key={opt.value} active={lockedStatus === opt.value} onClick={() => { setLockedStatus(opt.value); setLockedPage(1); }}>
                                    {opt.label}
                                </FilterChip>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mt-6">
                        {isLockedLoading ? (
                            <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
                        ) : lockedError ? (
                            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 font-chakra text-sm text-red-200">{lockedError}</p>
                        ) : lockedData.items.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/70 px-6 py-12 text-center">
                                <p className="font-chakra text-sm font-bold text-zinc-400">Belum ada locked signal</p>
                                <p className="mt-2 font-chakra text-xs text-zinc-600">Lock signal dari dashboard untuk mulai melacak pergerakannya.</p>
                                <Link href="/dashboard" className="mt-4 inline-block font-chakra text-xs text-[#B7FB5B] hover:underline">Kembali ke Dashboard →</Link>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {lockedData.items.map((item) => <LockedCard key={item.id} item={item} />)}
                                </div>
                                <div className="mt-6 flex items-center justify-between gap-4">
                                    <button type="button" disabled={lockedPage <= 1} onClick={() => setLockedPage((p) => Math.max(1, p - 1))} className="min-h-9 rounded-md border border-zinc-700 bg-black/10 px-4 font-chakra text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">← Sebelumnya</button>
                                    <span className="font-chakra text-xs text-zinc-600">Halaman {lockedPage}</span>
                                    <button type="button" disabled={!lockedData.hasMore} onClick={() => setLockedPage((p) => p + 1)} className="min-h-9 rounded-md border border-zinc-700 bg-black/10 px-4 font-chakra text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya →</button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
