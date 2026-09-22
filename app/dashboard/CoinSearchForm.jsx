"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useLivePrices } from "@/lib/market/live-prices";
import { filterTradingPairs, monogramFor, normalizeQuery } from "@/lib/market/trading-pairs-core";
import { formatDecimalPrice } from "@/lib/signals/format";

// Bitunix tidak menyediakan ikon coin, jadi tiap coin diberi monogram dengan
// warna yang konsisten dari nama base-nya.
function CoinMonogram({ base }) {
    const { initials, hue } = monogramFor(base);

    return (
        <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full font-chakra text-[10px] font-black tracking-wide"
            style={{ backgroundColor: `hsl(${hue} 55% 22%)`, color: `hsl(${hue} 90% 78%)` }}
        >
            {initials}
        </span>
    );
}

export default function CoinSearchForm({
    searchValue,
    isSearching = false,
    onSearchChange,
    onSearchSubmit,
    onClearSearch,
    pairs = [],
    pairsStatus = "idle",
}) {
    const listId = useId();
    const inputRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const hasSearch = Boolean(searchValue);
    const query = normalizeQuery(searchValue);
    const suggestions = useMemo(() => filterTradingPairs(pairs, searchValue), [pairs, searchValue]);
    const onlyExactMatch = suggestions.length === 1 && suggestions[0].base.toUpperCase() === query;
    const showList = isOpen && suggestions.length > 0 && !onlyExactMatch;
    const showNoMatch = isOpen && pairsStatus === "ready" && query.length >= 2 && suggestions.length === 0;
    const activeOptionId = showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;
    const noMatchId = `${listId}-no-match`;
    const pairsErrorId = `${listId}-pairs-error`;
    const livePrices = useLivePrices(suggestions, { enabled: showList });
    const describedBy = [showNoMatch ? noMatchId : null, pairsStatus === "error" ? pairsErrorId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    function selectPair(pair) {
        onSearchChange(pair.base);
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
    }

    function handleChange(event) {
        onSearchChange(event.target.value);
        setIsOpen(true);
        setActiveIndex(-1);
    }

    function handleKeyDown(event) {
        if (!showList) {
            if (event.key === "ArrowDown" && suggestions.length > 0) {
                event.preventDefault();
                setIsOpen(true);
                setActiveIndex(0);
            }
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % suggestions.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
        } else if (event.key === "Enter" && activeIndex >= 0) {
            // Enter tanpa pilihan aktif tetap mengirim form seperti sebelumnya.
            event.preventDefault();
            selectPair(suggestions[activeIndex]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            setActiveIndex(-1);
        } else if (event.key === "Tab") {
            setIsOpen(false);
        }
    }

    return (
        <form className="flex flex-col gap-3 md:flex-row md:items-start" onSubmit={onSearchSubmit}>
            <div className="relative flex-1">
                <label htmlFor="symbol-search" className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                    Search coin
                </label>
                <input
                    ref={inputRef}
                    id="symbol-search"
                    name="symbol"
                    value={searchValue}
                    onChange={handleChange}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="BTC, ETH, SOL, PEPE..."
                    autoComplete="off"
                    spellCheck={false}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-activedescendant={activeOptionId}
                    aria-describedby={describedBy}
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 font-chakra text-base text-white transition placeholder:text-zinc-400 focus-visible:border-[#B7FB5B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B] sm:text-sm"
                />

                {showList && (
                    <ul
                        id={listId}
                        role="listbox"
                        aria-label="Saran coin Bitunix"
                        className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 bg-[#0b0c10] p-1 shadow-2xl"
                    >
                        {suggestions.map((pair, index) => {
                            const isActive = index === activeIndex;

                            return (
                                <li
                                    key={pair.symbol}
                                    id={`${listId}-${index}`}
                                    role="option"
                                    aria-selected={isActive}
                                    // mousedown, bukan click: supaya input belum sempat blur dan menutup daftar.
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        selectPair(pair);
                                    }}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition ${isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}
                                >
                                    <CoinMonogram base={pair.base} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-chakra text-sm font-bold text-white">{pair.base}</span>
                                        <span className="block truncate font-chakra text-[11px] text-zinc-400">{pair.symbol}</span>
                                    </span>
                                    <span className="min-w-28 shrink-0 whitespace-nowrap text-right font-chakra sm:min-w-32">
                                        <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                                            Live Price
                                        </span>
                                        <span className={`mt-0.5 block text-xs font-bold ${livePrices.prices[pair.symbol] ? "text-white" : "text-zinc-400"}`}>
                                            {livePrices.prices[pair.symbol]
                                                ? formatDecimalPrice(livePrices.prices[pair.symbol], { precision: pair.quotePrecision })
                                                : livePrices.status === "loading"
                                                    ? "Memuat harga..."
                                                    : "Harga tidak tersedia"}
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                        <li aria-hidden="true" className="px-3 pb-1 pt-2 font-chakra text-[10px] text-zinc-400">
                            {pairs.length} pair USDT · Bitunix Futures
                        </li>
                    </ul>
                )}

                {showNoMatch && (
                    <p id={noMatchId} className="mt-2 font-chakra text-xs text-yellow-300">
                        Tidak ada coin &ldquo;{query}&rdquo; di Bitunix. Periksa ejaannya.
                    </p>
                )}
                {pairsStatus === "error" && (
                    <p id={pairsErrorId} className="mt-2 font-chakra text-xs text-zinc-400">
                        Daftar coin Bitunix tidak termuat. Symbol tetap bisa diketik manual.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:flex md:pt-7">
                {/* Tombol tetap aktif sampai request jalan; input kosong
                    divalidasi saat submit, bukan dengan mematikan tombol. */}
                <button
                    type="submit"
                    disabled={isSearching}
                    aria-busy={isSearching}
                    className="h-12 rounded-xl bg-[#B7FB5B] px-5 text-sm font-black text-black transition hover:bg-[#a8ec4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B] active:scale-95 disabled:cursor-wait disabled:opacity-70"
                >
                    <span className="flex items-center justify-center gap-2">
                        {isSearching && (
                            <span className="h-4 w-4 rounded-full border-2 border-current/25 border-t-current motion-safe:animate-spin" aria-hidden="true" />
                        )}
                        Analyze
                    </span>
                </button>
                {hasSearch && (
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="grid h-12 place-items-center rounded-xl border border-zinc-800 bg-black px-5 text-sm font-bold text-zinc-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]"
                    >
                        Clear
                    </button>
                )}
            </div>
        </form>
    );
}
