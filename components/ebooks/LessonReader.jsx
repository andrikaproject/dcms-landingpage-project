"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown, CaretLeft, CaretRight, CheckCircle } from "@phosphor-icons/react";
import { useAuth } from "@/components/auth/AuthProvider";
import ChapterList, { lessonHref } from "./ChapterList";
import { ReaderBreadcrumb } from "./EbookDetail";
import LessonRenderer from "./LessonRenderer";
import ProgressSummary from "./ProgressSummary";
import { completeLesson, fetchReaderEbook, fetchReaderLesson, recordLessonOpen, refreshReaderMedia } from "@/lib/ebooks/api";
import { catalogKey, detailKey, readerCache } from "@/lib/ebooks/reader-cache";
import { describeEbookError } from "@/lib/ebooks/payload";
import { adjacentLessons, identityOf, initialReaderState, markLessonCompleted, readerReducer } from "@/lib/ebooks/reader-state";
import { formatUserTime } from "@/lib/signals/format";
import { isAbortError } from "@/lib/signals/request";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]";

const COMPLETION_LABELS = {
    idle: "Tandai Selesai",
    saving: "Menyimpan…",
    error: "Coba lagi",
    saved: "Selesai",
};

function CompletionPanel({ state, onComplete, next, slug }) {
    const saved = state.completion === "saved";
    const saving = state.completion === "saving";

    return (
        <section aria-labelledby="completion-heading" className="mt-12 rounded-2xl border border-white/10 bg-[#15171b] p-4 sm:p-5">
            <h2 id="completion-heading" className="sr-only">Status subbab</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                    {saved ? (
                        <p className="text-zinc-300">
                            {state.completedAt ? `Kamu menandai subbab ini selesai ${formatUserTime(state.completedAt)}.` : "Subbab ini sudah kamu tandai selesai."}
                        </p>
                    ) : (
                        <p className="text-zinc-300">Sudah selesai membaca? Tandai supaya progresmu tersimpan.</p>
                    )}
                    {state.completion === "error" && (
                        <p role="alert" className="mt-1 text-red-200">Status selesai belum tersimpan. {state.completionError}</p>
                    )}
                </div>
                {/* aria-disabled menjaga fokus keyboard tetap di tombol selama request berjalan. */}
                <button
                    type="button"
                    onClick={saved || saving ? undefined : onComplete}
                    aria-disabled={saved || saving}
                    aria-busy={saving}
                    className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition ${FOCUS_RING} ${saved
                        ? "cursor-default border border-[#B7FB5B]/40 bg-[#B7FB5B]/10 text-[#d5fca0]"
                        : saving
                            ? "cursor-wait bg-[#B7FB5B]/60 text-[#111315]"
                            : "bg-[#B7FB5B] text-[#111315] hover:bg-[#a8ec4c]"}`}
                >
                    {saved && <CheckCircle size={18} weight="fill" aria-hidden />}
                    {COMPLETION_LABELS[state.completion]}
                </button>
            </div>
            <p role="status" aria-live="polite" className="sr-only">
                {saving ? "Menyimpan status selesai." : saved ? "Subbab tersimpan sebagai selesai." : ""}
            </p>
            {saved && next && (
                <Link href={lessonHref(slug, next.id)} className={`mt-4 inline-flex min-h-11 max-w-full items-center gap-2 text-sm font-semibold text-white underline decoration-[#B7FB5B] decoration-2 underline-offset-4 ${FOCUS_RING}`}>
                    <span className="truncate">Lanjut: {next.title}</span>
                    <CaretRight size={16} aria-hidden />
                </Link>
            )}
        </section>
    );
}

