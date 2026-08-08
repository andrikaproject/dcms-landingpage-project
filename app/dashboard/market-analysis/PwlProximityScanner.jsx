"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ArrowUpRight,
    CaretDown,
    CaretUp,
    ChartLineDown,
    ClockCountdown,
    WarningCircle,
} from "@phosphor-icons/react";
import {
    SCANNER_DEFAULT_LEVEL,
    SCANNER_LEVELS,
    SCANNER_LEVEL_LABELS,
} from "@/lib/market/pwl-proximity-scanner-core";
import { apiRequest } from "@/lib/api/client";

const percentFormatter = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
});

function priceDigits(value) {
    const absolute = Math.abs(value);
    if (absolute >= 100) return 2;
    if (absolute >= 1) return 4;
    if (absolute >= 0.01) return 6;
    return 8;
}

function formatScannerPrice(value, { signed = false } = {}) {
    if (!Number.isFinite(value)) return "—";
    const formatted = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: priceDigits(value),
    }).format(Math.abs(value));
    const sign = signed ? (value >= 0 ? "+" : "-") : "";
    return `${sign}$${formatted}`;
}

function formatDistance(value) {
    if (!Number.isFinite(value)) return "—";
    const sign = value >= 0 ? "+" : "−";
    return `${sign}${percentFormatter.format(Math.abs(value))}%`;
}

function formatVolume(value) {
    if (!Number.isFinite(value)) return "—";
    return `$${compactFormatter.format(value)}`;
}

function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function remainingCacheLabel(cacheExpiresAt, now) {
    const remainingMs = new Date(cacheExpiresAt).getTime() - now;
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "Cache berakhir";
    const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
    return `Cache ${minutes} menit`;
}

function ScannerSkeleton() {
    return (
        <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    key={index}
                    className="market-skeleton h-[74px] rounded-xl border border-white/[0.04]"
                />
            ))}
        </div>
    );
}

