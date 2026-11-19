"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useLivePrices } from "@/lib/market/live-prices";
import { filterTradingPairs, normalizeQuery } from "@/lib/market/trading-pairs-core";
import { useTradingPairs } from "@/lib/market/trading-pairs";
import { ANALYSIS_TIMEFRAMES } from "./analysis-timeframes";
import { CoinAvatar, formatPrice, formatTimeframe } from "./ui";
import { useDialog } from "./useDialog";

const RESULT_LIMIT = 6;

function pairLabelOf(pair) {
    return `${pair.base}/${pair.quote || "USDT"}`;
}

export default function AnalyzeCoinModal({ initialQuery = "", defaultTimeframe, onClose, onSubmit }) {
    const titleId = useId();
    const listId = useId();
    const panelRef = useRef(null);
    const inputRef = useRef(null);
    const [query, setQuery] = useState(initialQuery);
    const [activeIndex, setActiveIndex] = useState(0);
    const [timeframe, setTimeframe] = useState(defaultTimeframe);
    const { pairs, status } = useTradingPairs();
    useDialog(panelRef, onClose, { initialFocusRef: inputRef });

    const results = useMemo(() => filterTradingPairs(pairs, query, { limit: RESULT_LIMIT }), [pairs, query]);
    const livePrices = useLivePrices(results, { enabled: results.length > 0 });
    const normalized = normalizeQuery(query);
    // Daftar pair gagal dimuat: simbol yang diketik tetap boleh dianalisis,
    // backend yang memutuskan apakah pair itu ada.
    const fallbackSymbol = status === "error" && normalized ? (normalized.endsWith("USDT") ? normalized : `${normalized}USDT`) : "";
    const selected = results[Math.min(activeIndex, results.length - 1)] || (fallbackSymbol ? { symbol: fallbackSymbol, base: fallbackSymbol.replace(/USDT$/, ""), quote: "USDT" } : null);

    function submit() {
        if (!selected) return;
        onSubmit(selected.symbol, timeframe);
    }

    function handleKeyDown(event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (!results.length) return;
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (index + step + results.length) % results.length);
        } else if (event.key === "Enter") {
            event.preventDefault();
            submit();
        }
    }

    const showNotFound = status === "ready" && normalized && results.length === 0;

    return (
        <div
            className="tactile-backdrop fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 backdrop-blur-[2px]"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="tactile-dialog flex max-h-[calc(100dvh-2rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-[#161a1e] shadow-[var(--shadow-modal)] focus:outline-none"
            >
                <div className="flex flex-col gap-4 overflow-y-auto px-6 pb-5 pt-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 id={titleId} className="font-chakra text-lg font-bold leading-6 text-[#f8fafc]">Analisis koin</h2>
                            <p className="mt-0.5 font-chakra text-xs leading-4 text-[#94a3b8]">Pilih pair dan timeframe. Hasil bias tampil di Dashboard.</p>
                        </div>
                        <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-md text-[#94a3b8] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]" aria-label="Tutup">
                            <X size={18} aria-hidden />
                        </button>
                    </div>

                    <div className="flex h-11 items-center gap-2.5 rounded-xl border border-[#b8fb5c]/70 bg-[#0b0d0f] px-3.5 focus-within:border-[#b8fb5c]">
                        <MagnifyingGlass size={16} className="shrink-0 text-[#b8fb5c]" aria-hidden />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setActiveIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            role="combobox"
                            aria-expanded={results.length > 0}
                            aria-controls={listId}
                            aria-activedescendant={selected && results.length ? `${listId}-${activeIndex}` : undefined}
                            aria-autocomplete="list"
                            aria-label="Cari koin"
                            placeholder="Cari koin, contoh: BTC, SOL, HIGH"
                            autoComplete="off"
                            spellCheck={false}
                            className="min-w-0 flex-1 bg-transparent font-chakra text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none"
                        />
                        <kbd className="rounded border border-[#334155] px-1.5 font-mono text-[10px] text-[#94a3b8]">Esc</kbd>
                    </div>

                    <div>
                        {normalized && results.length > 0 && (
                            <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
                                Hasil pencarian · {results.length} pair
                            </p>
                        )}
                        <ul id={listId} role="listbox" aria-label="Hasil pencarian" className="flex flex-col gap-1">
                            {results.map((pair, index) => {
                                const isActive = index === activeIndex;
                                const price = livePrices.prices[pair.symbol];
                                return (
                                    <li
                                        key={pair.symbol}
                                        id={`${listId}-${index}`}
                                        role="option"
                                        aria-selected={isActive}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => setActiveIndex(index)}
                                        onDoubleClick={() => onSubmit(pair.symbol, timeframe)}
                                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${isActive ? "border-[#b8fb5c]/60 bg-[#b8fb5c]/[0.06]" : "border-transparent hover:bg-white/[0.03]"}`}
                                    >
                                        <CoinAvatar label={pair.base} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-chakra text-sm font-bold leading-[18px] text-[#f8fafc]">{pairLabelOf(pair)}</p>
                                            <p className="font-chakra text-[11px] leading-[14px] text-[#64748b]">Bitunix Futures · Perp</p>
                                        </div>
                                        <p className="shrink-0 font-mono text-[13px] font-semibold text-[#f8fafc]">{price ? `$${formatPrice(price)}` : ""}</p>
                                        {isActive && <Check size={16} weight="bold" className="shrink-0 text-[#b8fb5c]" aria-hidden />}
                                    </li>
                                );
                            })}
                        </ul>
                        {status === "loading" && normalized && (
                            <p className="font-chakra text-xs text-[#94a3b8]">Memuat daftar pair Bitunix…</p>
                        )}
                        {showNotFound && (
                            <p role="status" className="rounded-xl border border-dashed border-[#334155] px-3.5 py-3 font-chakra text-xs text-[#94a3b8]">
                                “{query.trim()}” tidak ditemukan di pair USDT Bitunix Futures. Periksa ejaan simbolnya.
                            </p>
                        )}
                        {status === "error" && (
                            <p className="font-chakra text-xs text-[#94a3b8]">Daftar pair gagal dimuat. Ketik simbol lengkap, misalnya BTC, lalu tekan Enter.</p>
                        )}
                    </div>

                    <fieldset>
                        <legend className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b]">Timeframe</legend>
                        <div className="grid grid-cols-6 gap-2">
                            {ANALYSIS_TIMEFRAMES.map((option) => {
                                const checked = option === timeframe;
                                return (
                                    <label
                                        key={option}
                                        className={`grid h-9 cursor-pointer place-items-center rounded-lg border font-mono text-xs font-medium transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#b8fb5c] ${checked ? "border-[#b8fb5c] bg-[#b8fb5c]/15 text-[#b8fb5c]" : "border-[#334155] text-[#94a3b8] hover:text-[#f8fafc]"}`}
                                    >
                                        <input type="radio" name="analysis-timeframe" value={option} checked={checked} onChange={() => setTimeframe(option)} className="sr-only" />
                                        {formatTimeframe(option)}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#232a30] bg-[#161a1e] px-6 py-4">
                    <p className="hidden font-mono text-[11px] text-[#64748b] sm:block">↑↓ pilih · Enter analisis</p>
                    <div className="ml-auto flex gap-2">
                        <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[#334155] px-3 font-chakra text-sm font-medium text-[#f8fafc] transition hover:border-[#475569] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]">
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!selected}
                            className="h-9 rounded-lg bg-[#b8fb5c] px-3 font-chakra text-sm font-semibold text-black transition hover:bg-[#a8ec4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {selected ? `Analisis ${pairLabelOf(selected)} · ${formatTimeframe(timeframe)}` : "Pilih koin dulu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
