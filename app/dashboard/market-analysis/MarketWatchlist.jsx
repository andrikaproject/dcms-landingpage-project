"use client";

import { formatAbsPercent, formatPrice, LEVEL_LABEL } from "./format";

function WatchlistCardSkeleton() {
    return <div className="market-skeleton h-[116px] border-b border-white/10" />;
}

function nearestText(entry) {
    const { nearestLevel, distances } = entry.payload || {};
    if (!nearestLevel || !Number.isFinite(distances?.[nearestLevel])) return "—";
    return `${LEVEL_LABEL[nearestLevel]} · ${formatAbsPercent(distances[nearestLevel])}`;
}

export default function MarketWatchlist({ symbols, entries, selectedSymbol, onSelect }) {
    return (
        <section className="market-watchlist" aria-label="Market watchlist">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Watchlist</p>
                    <p className="mt-1 text-xs text-gray-400">Tap a market to inspect</p>
                </div>
                <span className="font-mono text-[10px] text-gray-500">{symbols.length.toString().padStart(2, "0")}</span>
            </div>
            <div className="divide-y divide-white/10">
            {symbols.map((symbol) => {
                const entry = entries[symbol];
                if (!entry || entry.loading) return <WatchlistCardSkeleton key={symbol} />;

                const isSelected = symbol === selectedSymbol;
                const payload = entry.payload;

                return (
                    <button
                        key={symbol}
                        type="button"
                        onClick={() => onSelect(symbol)}
                        aria-pressed={isSelected}
                        className={`group relative w-full px-3 py-4 text-left transition duration-300 hover:bg-white/[0.025] active:scale-[0.99] ${
                            isSelected
                                ? "bg-[#B7FB5B]/[0.055]"
                                : "bg-transparent"
                        }`}
                    >
                        {isSelected && <span className="absolute inset-y-3 left-0 w-0.5 bg-[#B7FB5B]" aria-hidden="true" />}
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-sm font-semibold tracking-tight text-gray-100">{symbol}</span>
                            {isSelected && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#B7FB5B]">
                                    <span className="market-live-dot" aria-hidden="true" /> Selected
                                </span>
                            )}
                        </div>

                        {entry.error ? (
                            <p className="mt-2 text-xs text-red-400">{entry.error}</p>
                        ) : (
                            <>
                                <p className="mt-2 font-mono text-xl font-semibold tabular-nums tracking-tight text-white">
                                    {formatPrice(payload?.currentPrice)}
                                </p>
                                <span className="mt-2 inline-block border-l border-[#B7FB5B]/60 pl-2 text-[11px] font-medium text-gray-300">
                                    {payload?.alertState || "—"}
                                </span>
                                <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                                    <span>Terdekat: {nearestText(entry)}</span>
                                    <span>{payload?.rangeState || ""}</span>
                                </div>
                            </>
                        )}
                    </button>
                );
            })}
            </div>
        </section>
    );
}