function ResultRow({ result, index, levelLabel, onOpen4H }) {
    const status = result.proximityTier || (result.isVeryNear ? "very-near" : "near");
    const below = result.direction === "below";
    const DirectionIcon = below ? CaretDown : CaretUp;
    const statusLabel = {
        "very-near": "Sangat Dekat",
        near: "Dekat",
        watch: "Pantau",
    }[status];
    const statusClass = {
        "very-near": "border-[#B7FB5B]/35 bg-[#B7FB5B]/[0.08] text-[#B7FB5B]",
        near: "border-sky-300/25 bg-sky-300/[0.07] text-sky-200",
        watch: "border-white/15 bg-white/[0.04] text-gray-300",
    }[status];

    return (
        <div
            className="pwl-result-row grid gap-3 border-t border-white/[0.07] px-4 py-4 xl:grid-cols-[minmax(130px,1.25fr)_repeat(5,minmax(90px,1fr))_minmax(110px,auto)] xl:items-center xl:px-5"
            style={{ "--pwl-row-index": index }}
        >
            <div className="flex min-w-0 items-center justify-between gap-3 xl:block">
                <div>
                    <p className="truncate font-mono text-sm font-semibold tracking-tight text-white" translate="no">
                        {result.symbol}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                        Bitunix futures
                    </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusClass}`}>
                    {statusLabel}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:contents">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500 xl:hidden">Harga</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-gray-200 xl:mt-0">
                        {formatScannerPrice(result.currentPrice)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500 xl:hidden">{levelLabel}</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-gray-200 xl:mt-0">
                        {formatScannerPrice(result.levelPrice)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500 xl:hidden">Jarak harga</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-gray-300 xl:mt-0">
                        {formatScannerPrice(result.deltaPrice, { signed: true })}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500 xl:hidden">Jarak {levelLabel}</p>
                    <div className="mt-1 flex items-center gap-1.5 xl:mt-0">
                        <DirectionIcon
                            size={12}
                            weight="bold"
                            className={below ? "text-red-300" : "text-[#B7FB5B]"}
                            aria-hidden="true"
                        />
                        <span className={`font-mono text-xs font-semibold tabular-nums ${below ? "text-red-200" : "text-[#B7FB5B]"}`}>
                            {formatDistance(result.distancePercent)}
                        </span>
                        <span className="sr-only">{below ? "di bawah" : "di atas"} {levelLabel}</span>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500 xl:hidden">Volume 24j</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-gray-400 xl:mt-0">
                        {formatVolume(result.volume24h)}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={() => onOpen4H(result.symbol)}
                className="inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 transition duration-300 hover:-translate-y-0.5 hover:border-[#B7FB5B]/60 hover:text-[#B7FB5B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FB5B]/60 active:translate-y-0 active:scale-[0.98] xl:w-auto"
                aria-label={`Buka ${result.symbol} pada chart 4 jam`}
            >
                Open 4H
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
            </button>
        </div>
    );
}

export default function PwlProximityScanner({ onOpen4H }) {
    const [expanded, setExpanded] = useState(true);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [cacheStatus, setCacheStatus] = useState("");
    const [now, setNow] = useState(Date.now());
    const [selectedLevel, setSelectedLevel] = useState(SCANNER_DEFAULT_LEVEL);

    useEffect(() => {
        if (!data?.cacheExpiresAt) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, [data?.cacheExpiresAt]);

    const selectedLabel = SCANNER_LEVEL_LABELS[selectedLevel];
    // Results belong to a specific level; hide them once the dropdown moves on so a
    // manual re-scan is required for the new target (matches "manual scan only").
    const showResults = Boolean(data) && data.level === selectedLevel;
    const resultsLabel = data ? SCANNER_LEVEL_LABELS[data.level] : selectedLabel;
    const results = showResults && Array.isArray(data?.results) ? data.results : [];
    const cacheLabel = useMemo(
        () => remainingCacheLabel(data?.cacheExpiresAt, now),
        [data?.cacheExpiresAt, now]
    );

    async function scan() {
        setLoading(true);
        setError("");
        setExpanded(true);

        try {
            const body = await apiRequest("/market-analysis/level-scanner", { query: { level: selectedLevel } });
            setData(body);
            setCacheStatus(body.cacheStatus || "");
            setNow(Date.now());
        } catch (cause) {
            setError(
                cause?.message || "Scanner belum bisa dijalankan. Coba lagi dalam beberapa saat."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section
            className="pwl-scanner overflow-hidden rounded-[18px] border border-white/10 bg-[#0d131d] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
            aria-labelledby="pwl-scanner-title"
        >
            <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.5fr)_auto] lg:items-center lg:px-6">
                <div className="flex min-w-0 items-start gap-4">
                    <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.06] text-[#B7FB5B]">
                        <ChartLineDown size={21} weight="regular" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B7FB5B]">
                                Liquidity scanner
                            </p>
                            <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-400">
                                UTC · 4H
                            </span>
                        </div>
                        <h2 id="pwl-scanner-title" className="mt-1.5 text-balance text-xl font-semibold tracking-tight text-white">
                            Level Proximity Scanner
                        </h2>
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-400">
                            Dari 20 market USDT paling liquid, tampilkan 5 yang paling dekat (±5%) dengan {selectedLabel}.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                    <label className="relative flex-1 sm:flex-none">
                        <span className="sr-only">Pilih level acuan scanner</span>
                        <select
                            value={selectedLevel}
                            onChange={(event) => setSelectedLevel(event.target.value)}
                            className="w-full touch-manipulation appearance-none rounded-lg border border-white/15 bg-[#0b0f17] py-2.5 pl-3 pr-9 text-sm font-semibold text-gray-200 transition duration-300 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FB5B]/60 sm:w-auto"
                            aria-label="Level acuan scanner"
                        >
                            {SCANNER_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                    {SCANNER_LEVEL_LABELS[level]}
                                </option>
                            ))}
                        </select>
                        <CaretDown
                            size={15}
                            weight="bold"
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            aria-hidden="true"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={scan}
                        disabled={loading}
                        aria-busy={loading}
                        className="inline-flex flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg bg-[#B7FB5B] px-4 py-2.5 text-sm font-semibold text-[#0b0f17] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c4ff78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FB5B]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d131d] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-65 sm:flex-none"
                    >
                        <span className={loading ? "market-live-dot" : "h-1.5 w-1.5 rounded-full bg-[#0b0f17]"} aria-hidden="true" />
                        {loading ? "Memindai market…" : `Scan ${selectedLabel}`}
                    </button>
                    <button
                        type="button"
                        onClick={() => setExpanded((current) => !current)}
                        aria-expanded={expanded}
                        aria-controls="pwl-scanner-content"
                        aria-label={expanded ? "Tutup panel scanner" : "Buka panel scanner"}
                        className="grid h-10 w-10 shrink-0 touch-manipulation place-items-center rounded-lg border border-white/15 text-gray-400 transition duration-300 hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FB5B]/60 active:scale-[0.96]"
                    >
                        <CaretDown
                            size={17}
                            weight="bold"
                            className={`transition-transform duration-300 ${expanded ? "rotate-180" : "rotate-0"}`}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>

            {expanded && (
                <div id="pwl-scanner-content" className="pwl-panel-reveal border-t border-white/[0.08]">
                    <p className="sr-only" aria-live="polite">
                        {loading ? "Pemindaian sedang berjalan." : error || (showResults ? "Hasil pemindaian diperbarui." : "")}
                    </p>
                    <div className="flex flex-col gap-3 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between lg:px-6">
                        <p className="flex items-start gap-2 text-gray-500">
                            <WarningCircle size={15} weight="regular" className="mt-px shrink-0" aria-hidden="true" />
                            Scanner menampilkan kedekatan harga dengan {selectedLabel}, bukan sinyal entry.
                        </p>
                        {showResults && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500" aria-live="polite">
                                <span>Scan {formatTime(data.scannedAt)}</span>
                                <span className="inline-flex items-center gap-1.5">
                                    <ClockCountdown size={14} weight="regular" aria-hidden="true" />
                                    {cacheLabel}
                                </span>
                                {cacheStatus === "HIT" && (
                                    <span className="text-[#B7FB5B]">Data cache</span>
                                )}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mx-5 mb-4 flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:mx-6" role="alert">
                            <p className="text-sm text-red-200">{error}</p>
                            <button
                                type="button"
                                onClick={scan}
                                disabled={loading}
                                className="shrink-0 touch-manipulation text-left text-xs font-semibold text-red-200 underline decoration-red-300/40 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 disabled:opacity-50"
                            >
                                Coba lagi
                            </button>
                        </div>
                    )}

                    {loading && showResults && (
                        <p className="mx-5 mb-4 border-l-2 border-[#B7FB5B]/50 pl-3 text-xs text-gray-400 lg:mx-6" aria-live="polite">
                            Pemindaian baru berjalan. Hasil sebelumnya tetap ditampilkan.
                        </p>
                    )}

                    {loading && !showResults ? (
                        <div className="px-5 pb-5 lg:px-6"><ScannerSkeleton /></div>
                    ) : showResults ? (
                        <div>
                            {data.skippedCount > 0 && (
                                <p className="mx-5 mb-4 text-xs text-amber-300/80 lg:mx-6">
                                    {data.skippedCount} dari {data.candidateCount} market dilewati karena data belum lengkap.
                                </p>
                            )}

                            {results.length === 0 ? (
                                <div className="border-t border-white/[0.07] px-5 py-10 text-left lg:px-6">
                                    <p className="text-sm font-medium text-gray-200">
                                        Belum ada market liquid dalam rentang ±5% dari {resultsLabel}.
                                    </p>
                                    <p className="mt-1.5 text-xs text-gray-500">
                                        Coba scan kembali setelah cache berakhir untuk membaca kondisi terbaru.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div className="hidden grid-cols-[minmax(130px,1.25fr)_repeat(5,minmax(90px,1fr))_minmax(110px,auto)] gap-3 border-t border-white/[0.07] bg-white/[0.018] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 xl:grid">
                                        <span>Market</span>
                                        <span>Harga</span>
                                        <span>{resultsLabel}</span>
                                        <span>Jarak harga</span>
                                        <span>Jarak {resultsLabel}</span>
                                        <span>Volume 24j</span>
                                        <span className="sr-only">Aksi</span>
                                    </div>
                                    {results.map((result, index) => (
                                        <ResultRow
                                            key={result.symbol}
                                            result={result}
                                            index={index}
                                            levelLabel={resultsLabel}
                                            onOpen4H={onOpen4H}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border-t border-white/[0.07] px-5 py-8 lg:px-6">
                            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
                                <div>
                                    <p className="text-sm font-medium text-gray-200">
                                        {data
                                            ? `Level diubah ke ${selectedLabel}. Tekan Scan untuk memuat hasil terbaru.`
                                            : `Siap mencari market dekat ${selectedLabel}.`}
                                    </p>
                                    <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-gray-500">
                                        Scan berjalan saat tombol ditekan. Hasil diurutkan dari jarak terdekat dan disimpan selama 5 menit.
                                    </p>
                                </div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
                                    Manual scan only
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
