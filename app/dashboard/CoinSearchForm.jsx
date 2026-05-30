"use client";

export default function CoinSearchForm({
    searchValue,
    isSearching = false,
    onSearchChange,
    onSearchSubmit,
    onClearSearch,
}) {
    const hasSearch = Boolean(searchValue);
    const hasValidSearch = Boolean(searchValue.trim());

    return (
        <form className="flex flex-col gap-3 md:flex-row md:items-center" onSubmit={onSearchSubmit}>
            <div className="flex-1">
                <label htmlFor="symbol-search" className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-600">
                    Search Coin
                </label>
                <input
                    id="symbol-search"
                    name="symbol"
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="BTC, ETH, SOL, PEPE..."
                    className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 font-chakra text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#B7FB5B]/50 focus:ring-2 focus:ring-[#B7FB5B]/10"
                />
            </div>
            <div className="grid grid-cols-2 gap-3 md:flex md:pt-7">
                <button
                    type="submit"
                    disabled={isSearching || !hasValidSearch}
                    aria-busy={isSearching}
                    className="h-12 rounded-xl bg-[#B7FB5B] px-5 text-sm font-black text-black transition hover:bg-[#a8ec4c] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSearching ? (
                        <span className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border-2 border-current/25 border-t-current motion-safe:animate-spin" />
                            Loading...
                        </span>
                    ) : "Analyze"}
                </button>
                {hasSearch && (
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="grid h-12 place-items-center rounded-xl border border-zinc-800 bg-black px-5 text-sm font-bold text-zinc-400 transition hover:text-white"
                    >
                        Clear
                    </button>
                )}
            </div>
        </form>
    );
}
