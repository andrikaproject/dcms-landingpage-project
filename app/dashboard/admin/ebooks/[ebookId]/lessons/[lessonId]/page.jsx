"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthProvider";
import LessonRenderer from "@/components/ebooks/LessonRenderer";
import LessonEditor from "@/components/ebooks/admin/LessonEditor";
import AdminEbookFrame, {
    InlineError,
    PRIMARY_BUTTON,
    QUIET_BUTTON,
    SECONDARY_BUTTON,
    StatusBadge,
    TEXT_INPUT,
    useUnsavedChangesWarning,
} from "@/components/ebooks/admin/AdminEbookFrame";
import { fetchAdminEbook, fetchAdminLesson, refreshAdminMedia, updateAdminLesson } from "@/lib/ebooks/api";
import { EbookContentError, MAX_TITLE_LENGTH, documentSizeError, toContractDocument } from "@/lib/ebooks/content";
import { describeEbookError, fieldErrorsFrom } from "@/lib/ebooks/payload";
import { formatUserTime } from "@/lib/signals/format";
import { isAbortError } from "@/lib/signals/request";

const ACTIONS = {
    DRAFT: { status: "PUBLISHED", label: "Terbitkan" },
    PUBLISHED: { status: "ARCHIVED", label: "Arsipkan", confirm: "Subbab akan disembunyikan dari pembaca dan tidak dihitung dalam progres aktif. Catatan progres pembaca tetap tersimpan. Lanjutkan?" },
    ARCHIVED: { status: "PUBLISHED", label: "Terbitkan lagi" },
};

