"use client";

import { useState } from "react";
import { ArrowClockwise, MagnifyingGlass } from "@phosphor-icons/react";

const SESSIONS = [
    { value: "asia", label: "Asia" },
    { value: "london", label: "London" },
    { value: "new-york", label: "New York" },
];

export default function MarketAnalysisControls({
    basis,
    session,
    onBasisChange,
    onSessionChange,
    onAnalyze,
    activeBasisLabel,
    onRefresh,
    refreshing,
    updatedAt,
    interval,
}) {
    const [input, setInput] = useState("");
    const sessionActive = basis === "session";

    function submit(event) {
        event.preventDefault();
        const value = input.trim();
        if (value) onAnalyze(value);
    }

    return (
        <header className="market-analysis-header space-y-6">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B7FB5B]">
                        <span className="market-live-dot" aria-hidden="true" />
                        Live market context
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Market Analysis</h1>
                        <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-gray-300">
                        {activeBasisLabel}
                        </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                        Baca posisi harga terhadap level harian dan mingguan Bitunix futures. Konteks dulu,
                        keputusan tetap di tangan Anda.
                    </p>
                </div>
                <div className="text-left xl:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Selected feed</p>
                    <p className="mt-1 font-mono text-xs text-gray-300">
                        {interval.toUpperCase()} candles · {activeBasisLabel}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2">
                    <label htmlFor="symbol-search" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Add instrument
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full">
                            <MagnifyingGlass size={17} weight="regular" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                            <input
                                id="symbol-search"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder="BTCUSDT"
                                autoComplete="off"
                                spellCheck={false}
                                className="w-full rounded-lg border border-white/10 bg-[#111827] py-2.5 pl-9 pr-3 text-sm uppercase text-white outline-none transition duration-300 placeholder:text-gray-600 focus:border-[#B7FB5B]/70 focus:bg-[#151d2b] focus:ring-2 focus:ring-[#B7FB5B]/10"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#B7FB5B] px-3.5 py-2.5 text-sm font-semibold text-[#0b0f17] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c4ff78] active:translate-y-0 active:scale-[0.98]"
                        >
                            Analyze
                        </button>
                    </div>
                </form>

                <div className="flex flex-wrap items-end gap-4">
                    <div
                        role="group"
                        aria-label="Level basis"
                        className="inline-flex rounded-lg border border-white/10 bg-[#111827] p-1"
                    >
                        {[
                            { value: "utc", label: "UTC Exchange" },
                            { value: "session", label: "Session" },
                        ].map((option) => {
                            const active = basis === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onBasisChange(option.value)}
                                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition duration-300 active:scale-[0.98] ${
                                        active
                                            ? "bg-[#B7FB5B] text-[#0b0f17]"
                                            : "text-gray-400 hover:text-gray-200"
                                    }`}
                                >
                                    {active ? "✓ " : ""}
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        role="group"
                        aria-label="Trading session"
                        className={`flex flex-wrap items-center gap-2 transition duration-300 ${
                            sessionActive ? "opacity-100" : "opacity-40"
                        }`}
                    >
                        {SESSIONS.map((item) => {
                            const active = sessionActive && session === item.value;
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    aria-pressed={active}
                                    disabled={!sessionActive}
                                    onClick={() => onSessionChange(item.value)}
                                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition duration-300 active:scale-[0.98] disabled:cursor-not-allowed ${
                                        active
                                            ? "border-[#B7FB5B] bg-[#B7FB5B]/10 text-[#B7FB5B] underline underline-offset-4"
                                            : "border-white/10 text-gray-400 hover:text-gray-200"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={refreshing}
                        aria-label="Refresh harga market"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-gray-300 transition duration-300 hover:-translate-y-0.5 hover:border-[#B7FB5B]/70 hover:text-[#B7FB5B] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                    >
                        <ArrowClockwise size={16} weight="regular" className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
                        {refreshing ? "Updating" : "Refresh"}
                    </button>
                </div>
            </div>

            <p className="text-xs text-gray-500">
                {updatedAt ? `Diperbarui ${new Date(updatedAt).toLocaleTimeString("id-ID")}` : "Menunggu data market..."}
                {" · Auto-refresh 30 detik"}
            </p>
        </header>
    );
}
