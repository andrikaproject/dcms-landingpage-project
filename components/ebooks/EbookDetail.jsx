"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import ChapterList, { lessonHref } from "./ChapterList";
import EbookCover from "./EbookCover";
import ProgressSummary from "./ProgressSummary";
import { fetchReaderEbook, refreshReaderMedia } from "@/lib/ebooks/api";
import { detailKey, readerCache } from "@/lib/ebooks/reader-cache";
import { describeEbookError } from "@/lib/ebooks/payload";
import { identityOf, resumeTarget } from "@/lib/ebooks/reader-state";
import { isAbortError } from "@/lib/signals/request";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]";

export function ReaderBreadcrumb({ slug, ebookTitle, current }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-5 text-sm">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-400">
                <li><Link href="/dashboard/ebook" className={`inline-flex min-h-11 items-center hover:text-white ${FOCUS_RING}`}>Ebook DCMS</Link></li>
                {current ? (
                    <>
                        <li aria-hidden>/</li>
                        <li className="min-w-0 max-w-full">
                            <Link href={`/dashboard/ebook/${encodeURIComponent(slug)}`} className={`inline-flex min-h-11 max-w-full items-center hover:text-white ${FOCUS_RING}`}>
                                <span className="truncate">{ebookTitle || "Ebook"}</span>
                            </Link>
                        </li>
                    </>
                ) : (
                    <>
                        <li aria-hidden>/</li>
                        <li className="min-w-0 max-w-full truncate text-zinc-300" aria-current="page">{ebookTitle || "Ebook"}</li>
                    </>
                )}
            </ol>
        </nav>
    );
}

function DetailSkeleton() {
    return (
        <div role="status" aria-label="Memuat ebook" className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-white/[0.06]" />
            <div className="space-y-4 self-end">
                <div className="h-9 w-2/3 animate-pulse rounded bg-white/[0.08]" />
                <div className="h-4 w-full animate-pulse rounded bg-white/[0.05]" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.05]" />
            </div>
        </div>
    );
}

export default function EbookDetail({ slug }) {
    const { user } = useAuth();
    const identity = identityOf(user);
    const [ebook, setEbook] = useState(() => readerCache.get(detailKey(slug), identity) ?? null);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const refresh = useCallback((assetId) => refreshReaderMedia(slug, assetId), [slug]);

    useEffect(() => {
        const controller = new AbortController();
        fetchReaderEbook(slug, { signal: controller.signal })
            .then((loaded) => {
                setEbook(loaded);
                setError(null);
            })
            .catch((loadError) => {
                if (isAbortError(loadError, controller.signal)) return;
                setError({ message: describeEbookError(loadError, "Ebook gagal dimuat."), notFound: Number(loadError?.status) === 404 });
            });
        return () => controller.abort();
    }, [slug, identity, reloadKey]);

    useEffect(() => {
        if (ebook) readerCache.set(detailKey(slug), identity, ebook);
    }, [ebook, identity, slug]);

    if (error?.notFound) {
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <ReaderBreadcrumb slug={slug} ebookTitle="Tidak ditemukan" />
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
                    <h1 className="font-nebulica text-2xl font-bold text-white">Ebook tidak ditemukan</h1>
                    <p className="mt-2 text-zinc-300">Ebook ini tidak ada atau belum diterbitkan.</p>
                    <Link href="/dashboard/ebook" className={`mt-5 inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:border-white/40 ${FOCUS_RING}`}>Kembali ke katalog</Link>
                </div>
            </div>
        );
    }

    const target = ebook ? resumeTarget(ebook) : null;

    return (
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <ReaderBreadcrumb slug={slug} ebookTitle={ebook?.title} />

            {error && (
                <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    <span>{ebook ? `Data terbaru gagal dimuat. ${error.message}` : error.message}</span>
                    <button type="button" onClick={() => { setError(null); setReloadKey((key) => key + 1); }} className={`min-h-11 font-semibold underline underline-offset-4 ${FOCUS_RING}`}>Coba lagi</button>
                </div>
            )}

            {!ebook && !error && <DetailSkeleton />}

            {ebook && (
                <>
                    <header className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-end lg:gap-10">
                        <EbookCover cover={ebook.cover} refresh={refresh} title={ebook.title} loading="eager" className="rounded-2xl" />
                        <div className="min-w-0">
                            <h1 className="break-words font-nebulica text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] font-bold leading-tight text-white">{ebook.title}</h1>
                            {ebook.description && <p className="mt-3 max-w-[65ch] whitespace-pre-line break-words text-base leading-7 text-zinc-300">{ebook.description}</p>}
                            <ProgressSummary progress={ebook.progress} className="mt-5 max-w-md" />
                            {target && (
                                <Link
                                    href={lessonHref(slug, target.lesson.id)}
                                    className={`mt-5 inline-flex min-h-11 max-w-full flex-col items-start justify-center rounded-lg bg-[#B7FB5B] px-5 py-2 text-[#111315] transition hover:bg-[#a8ec4c] ${FOCUS_RING}`}
                                >
                                    <span className="text-sm font-bold">{target.label}</span>
                                    <span className="max-w-full truncate text-xs font-semibold opacity-80">{target.lesson.title}</span>
                                </Link>
                            )}
                        </div>
                    </header>

                    <section aria-labelledby="ebook-contents" className="mt-10 max-w-3xl">
                        <h2 id="ebook-contents" className="mb-4 font-nebulica text-xl font-bold text-white">Daftar isi</h2>
                        {ebook.chapters.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-zinc-300">Belum ada materi terbit di ebook ini.</p>
                        ) : (
                            <ChapterList slug={slug} chapters={ebook.chapters} />
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
