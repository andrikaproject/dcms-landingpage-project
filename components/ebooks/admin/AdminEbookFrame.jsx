"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { CONTENT_STATUS_LABELS } from "@/lib/ebooks/payload";

export const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]";
export const PRIMARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#B7FB5B] px-4 text-sm font-bold text-[#111315] transition hover:bg-[#a8ec4c] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
export const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
export const QUIET_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`;
export const TEXT_INPUT = `block min-h-11 w-full rounded-lg border bg-black/40 px-3 text-sm text-white placeholder:text-zinc-400 ${FOCUS_RING}`;

const STATUS_STYLES = {
    DRAFT: "border-zinc-600 text-zinc-300",
    PUBLISHED: "border-[#B7FB5B]/40 bg-[#B7FB5B]/10 text-[#d5fca0]",
    ARCHIVED: "border-amber-400/30 bg-amber-400/10 text-amber-200",
};

export function StatusBadge({ status }) {
    return (
        <span className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[status] || STATUS_STYLES.DRAFT}`}>
            {CONTENT_STATUS_LABELS[status] || status}
        </span>
    );
}

export function InlineError({ message, onRetry, retryLabel = "Coba lagi", id }) {
    if (!message) return null;
    return (
        <div id={id} role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            <span className="min-w-0 break-words">{message}</span>
            {onRetry && <button type="button" onClick={onRetry} className={`min-h-11 font-semibold underline underline-offset-4 ${FOCUS_RING}`}>{retryLabel}</button>}
        </div>
    );
}

// beforeunload menahan reload/tutup tab; confirmLeave dipasang pada tautan internal
// karena App Router tidak menyediakan pemblokir navigasi.
export function useUnsavedChangesWarning(dirty) {
    useEffect(() => {
        if (!dirty) return undefined;
        const handler = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    return useCallback((event) => {
        if (dirty && !window.confirm("Perubahan belum disimpan. Tinggalkan halaman ini?")) event.preventDefault();
    }, [dirty]);
}

export default function AdminEbookFrame({ title, description, backHref = "/dashboard/admin/ebooks", backLabel = "Kembali ke daftar ebook", onNavigate, actions, children, width = "max-w-5xl" }) {
    return (
        <main className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
            <div className={`mx-auto ${width}`}>
                <header className="mb-6 flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <Link href={backHref} onClick={onNavigate} className={`mb-2 inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline ${FOCUS_RING}`}>
                            ← {backLabel}
                        </Link>
                        <h1 className="break-words font-nebulica text-[clamp(1.5rem,1.3rem+1vw,1.875rem)] font-bold leading-tight">{title}</h1>
                        {description && <p className="mt-1 max-w-2xl text-sm text-zinc-400">{description}</p>}
                    </div>
                    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
                </header>
                {children}
            </div>
        </main>
    );
}
