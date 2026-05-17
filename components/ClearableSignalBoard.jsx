"use client";

import { useState } from "react";

function ClearIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="m19 6-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
        </svg>
    );
}

export default function ClearableSignalBoard({ updatedAt, signalCount, children }) {
    const [isCleared, setIsCleared] = useState(false);

    return (
        <section>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Signal Board</p>
                <div className="h-px min-w-[min(8rem,100%)] flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                <p className="text-xs text-zinc-600">Updated {updatedAt}</p>
                {signalCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsCleared((current) => !current)}
                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 font-chakra text-xs font-bold transition active:scale-95 ${isCleared
                            ? "border-[#B7FB5B]/30 bg-[#B7FB5B]/10 text-[#B7FB5B] hover:bg-[#B7FB5B]/15"
                            : "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15 hover:text-red-200"
                            }`}
                        aria-pressed={isCleared}
                    >
                        <ClearIcon />
                        {isCleared ? "Show Signals" : "Clear All Signal"}
                    </button>
                )}
            </div>

            {isCleared ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 p-4 font-chakra text-sm text-zinc-500 sm:p-6">
                    Signal board sudah dikosongkan untuk sesi ini. Klik Show Signals kalau mau menampilkan ulang.
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
                    {children}
                </div>
            )}
        </section>
    );
}
