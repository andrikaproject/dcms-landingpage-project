"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Circle, X } from "@phosphor-icons/react";
import ProgressSummary from "@/components/ebooks/ProgressSummary";
import { FOCUS_RING, InlineError } from "./AdminEbookFrame";
import { fetchUserProgress } from "@/lib/ebooks/api";
import { describeEbookError } from "@/lib/ebooks/payload";
import { formatUserTime } from "@/lib/signals/format";
import { isAbortError } from "@/lib/signals/request";

export const ACCOUNT_TYPE_LABELS = { USER: "Akun DCMS", BITUNIX: "Akun Bitunix" };

// Waktu dari BE berupa ISO UTC dan hanya diformat ke zona waktu browser saat tampil.
function lessonStatus(lesson) {
    if (lesson.completedAt) return `Selesai ${formatUserTime(lesson.completedAt)}`;
    if (lesson.completed) return "Selesai";
    if (lesson.lastOpenedAt) return `Dibuka ${formatUserTime(lesson.lastOpenedAt)}, belum ditandai selesai`;
    return "Belum dibuka";
}

export default function UserProgressDetail({ ebookId, row, onClose }) {
    const dialogRef = useRef(null);
    const [detail, setDetail] = useState(null);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    // Tidak menutup dialog di cleanup: event close akan memanggil onClose dan membuang
    // dialog pada remount StrictMode. Elemen yang dilepas dari DOM keluar dari mode modal.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchUserProgress(ebookId, row.accountType, row.userId, { signal: controller.signal })
            .then((loaded) => {
                setDetail(loaded);
                setError("");
            })
            .catch((loadError) => {
                if (isAbortError(loadError, controller.signal)) return;
                setError(describeEbookError(loadError, "Detail progres gagal dimuat."));
            });
        return () => controller.abort();
    }, [ebookId, row.accountType, row.userId, reloadKey]);

    const user = detail?.user ?? row;
    const progress = detail?.progress ?? row.progress;

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}
            aria-labelledby="user-progress-title"
            className="m-auto max-h-[88dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 p-0 font-chakra text-white backdrop:bg-black/75"
        >
            <div className="flex max-h-[88dvh] flex-col">
                <header className="flex items-start gap-3 border-b border-white/10 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                        <h2 id="user-progress-title" className="break-words font-nebulica text-lg font-bold">{user.name || "Tanpa nama"}</h2>
                        <p className="break-all text-sm text-zinc-400">{user.email || "Email tidak tersedia"}</p>
                        <p className="mt-1 text-xs text-zinc-400">{ACCOUNT_TYPE_LABELS[user.accountType] || user.accountType} · ID {user.userId}</p>
                    </div>
                    <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup detail progres" className={`grid size-11 shrink-0 place-items-center rounded-lg text-zinc-300 hover:bg-white/[0.06] hover:text-white ${FOCUS_RING}`}>
                        <X size={18} aria-hidden />
                    </button>
                </header>

                <div className="overflow-y-auto overscroll-contain p-4 sm:p-5">
                    <ProgressSummary progress={progress} label="Progres pengguna" />
                    <p className="mt-2 text-xs text-zinc-400">Dihitung dari subbab terbit yang ditandai selesai oleh pengguna. Angka ini tidak mengukur lama membaca atau pemahaman.</p>

                    <div className="mt-5">
                        {!detail && !error && <p role="status" className="py-8 text-center text-sm text-zinc-400">Memuat rincian subbab…</p>}
                        {error && <InlineError message={error} onRetry={() => { setError(""); setReloadKey((key) => key + 1); }} />}
                        {detail && detail.chapters.length === 0 && <p className="text-sm text-zinc-400">Belum ada subbab terbit di ebook ini.</p>}
                        {detail && detail.chapters.length > 0 && (
                            <ol className="space-y-5">
                                {detail.chapters.map((chapter, index) => (
                                    <li key={chapter.id}>
                                        <h3 className="text-sm font-bold text-zinc-200">Bab {index + 1}: <span className="break-words">{chapter.title}</span></h3>
                                        {chapter.lessons.length === 0 ? (
                                            <p className="mt-1 text-sm text-zinc-400">Tidak ada subbab terbit.</p>
                                        ) : (
                                            <ul className="mt-2 divide-y divide-white/[0.06] rounded-xl border border-white/10">
                                                {chapter.lessons.map((lesson) => (
                                                    <li key={lesson.id} className="flex items-start gap-3 px-3 py-2.5">
                                                        {lesson.completed
                                                            ? <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[#B7FB5B]" aria-hidden />
                                                            : <Circle size={18} className="mt-0.5 shrink-0 text-zinc-400" aria-hidden />}
                                                        <div className="min-w-0">
                                                            <p className="break-words text-sm font-semibold text-white">{lesson.title}</p>
                                                            <p className="text-xs text-zinc-400">{lessonStatus(lesson)}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </div>
            </div>
        </dialog>
    );
}