function LessonPager({ slug, previous, next }) {
    if (!previous && !next) return null;
    const card = `flex min-h-11 min-w-0 flex-col gap-0.5 rounded-xl border border-white/10 px-4 py-3 transition hover:border-white/30 hover:bg-white/[0.03] ${FOCUS_RING}`;
    return (
        <nav aria-label="Subbab sebelum dan sesudah" className="mt-6 grid gap-3 sm:grid-cols-2">
            {previous ? (
                <Link href={lessonHref(slug, previous.id)} className={card}>
                    <span className="flex items-center gap-1 text-xs text-zinc-400"><CaretLeft size={14} aria-hidden />Sebelumnya</span>
                    <span className="truncate text-sm font-semibold text-white">{previous.title}</span>
                </Link>
            ) : <span className="hidden sm:block" />}
            {next && (
                <Link href={lessonHref(slug, next.id)} className={`${card} sm:items-end sm:text-right`}>
                    <span className="flex items-center gap-1 text-xs text-zinc-400">Berikutnya<CaretRight size={14} aria-hidden /></span>
                    <span className="max-w-full truncate text-sm font-semibold text-white">{next.title}</span>
                </Link>
            )}
        </nav>
    );
}

function LessonSkeleton() {
    return (
        <div role="status" aria-label="Memuat materi" className="space-y-3">
            {["w-full", "w-11/12", "w-4/5", "w-full", "w-2/3"].map((width, index) => (
                <div key={index} className={`h-4 animate-pulse rounded bg-white/[0.06] ${width}`} />
            ))}
        </div>
    );
}

