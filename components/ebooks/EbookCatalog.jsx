"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import EbookCover from "./EbookCover";
import ProgressSummary from "./ProgressSummary";
import { fetchCatalog, refreshReaderMedia } from "@/lib/ebooks/api";
import { catalogKey, readerCache } from "@/lib/ebooks/reader-cache";
import { describeEbookError } from "@/lib/ebooks/payload";
import { identityOf } from "@/lib/ebooks/reader-state";
import { isAbortError } from "@/lib/signals/request";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]";

const ACTION_LABELS = {
    NOT_STARTED: "Mulai membaca",
    IN_PROGRESS: "Lanjutkan membaca",
    COMPLETED: "Baca lagi",
};

// Setiap kartu mewakili item sejenis (satu ebook), jadi ukuran dan susunannya
// sengaja seragam agar mudah dipindai.
function EbookCard({ ebook }) {
    const refresh = useCallback((assetId) => refreshReaderMedia(ebook.slug, assetId), [ebook.slug]);
    const href = `/dashboard/ebook/${encodeURIComponent(ebook.slug)}`;
    const action = ACTION_LABELS[ebook.progress?.status] || "Lihat isi ebook";

    return (
        <li data-press="card" className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#15171b] focus-within:border-white/30 hover:border-white/25">
            <EbookCover cover={ebook.cover} refresh={refresh} title={ebook.title} className="rounded-t-2xl border-0" />
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                <h2 className="break-words font-nebulica text-lg font-bold leading-snug text-white">
                    {/* Tautan judul menutupi seluruh kartu; hanya satu tab stop per ebook. */}
                    <Link href={href} data-press="overlay" className={`after:absolute after:inset-0 after:rounded-2xl after:content-[''] ${FOCUS_RING}`}>
                        {ebook.title}
                    </Link>
                </h2>
                {ebook.description && <p className="line-clamp-3 break-words text-sm leading-6 text-zinc-300">{ebook.description}</p>}
                <div className="mt-auto space-y-3 pt-1">
                    <ProgressSummary progress={ebook.progress} compact />
                    <p className="text-sm font-bold text-[#B7FB5B]" aria-hidden>{action}</p>
                </div>
            </div>
        </li>
    );
}

function CatalogSkeleton() {
    return (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((item) => (
                <li key={item} className="overflow-hidden rounded-2xl border border-white/10 bg-[#15171b]">
                    <div className="aspect-[4/3] animate-pulse bg-white/[0.06]" />
                    <div className="space-y-3 p-5">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.08]" />
                        <div className="h-4 w-full animate-pulse rounded bg-white/[0.05]" />
                        <div className="h-1.5 w-full rounded bg-white/[0.05]" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function EbookCatalog() {
    const { user } = useAuth();
    const identity = identityOf(user);
    const [cached] = useState(() => readerCache.get(catalogKey(), identity));
    const [ebooks, setEbooks] = useState(cached ?? null);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        fetchCatalog({ signal: controller.signal })
            .then((items) => {
                readerCache.set(catalogKey(), identity, items);
                setEbooks(items);
                setError("");
            })
            .catch((loadError) => {
                if (isAbortError(loadError, controller.signal)) return;
                setError(describeEbookError(loadError, "Katalog ebook gagal dimuat."));
            });
        return () => controller.abort();
    }, [identity, reloadKey]);

    return (
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <header className="mb-6 max-w-2xl sm:mb-8">
                <h1 className="font-nebulica text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] font-bold leading-tight text-white">Ebook DCMS</h1>
                <p className="mt-2 text-base leading-7 text-zinc-300">
                    Materi belajar dari tim DCMS. Tandai subbab yang sudah kamu baca; progresnya tersimpan di akunmu dan ikut terbawa ke perangkat lain.
                </p>
            </header>

            {error && (
                <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    <span>{ebooks ? `Data terbaru gagal dimuat. ${error}` : error}</span>
                    <button type="button" onClick={() => { setError(""); setReloadKey((key) => key + 1); }} className={`min-h-11 font-semibold underline underline-offset-4 ${FOCUS_RING}`}>Coba lagi</button>
                </div>
            )}

            {!ebooks && !error && (
                <div role="status" aria-label="Memuat katalog ebook">
                    <CatalogSkeleton />
                </div>
            )}

            {ebooks && ebooks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
                    <p className="text-zinc-200">Belum ada ebook yang diterbitkan.</p>
                    <p className="mt-1 text-sm text-zinc-400">Ebook baru akan muncul di sini setelah diterbitkan admin.</p>
                </div>
            )}

            {ebooks && ebooks.length > 0 && (
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {ebooks.map((ebook) => <EbookCard key={ebook.id} ebook={ebook} />)}
                </ul>
            )}
        </div>
    );
}
