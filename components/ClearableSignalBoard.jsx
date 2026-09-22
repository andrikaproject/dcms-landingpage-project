"use client";

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

export default function ClearableSignalBoard({ updatedAt, signalCount, onClear, controls, children }) {
    return (
        <section aria-labelledby="signal-board-heading">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 id="signal-board-heading" className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">Signal Board</h2>
                <div className="h-px min-w-[min(8rem,100%)] flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                <p className="text-xs text-zinc-400">Updated {updatedAt}</p>
                {signalCount > 0 && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="flex min-h-11 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 font-chakra text-xs font-bold text-red-300 transition hover:bg-red-500/15 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 active:scale-95"
                    >
                        <ClearIcon />
                        Clear all signals
                    </button>
                )}
            </div>

            {controls}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
                {children}
            </div>
        </section>
    );
}