export default function LessonReader({ slug, lessonId }) {
    const { user } = useAuth();
    const identity = identityOf(user);
    const [ebook, setEbook] = useState(() => readerCache.get(detailKey(slug), identity) ?? null);
    const [state, dispatch] = useReducer(readerReducer, lessonId, initialReaderState);
    const [loadKey, setLoadKey] = useState(0);
    const openedRef = useRef(new Set());
    const completingRef = useRef(false);
    const refresh = useCallback((assetId) => refreshReaderMedia(slug, assetId), [slug]);

    // Struktur ebook untuk navigasi. Kegagalan di sini tidak menghalangi pembacaan materi.
    useEffect(() => {
        const controller = new AbortController();
        fetchReaderEbook(slug, { signal: controller.signal })
            .then(setEbook)
            .catch(() => {});
        return () => controller.abort();
    }, [slug, identity]);

    useEffect(() => {
        if (ebook) readerCache.set(detailKey(slug), identity, ebook);
    }, [ebook, identity, slug]);

    useEffect(() => {
        const controller = new AbortController();
        fetchReaderLesson(slug, lessonId, { signal: controller.signal })
            .then((data) => dispatch({ type: "loaded", lessonId, data }))
            .catch((error) => {
                if (isAbortError(error, controller.signal)) return;
                dispatch({ type: "loadFailed", lessonId, message: describeEbookError(error, "Materi gagal dimuat.") });
            });
        return () => controller.abort();
    }, [slug, lessonId, loadKey]);

    // Pembukaan dicatat setelah isi tampil dan tab sedang aktif. GET materi sendiri
    // tidak menulis progres, sehingga prefetch dan pratinjau admin tidak terhitung.
    useEffect(() => {
        if (state.load !== "ready") return undefined;
        const id = state.lessonId;
        if (openedRef.current.has(id)) return undefined;

        function send() {
            openedRef.current.add(id);
            recordLessonOpen(slug, id)
                .then(() => readerCache.delete(catalogKey()))
                .catch(() => {
                    // Aktivitas buka bersifat pelengkap; completion tetap bisa dicatat tanpa baris open.
                });
        }

        if (document.visibilityState === "visible") {
            send();
            return undefined;
        }
        function onVisible() {
            if (document.visibilityState !== "visible") return;
            document.removeEventListener("visibilitychange", onVisible);
            send();
        }
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [slug, state.load, state.lessonId]);

    async function complete() {
        if (completingRef.current || state.load !== "ready" || state.completion === "saved") return;
        completingRef.current = true;
        const id = state.lessonId;
        dispatch({ type: "completeStart", lessonId: id });
        try {
            const result = await completeLesson(slug, id);
            dispatch({ type: "completeSucceeded", lessonId: id, completedAt: result.completedAt, progress: result.progress });
            setEbook((current) => markLessonCompleted(current, id, result));
            readerCache.delete(catalogKey());
        } catch (error) {
            dispatch({ type: "completeFailed", lessonId: id, message: describeEbookError(error, "Coba beberapa saat lagi.") });
        } finally {
            completingRef.current = false;
        }
    }

    const { current, previous, next, position, total } = adjacentLessons(ebook?.chapters ?? [], lessonId);
    const lesson = state.data?.lesson;
    const chapterTitle = current?.chapterTitle || ebook?.chapters.find((chapter) => chapter.id === lesson?.chapterId)?.title;
    const title = lesson?.title || current?.title || "";
    const progress = state.progress ?? ebook?.progress ?? null;

    const navigation = ebook && ebook.chapters.length > 0 && (
        <ChapterList slug={slug} chapters={ebook.chapters} currentLessonId={lessonId} compact />
    );

    return (
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <ReaderBreadcrumb slug={slug} ebookTitle={ebook?.title} current />

            <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
                <aside aria-label="Daftar isi ebook" className="hidden lg:block">
                    <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain pb-6 pr-1">
                        <p className="mb-2 px-2 font-nebulica text-sm font-bold text-white">Daftar isi</p>
                        <ProgressSummary progress={progress} compact className="mb-5 px-2" />
                        {navigation || <p className="px-2 text-sm text-zinc-400">Daftar isi belum tersedia.</p>}
                    </div>
                </aside>

                <div className="min-w-0">
                    {navigation && (
                        <details className="group mb-6 rounded-xl border border-white/10 bg-[#15171b] lg:hidden">
                            <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}>
                                <span className="min-w-0">
                                    Daftar isi
                                    {position && <span className="ml-2 font-normal text-zinc-400">Subbab {position} dari {total}</span>}
                                </span>
                                <CaretDown size={16} className="shrink-0 transition group-open:rotate-180" aria-hidden />
                            </summary>
                            <div className="border-t border-white/10 px-2 pb-3 pt-3">
                                <ProgressSummary progress={progress} compact className="mb-4 px-2" />
                                {navigation}
                            </div>
                        </details>
                    )}

                    <article aria-labelledby="lesson-title">
                        {chapterTitle && <p className="mb-2 break-words text-sm font-semibold text-zinc-400">{chapterTitle}</p>}
                        <h1 id="lesson-title" className="mb-8 break-words font-nebulica text-[clamp(1.6rem,1.2rem+1.8vw,2.5rem)] font-bold leading-tight text-white">
                            {title || (state.load === "error" ? "Materi tidak dapat dimuat" : "Memuat materi…")}
                        </h1>

                        {state.load === "loading" && <LessonSkeleton />}

                        {state.load === "error" && (
                            <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
                                <p>{state.loadError}</p>
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <button type="button" onClick={() => { dispatch({ type: "retryLoad", lessonId }); setLoadKey((key) => key + 1); }} className={`min-h-11 rounded-lg border border-red-300/40 px-4 font-semibold ${FOCUS_RING}`}>Coba lagi</button>
                                    <Link href={`/dashboard/ebook/${encodeURIComponent(slug)}`} className={`inline-flex min-h-11 items-center px-2 font-semibold underline underline-offset-4 ${FOCUS_RING}`}>Kembali ke daftar isi</Link>
                                </div>
                            </div>
                        )}

                        {state.load === "ready" && (
                            <>
                                <div className="max-w-[68ch]">
                                    <LessonRenderer document={lesson.content} schemaVersion={lesson.schemaVersion} media={state.data.media} refreshMedia={refresh} />
                                </div>
                                <div className="max-w-[68ch]">
                                    <CompletionPanel state={state} onComplete={complete} next={next} slug={slug} />
                                </div>
                            </>
                        )}

                        <div className="max-w-[68ch]">
                            <LessonPager slug={slug} previous={previous} next={next} />
                        </div>
                    </article>
                </div>
            </div>
        </div>
    );
}