function LessonWorkspace({ ebookId, lessonId }) {
    const titleId = useId();
    const editorLabelId = useId();
    const editorRef = useRef(null);
    const revisionRef = useRef(0);
    const [load, setLoad] = useState({ status: "loading" });
    const [reloadKey, setReloadKey] = useState(0);
    const [lesson, setLesson] = useState(null);
    const [title, setTitle] = useState("");
    const [contentDirty, setContentDirty] = useState(false);
    const [save, setSave] = useState({ status: "idle" });
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            fetchAdminLesson(ebookId, lessonId, { signal: controller.signal }),
            // Konteks ebook hanya untuk judul dan breadcrumb; kegagalannya tidak menghalangi editor.
            fetchAdminEbook(ebookId, { signal: controller.signal }).catch((error) => {
                if (isAbortError(error, controller.signal)) throw error;
                return null;
            }),
        ])
            .then(([result, ebook]) => {
                setLesson(result.lesson);
                setTitle(result.lesson.title);
                setLoad({ status: "ready", media: result.media, ebook });
            })
            .catch((error) => {
                if (isAbortError(error, controller.signal)) return;
                setLoad({ status: "error", message: describeEbookError(error, "Subbab gagal dimuat.") });
            });
        return () => controller.abort();
    }, [ebookId, lessonId, reloadKey]);

    const dirty = Boolean(lesson) && (contentDirty || title !== lesson.title);
    const confirmLeave = useUnsavedChangesWarning(dirty);

    const markDirty = useCallback(() => {
        revisionRef.current += 1;
        setContentDirty(true);
    }, []);

    const persist = useCallback(async (extra = {}) => {
        const editor = editorRef.current;
        if (!editor || !lesson) return;
        if (!title.trim()) {
            setSave({ status: "error", message: "Judul subbab wajib diisi.", field: "title" });
            return;
        }
        let content;
        try {
            content = toContractDocument(editor.getJSON());
        } catch (error) {
            setSave({ status: "error", message: error instanceof EbookContentError ? error.message : "Isi materi tidak valid." });
            return;
        }
        const sizeError = documentSizeError(content);
        if (sizeError) {
            setSave({ status: "error", message: sizeError });
            return;
        }

        const revision = revisionRef.current;
        const savedTitle = title.trim();
        setSave({ status: "saving", action: extra.status || "save" });
        try {
            const { lesson: updated } = await updateAdminLesson(ebookId, lessonId, { title: savedTitle, content, ...extra });
            setLesson((current) => ({ ...current, ...updated }));
            // Ketikan yang masuk selama request tetap dianggap belum tersimpan.
            if (revisionRef.current === revision) setContentDirty(false);
            setTitle((current) => (current.trim() === savedTitle ? updated.title || savedTitle : current));
            setSave({ status: "saved", at: updated.updatedAt || new Date().toISOString(), action: extra.status || "save" });
        } catch (error) {
            const fields = fieldErrorsFrom(error);
            const path = typeof error?.details?.path === "string" ? error.details.path : null;
            setSave({ status: "error", message: describeEbookError(error, "Subbab gagal disimpan."), fields, path });
        }
    }, [ebookId, lessonId, lesson, title]);

    useEffect(() => {
        function onKeyDown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                if (save.status !== "saving") persist();
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [persist, save.status]);

    const refresh = useCallback((assetId) => refreshAdminMedia(assetId), []);

    function togglePreview() {
        if (preview) {
            setPreview(null);
            return;
        }
        try {
            setPreview({ document: toContractDocument(editorRef.current?.getJSON() ?? { type: "doc" }) });
        } catch (error) {
            setSave({ status: "error", message: error instanceof EbookContentError ? error.message : "Pratinjau gagal dibuat." });
        }
    }

    function changeStatus(action) {
        if (action.confirm && !window.confirm(action.confirm)) return;
        persist({ status: action.status });
    }

    if (load.status !== "ready") {
        return (
            <AdminEbookFrame title="Editor subbab" backHref={`/dashboard/admin/ebooks/${encodeURIComponent(ebookId)}`} backLabel="Kembali ke struktur ebook" width="max-w-4xl">
                {load.status === "loading" && <p role="status" className="py-16 text-center text-zinc-400">Memuat subbab…</p>}
                {load.status === "error" && <InlineError message={load.message} onRetry={() => { setLoad({ status: "loading" }); setReloadKey((key) => key + 1); }} />}
            </AdminEbookFrame>
        );
    }

    const chapter = load.ebook?.chapters.find((item) => item.id === lesson.chapterId || item.lessons.some((entry) => entry.id === lesson.id));
    const context = [chapter?.title && `Bab: ${chapter.title}`, load.ebook?.title && `Ebook: ${load.ebook.title}`].filter(Boolean).join(" · ");
    const action = ACTIONS[lesson.status];
    const saving = save.status === "saving";

    let statusText = "";
    if (saving) statusText = save.action === "save" ? "Menyimpan…" : "Menyimpan dan mengubah status…";
    else if (dirty) statusText = "Perubahan belum disimpan.";
    else if (save.status === "saved") statusText = `Tersimpan ${formatUserTime(save.at)}`;
    else if (lesson.updatedAt) statusText = `Terakhir disimpan ${formatUserTime(lesson.updatedAt)}`;

    return (
        <AdminEbookFrame
            title={lesson.title || "Subbab tanpa judul"}
            description={context || undefined}
            backHref={`/dashboard/admin/ebooks/${encodeURIComponent(ebookId)}`}
            backLabel="Kembali ke struktur ebook"
            onNavigate={confirmLeave}
            width="max-w-4xl"
        >
            <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-white/10 bg-black px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border lg:px-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <StatusBadge status={lesson.status} />
                    <p role="status" aria-live="polite" className="min-w-0 flex-1 basis-40 text-sm text-zinc-300">{statusText}</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={togglePreview} aria-pressed={Boolean(preview)} className={QUIET_BUTTON}>
                            {preview ? "Kembali ke editor" : "Pratinjau"}
                        </button>
                        <button type="button" onClick={() => persist()} disabled={saving} className={SECONDARY_BUTTON} title="Simpan (Ctrl+S)">Simpan</button>
                        {action && (
                            <button type="button" onClick={() => changeStatus(action)} disabled={saving} className={action.status === "ARCHIVED" ? SECONDARY_BUTTON : PRIMARY_BUTTON}>
                                {action.label}
                            </button>
                        )}
                    </div>
                </div>
                {save.status === "error" && (
                    <div className="mt-2 space-y-1">
                        <InlineError message={save.message} />
                        {save.fields && Object.keys(save.fields).length > 0 && (
                            <ul className="list-disc pl-5 text-sm text-red-200">
                                {Object.entries(save.fields).map(([field, message]) => <li key={field}>{field === "title" ? "Judul" : field === "content" ? "Isi" : field}: {message}</li>)}
                            </ul>
                        )}
                        {save.path && save.path !== "doc" && <p className="text-xs text-red-200">Lokasi pada dokumen: {save.path}</p>}
                    </div>
                )}
            </div>

            {lesson.status === "PUBLISHED" && (
                <p className="mb-5 rounded-lg border border-[#B7FB5B]/25 bg-[#B7FB5B]/[0.06] px-3 py-2 text-sm text-zinc-200">
                    Subbab ini sudah terbit. Menyimpan perubahan langsung memperbarui materi yang dibaca pengguna.
                </p>
            )}

            {preview && (
                <section aria-labelledby={`${titleId}-preview`} className="rounded-2xl border border-white/10 bg-[#111315] p-4 sm:p-8">
                    <p className="mb-6 text-xs text-zinc-400">Pratinjau memakai tampilan pembaca dan tidak mencatat progres.</p>
                    <h2 id={`${titleId}-preview`} className="mb-6 break-words font-nebulica text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] font-bold leading-tight">{title || "Tanpa judul"}</h2>
                    <div className="max-w-[68ch]">
                        <LessonRenderer document={preview.document} media={load.media} refreshMedia={refresh} emptyMessage="Belum ada isi. Draft kosong boleh disimpan, tetapi tidak dapat diterbitkan." />
                    </div>
                </section>
            )}

            <div className={preview ? "hidden" : "space-y-5"}>
                <div>
                    <label htmlFor={titleId} className="text-sm font-semibold text-zinc-200">Judul subbab</label>
                    <input
                        id={titleId}
                        value={title}
                        maxLength={MAX_TITLE_LENGTH}
                        onChange={(event) => setTitle(event.target.value)}
                        aria-invalid={save.field === "title"}
                        className={`mt-1.5 text-base ${TEXT_INPUT} ${save.field === "title" && save.status === "error" ? "border-red-400/60" : "border-white/15"}`}
                    />
                </div>
                <div>
                    <p id={editorLabelId} className="mb-1.5 text-sm font-semibold text-zinc-200">Isi materi</p>
                    <LessonEditor
                        initialContent={lesson.content}
                        media={load.media}
                        editorRef={editorRef}
                        onDirty={markDirty}
                        labelledBy={editorLabelId}
                    />
                    <p className="mt-2 text-xs text-zinc-400">Tersedia: judul bagian, subjudul, tebal, tautan, daftar, dan gambar. Draft kosong boleh disimpan.</p>
                </div>
            </div>
        </AdminEbookFrame>
    );
}

export default function AdminLessonPage() {
    const { ebookId, lessonId } = useParams();
    return (
        <AuthGuard admin>
            <LessonWorkspace key={`${ebookId}:${lessonId}`} ebookId={ebookId} lessonId={lessonId} />
        </AuthGuard>
    );
}
