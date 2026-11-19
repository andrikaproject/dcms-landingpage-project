"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, PencilSimple } from "@phosphor-icons/react";
import EbookCover from "@/components/ebooks/EbookCover";
import AdminEbookFrame, {
    FOCUS_RING,
    InlineError,
    PRIMARY_BUTTON,
    QUIET_BUTTON,
    SECONDARY_BUTTON,
    StatusBadge,
    TEXT_INPUT,
    useUnsavedChangesWarning,
} from "./AdminEbookFrame";
import {
    createAdminChapter,
    createAdminLesson,
    fetchAdminEbook,
    mediaApi,
    refreshAdminMedia,
    reorderAdminChapters,
    reorderAdminLessons,
    updateAdminChapter,
    updateAdminEbook,
} from "@/lib/ebooks/api";
import { MAX_DESCRIPTION_LENGTH, MAX_SLUG_LENGTH, MAX_TITLE_LENGTH, isValidSlug } from "@/lib/ebooks/content";
import { describeEbookError, fieldErrorsFrom } from "@/lib/ebooks/payload";
import { IMAGE_ACCEPT, uploadImage } from "@/lib/ebooks/upload";
import { formatUserTime } from "@/lib/signals/format";
import { isAbortError } from "@/lib/signals/request";

const FIELD_LABELS = { title: "Judul", slug: "Slug", description: "Deskripsi", coverAssetId: "Cover", cover: "Cover", status: "Status", lessons: "Subbab", chapters: "Bab" };

function draftFrom(ebook) {
    return { title: ebook.title, slug: ebook.slug, description: ebook.description };
}

function moveId(ids, index, delta) {
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    return next;
}

function focusAfterMove(prefix, id, index, length) {
    requestAnimationFrame(() => {
        const preferred = document.getElementById(`${prefix}-${id}-${index === 0 ? "down" : "up"}`);
        const fallback = document.getElementById(`${prefix}-${id}-${index === length - 1 ? "up" : "down"}`);
        (preferred && !preferred.disabled ? preferred : fallback)?.focus();
    });
}

function validateDetails(draft) {
    const errors = {};
    if (!draft.title.trim()) errors.title = "Judul wajib diisi.";
    if (draft.slug && !isValidSlug(draft.slug)) errors.slug = "Gunakan huruf kecil, angka, dan tanda hubung. Contoh: dasar-trading.";
    if (!draft.slug) errors.slug = "Slug wajib diisi.";
    return errors;
}

function Field({ id, label, hint, error, count, max, children }) {
    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-sm font-semibold text-zinc-200">{label}</label>
                {max && <span className={`text-xs tabular-nums ${count > max ? "text-red-300" : "text-zinc-400"}`}>{count}/{max}</span>}
            </div>
            {hint && <p id={`${id}-hint`} className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
            <div className="mt-1.5">{children}</div>
            {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-300">{error}</p>}
        </div>
    );
}

function DetailsSection({ ebook, draft, setDraft, dirty, onSaved }) {
    const baseId = useId();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [savedAt, setSavedAt] = useState(null);

    function update(field, value) {
        setDraft((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }

    async function save(event) {
        event.preventDefault();
        const localErrors = validateDetails(draft);
        if (Object.keys(localErrors).length) {
            setFieldErrors(localErrors);
            return;
        }
        setSaving(true);
        setError("");
        try {
            const updated = await updateAdminEbook(ebook.id, { title: draft.title.trim(), slug: draft.slug, description: draft.description });
            onSaved(updated);
            setSavedAt(new Date().toISOString());
        } catch (saveError) {
            setFieldErrors(fieldErrorsFrom(saveError));
            setError(describeEbookError(saveError, "Detail ebook gagal disimpan."));
        } finally {
            setSaving(false);
        }
    }

    const describedBy = (field) => [fieldErrors[field] ? `${baseId}-${field}-error` : null, `${baseId}-${field}-hint`].filter(Boolean).join(" ");

    return (
        <form onSubmit={save} noValidate className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4 sm:p-5" aria-labelledby={`${baseId}-heading`}>
            <h2 id={`${baseId}-heading`} className="font-nebulica text-lg font-bold">Detail ebook</h2>
            <Field id={`${baseId}-title`} label="Judul" error={fieldErrors.title} count={draft.title.length} max={MAX_TITLE_LENGTH}>
                <input
                    id={`${baseId}-title`}
                    value={draft.title}
                    maxLength={MAX_TITLE_LENGTH}
                    onChange={(event) => update("title", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? `${baseId}-title-error` : undefined}
                    className={`${TEXT_INPUT} ${fieldErrors.title ? "border-red-400/60" : "border-white/15"}`}
                />
            </Field>
            <Field id={`${baseId}-slug`} label="Slug" hint="Dipakai pada alamat halaman pembaca. Mengubahnya tidak menghapus progres." error={fieldErrors.slug} count={draft.slug.length} max={MAX_SLUG_LENGTH}>
                <input
                    id={`${baseId}-slug`}
                    value={draft.slug}
                    maxLength={MAX_SLUG_LENGTH}
                    onChange={(event) => update("slug", event.target.value.toLowerCase())}
                    aria-invalid={Boolean(fieldErrors.slug)}
                    aria-describedby={describedBy("slug")}
                    spellCheck={false}
                    autoCapitalize="none"
                    className={`${TEXT_INPUT} font-mono ${fieldErrors.slug ? "border-red-400/60" : "border-white/15"}`}
                />
            </Field>
            <Field id={`${baseId}-description`} label="Deskripsi" hint="Ringkasan yang tampil di katalog. Wajib sebelum ebook diterbitkan." error={fieldErrors.description} count={draft.description.length} max={MAX_DESCRIPTION_LENGTH}>
                <textarea
                    id={`${baseId}-description`}
                    value={draft.description}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    rows={4}
                    onChange={(event) => update("description", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={describedBy("description")}
                    className={`${TEXT_INPUT} py-2 leading-6 ${fieldErrors.description ? "border-red-400/60" : "border-white/15"}`}
                />
            </Field>
            <InlineError message={error} />
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={saving || !dirty} className={PRIMARY_BUTTON}>{saving ? "Menyimpan…" : "Simpan detail"}</button>
                <p className="text-xs text-zinc-400" role="status" aria-live="polite">
                    {saving ? "" : dirty ? "Ada perubahan yang belum disimpan." : savedAt ? `Tersimpan ${formatUserTime(savedAt)}` : ""}
                </p>
            </div>
        </form>
    );
}

function CoverSection({ ebook, onSaved }) {
    const inputRef = useRef(null);
    const abortRef = useRef(null);
    const [task, setTask] = useState(null);
    const refresh = useCallback((assetId) => refreshAdminMedia(assetId), []);

    useEffect(() => () => abortRef.current?.abort(), []);

    async function attach(assetId) {
        setTask({ stage: "attaching" });
        try {
            const updated = await updateAdminEbook(ebook.id, { coverAssetId: assetId });
            onSaved({ ...updated, cover: updated.cover?.assetId === assetId ? updated.cover : { assetId, media: null } });
            setTask({ stage: "done", message: "Cover diperbarui." });
        } catch (error) {
            // Aset sudah READY; ulangi hanya penautan, bukan upload.
            setTask({ stage: "error", message: describeEbookError(error, "Cover gagal dipasang."), retry: () => attach(assetId) });
        }
    }

    async function start(file) {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setTask({ stage: "uploading" });
        try {
            const { assetId } = await uploadImage(file, { purpose: "COVER", api: mediaApi, signal: controller.signal });
            await attach(assetId);
        } catch (error) {
            if (isAbortError(error, controller.signal)) {
                setTask({ stage: "done", message: "Upload cover dibatalkan." });
                return;
            }
            setTask({ stage: "error", message: error.message, retry: () => start(file) });
        }
    }

    const busy = task?.stage === "uploading" || task?.stage === "attaching";

    return (
        <section aria-labelledby="cover-heading" className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-4 sm:p-5">
            <h2 id="cover-heading" className="font-nebulica text-lg font-bold">Cover</h2>
            <EbookCover key={ebook.cover?.assetId || "none"} cover={ebook.cover} refresh={refresh} title={ebook.title} loading="eager" />
            <p className="text-xs text-zinc-400">JPEG, PNG, atau WebP, maksimal 10 MiB. Server mengubahnya ke WebP setelah diverifikasi.</p>
            <input
                ref={inputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) start(file);
                }}
            />
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={SECONDARY_BUTTON}>
                    {ebook.cover ? "Ganti cover" : "Unggah cover"}
                </button>
                {task?.stage === "uploading" && <button type="button" onClick={() => abortRef.current?.abort()} className={QUIET_BUTTON}>Batalkan</button>}
            </div>
            <div role="status" aria-live="polite" className="text-sm text-zinc-300">
                {task?.stage === "uploading" && "Mengunggah dan memverifikasi cover…"}
                {task?.stage === "attaching" && "Memasang cover ke ebook…"}
                {task?.stage === "done" && task.message}
            </div>
            {task?.stage === "error" && <InlineError message={task.message} onRetry={task.retry} />}
        </section>
    );
}

const TRANSITIONS = {
    DRAFT: [{ status: "PUBLISHED", label: "Terbitkan ebook", primary: true }],
    PUBLISHED: [{ status: "ARCHIVED", label: "Arsipkan ebook", confirm: "Ebook akan disembunyikan dari katalog pembaca. Progres pembaca tetap tersimpan. Lanjutkan?" }],
    ARCHIVED: [{ status: "PUBLISHED", label: "Terbitkan lagi", primary: true }],
};

function PublicationSection({ ebook, detailsDirty, onSaved }) {
    const [pending, setPending] = useState(null);
    const [error, setError] = useState(null);
    const publishedLessons = ebook.chapters.reduce((count, chapter) => count + chapter.lessons.filter((lesson) => lesson.status === "PUBLISHED").length, 0);
    const checklist = [
        ["Judul terisi", Boolean(ebook.title.trim())],
        ["Deskripsi terisi", Boolean(ebook.description.trim())],
        ["Cover terpasang", Boolean(ebook.cover)],
        ["Minimal satu subbab terbit", publishedLessons > 0],
    ];

    async function transition({ status, confirm }) {
        if (confirm && !window.confirm(confirm)) return;
        setPending(status);
        setError(null);
        try {
            onSaved(await updateAdminEbook(ebook.id, { status }));
        } catch (transitionError) {
            const fields = fieldErrorsFrom(transitionError);
            setError({ message: describeEbookError(transitionError, "Status ebook gagal diubah."), fields });
        } finally {
            setPending(null);
        }
    }

    return (
        <section aria-labelledby="publication-heading" className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 id="publication-heading" className="font-nebulica text-lg font-bold">Publikasi</h2>
                        <StatusBadge status={ebook.status} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                        {ebook.status === "PUBLISHED" && "Ebook tampil di katalog semua pengguna yang login. Hanya subbab terbit yang dapat dibaca."}
                        {ebook.status === "DRAFT" && "Draft belum terlihat oleh pembaca."}
                        {ebook.status === "ARCHIVED" && "Ebook disembunyikan dari pembaca. Progres lama tetap tersimpan."}
                    </p>
                    {ebook.status !== "PUBLISHED" && (
                        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2" aria-label="Syarat penerbitan">
                            {checklist.map(([label, done]) => (
                                <li key={label} className={done ? "text-zinc-200" : "text-zinc-400"}>
                                    <span aria-hidden className={`mr-2 inline-block size-2 rounded-full ${done ? "bg-[#B7FB5B]" : "border border-zinc-500"}`} />
                                    {label}<span className="sr-only">{done ? ": terpenuhi" : ": belum"}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    {(TRANSITIONS[ebook.status] || []).map((item) => (
                        <button
                            key={item.status}
                            type="button"
                            disabled={Boolean(pending) || detailsDirty}
                            onClick={() => transition(item)}
                            className={item.primary ? PRIMARY_BUTTON : SECONDARY_BUTTON}
                        >
                            {pending === item.status ? "Memproses…" : item.label}
                        </button>
                    ))}
                </div>
            </div>
            {detailsDirty && <p className="mt-3 text-xs text-amber-200">Simpan detail ebook terlebih dahulu sebelum mengubah status.</p>}
            {error && (
                <div className="mt-3 space-y-2">
                    <InlineError message={error.message} />
                    {Object.keys(error.fields).length > 0 && (
                        <ul className="list-disc pl-5 text-sm text-red-200">
                            {Object.entries(error.fields).map(([field, message]) => <li key={field}>{FIELD_LABELS[field] || field}: {message}</li>)}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}

function AddItemForm({ label, placeholder, pending, error, onSubmit }) {
    const id = useId();
    const [title, setTitle] = useState("");
    const [localError, setLocalError] = useState("");

    async function submit(event) {
        event.preventDefault();
        if (!title.trim()) {
            setLocalError("Judul wajib diisi.");
            return;
        }
        if (await onSubmit(title.trim())) setTitle("");
    }

    const message = localError || error;
    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
                <label htmlFor={id} className="sr-only">{placeholder}</label>
                <input
                    id={id}
                    value={title}
                    maxLength={MAX_TITLE_LENGTH}
                    placeholder={placeholder}
                    onChange={(event) => { setTitle(event.target.value); setLocalError(""); }}
                    aria-invalid={Boolean(message)}
                    aria-describedby={message ? `${id}-error` : undefined}
                    className={`${TEXT_INPUT} ${message ? "border-red-400/60" : "border-white/15"}`}
                />
                {message && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-300">{message}</p>}
            </div>
            <button type="submit" disabled={pending} className={SECONDARY_BUTTON}>{pending ? "Menambahkan…" : label}</button>
        </form>
    );
}

function MoveButtons({ idPrefix, id, label, index, length, disabled, onMove }) {
    return (
        <span className="flex shrink-0">
            <button id={`${idPrefix}-${id}-up`} type="button" aria-label={`Pindahkan ${label} ke atas`} title="Pindahkan ke atas" disabled={disabled || index === 0} onClick={() => onMove(index, -1)} className={`grid size-11 place-items-center rounded-lg text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING}`}>
                <ArrowUp size={16} aria-hidden />
            </button>
            <button id={`${idPrefix}-${id}-down`} type="button" aria-label={`Pindahkan ${label} ke bawah`} title="Pindahkan ke bawah" disabled={disabled || index === length - 1} onClick={() => onMove(index, 1)} className={`grid size-11 place-items-center rounded-lg text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING}`}>
                <ArrowDown size={16} aria-hidden />
            </button>
        </span>
    );
}

function ChapterTitle({ chapter, number, pending, error, onRename }) {
    const id = useId();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(chapter.title);

    async function submit(event) {
        event.preventDefault();
        if (!value.trim()) return;
        if (await onRename(value.trim())) setEditing(false);
    }

    if (!editing) {
        return (
            <div className="flex min-w-0 flex-1 items-start gap-1">
                <h3 className="min-w-0 flex-1 break-words py-2.5 font-nebulica text-base font-bold">
                    <span className="mr-2 text-zinc-400">Bab {number}</span>{chapter.title || "Tanpa judul"}
                </h3>
                <button type="button" onClick={() => { setValue(chapter.title); setEditing(true); }} aria-label={`Ubah judul bab ${number}`} title="Ubah judul" className={`grid size-11 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white ${FOCUS_RING}`}>
                    <PencilSimple size={16} aria-hidden />
                </button>
            </div>
        );
    }
    return (
        <form onSubmit={submit} onKeyDown={(event) => { if (event.key === "Escape") setEditing(false); }} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
                <label htmlFor={id} className="sr-only">Judul bab {number}</label>
                <input id={id} autoFocus value={value} maxLength={MAX_TITLE_LENGTH} onChange={(event) => setValue(event.target.value)} className={`${TEXT_INPUT} border-white/15`} />
                {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
            </div>
            <span className="flex gap-2">
                <button type="submit" disabled={pending || !value.trim()} className={SECONDARY_BUTTON}>{pending ? "Menyimpan…" : "Simpan"}</button>
                <button type="button" onClick={() => setEditing(false)} className={QUIET_BUTTON}>Batal</button>
            </span>
        </form>
    );
}

function StructureSection({ ebook, setEbook }) {
    const [pending, setPending] = useState({});
    const [errors, setErrors] = useState({});
    const [announcement, setAnnouncement] = useState("");

    async function run(key, task) {
        setPending((current) => ({ ...current, [key]: true }));
        setErrors((current) => ({ ...current, [key]: undefined }));
        try {
            await task();
            return true;
        } catch (error) {
            setErrors((current) => ({ ...current, [key]: describeEbookError(error, "Perubahan gagal disimpan.") }));
            return false;
        } finally {
            setPending((current) => ({ ...current, [key]: false }));
        }
    }

    const addChapter = (title) => run("add-chapter", async () => {
        const chapter = await createAdminChapter(ebook.id, { title });
        setEbook((current) => ({ ...current, chapters: [...current.chapters, chapter] }));
        setAnnouncement(`Bab "${chapter.title}" ditambahkan.`);
    });

    const renameChapter = (chapterId, title) => run(`rename:${chapterId}`, async () => {
        const chapter = await updateAdminChapter(ebook.id, chapterId, { title });
        setEbook((current) => ({
            ...current,
            chapters: current.chapters.map((item) => (item.id === chapterId ? { ...item, title: chapter?.title ?? title } : item)),
        }));
    });

    const moveChapter = (index, delta) => {
        const chapters = ebook.chapters;
        const ids = moveId(chapters.map((chapter) => chapter.id), index, delta);
        const moved = chapters[index];
        return run("order:chapters", async () => {
            await reorderAdminChapters(ebook.id, ids);
            setEbook((current) => ({ ...current, chapters: ids.map((id) => current.chapters.find((chapter) => chapter.id === id)).filter(Boolean) }));
            setAnnouncement(`Bab "${moved.title}" dipindahkan ke posisi ${index + delta + 1}.`);
            focusAfterMove("move-chapter", moved.id, index + delta, ids.length);
        });
    };

    const addLesson = (chapterId, title) => run(`add-lesson:${chapterId}`, async () => {
        const lesson = await createAdminLesson(ebook.id, chapterId, { title });
        setEbook((current) => ({
            ...current,
            chapters: current.chapters.map((chapter) => (chapter.id === chapterId ? { ...chapter, lessons: [...chapter.lessons, lesson] } : chapter)),
        }));
        setAnnouncement(`Subbab "${lesson.title}" ditambahkan sebagai draft.`);
    });

    const moveLesson = (chapter, index, delta) => {
        const ids = moveId(chapter.lessons.map((lesson) => lesson.id), index, delta);
        const moved = chapter.lessons[index];
        return run(`order:lessons:${chapter.id}`, async () => {
            await reorderAdminLessons(ebook.id, chapter.id, ids);
            setEbook((current) => ({
                ...current,
                chapters: current.chapters.map((item) => (item.id === chapter.id
                    ? { ...item, lessons: ids.map((id) => item.lessons.find((lesson) => lesson.id === id)).filter(Boolean) }
                    : item)),
            }));
            setAnnouncement(`Subbab "${moved.title}" dipindahkan ke posisi ${index + delta + 1}.`);
            focusAfterMove("move-lesson", moved.id, index + delta, ids.length);
        });
    };

    const chapterOrderLocked = pending["order:chapters"] || pending["add-chapter"];

    return (
        <section aria-labelledby="structure-heading" className="space-y-4">
            <div>
                <h2 id="structure-heading" className="font-nebulica text-xl font-bold">Bab dan subbab</h2>
                <p className="mt-1 text-sm text-zinc-400">Subbab baru selalu dimulai sebagai draft. Pembaca hanya melihat bab yang memiliki subbab terbit.</p>
            </div>
            <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
            <InlineError message={errors["order:chapters"]} />

            {ebook.chapters.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-400">Belum ada bab. Tambahkan bab pertama di bawah.</p>
            ) : (
                <ol className="space-y-4">
                    {ebook.chapters.map((chapter, chapterIndex) => {
                        const lessonOrderKey = `order:lessons:${chapter.id}`;
                        const lessonOrderLocked = pending[lessonOrderKey] || pending[`add-lesson:${chapter.id}`];
                        return (
                            <li key={chapter.id} className="rounded-2xl border border-white/10 bg-zinc-950/70">
                                <div className="flex items-start gap-2 border-b border-white/[0.06] p-3 sm:px-4">
                                    <ChapterTitle chapter={chapter} number={chapterIndex + 1} pending={pending[`rename:${chapter.id}`]} error={errors[`rename:${chapter.id}`]} onRename={(title) => renameChapter(chapter.id, title)} />
                                    <MoveButtons idPrefix="move-chapter" id={chapter.id} label={`bab "${chapter.title}"`} index={chapterIndex} length={ebook.chapters.length} disabled={chapterOrderLocked} onMove={moveChapter} />
                                </div>
                                <div className="space-y-3 p-3 sm:px-4">
                                    <InlineError message={errors[lessonOrderKey]} />
                                    {chapter.lessons.length === 0 ? (
                                        <p className="text-sm text-zinc-400">Belum ada subbab.</p>
                                    ) : (
                                        <ol className="divide-y divide-white/[0.06]">
                                            {chapter.lessons.map((lesson, lessonIndex) => (
                                                <li key={lesson.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                                                    <span className="w-9 shrink-0 text-sm tabular-nums text-zinc-400">{chapterIndex + 1}.{lessonIndex + 1}</span>
                                                    <Link href={`/dashboard/admin/ebooks/${encodeURIComponent(ebook.id)}/lessons/${encodeURIComponent(lesson.id)}`} className={`min-w-0 flex-1 basis-40 break-words py-2 text-sm font-semibold text-white underline-offset-4 hover:underline ${FOCUS_RING}`}>
                                                        {lesson.title || "Tanpa judul"}
                                                    </Link>
                                                    <StatusBadge status={lesson.status} />
                                                    <MoveButtons idPrefix="move-lesson" id={lesson.id} label={`subbab "${lesson.title}"`} index={lessonIndex} length={chapter.lessons.length} disabled={lessonOrderLocked} onMove={(index, delta) => moveLesson(chapter, index, delta)} />
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                    <AddItemForm label="Tambah subbab" placeholder={`Judul subbab baru untuk bab ${chapterIndex + 1}`} pending={pending[`add-lesson:${chapter.id}`]} error={errors[`add-lesson:${chapter.id}`]} onSubmit={(title) => addLesson(chapter.id, title)} />
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
            <div className="rounded-2xl border border-dashed border-white/15 p-3 sm:p-4">
                <AddItemForm label="Tambah bab" placeholder="Judul bab baru" pending={pending["add-chapter"]} error={errors["add-chapter"]} onSubmit={addChapter} />
            </div>
        </section>
    );
}

export default function EbookEditor({ ebookId }) {
    const [ebook, setEbook] = useState(null);
    const [draft, setDraft] = useState(null);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        fetchAdminEbook(ebookId, { signal: controller.signal })
            .then((loaded) => {
                setEbook(loaded);
                setDraft(draftFrom(loaded));
                setStatus("ready");
            })
            .catch((loadError) => {
                if (isAbortError(loadError, controller.signal)) return;
                setError(describeEbookError(loadError, "Ebook gagal dimuat."));
                setStatus("error");
            });
        return () => controller.abort();
    }, [ebookId, reloadKey]);

    const detailsDirty = Boolean(ebook && draft && (draft.title !== ebook.title || draft.slug !== ebook.slug || draft.description !== ebook.description));
    const confirmLeave = useUnsavedChangesWarning(detailsDirty);

    // PATCH mengembalikan ebook terbaru. Struktur dan cover dipertahankan jika
    // respons tidak memuatnya; admin tidak memiliki aksi menghapus cover.
    const applySaved = useCallback((updated) => {
        setEbook((current) => ({
            ...current,
            ...updated,
            cover: updated.cover ?? current.cover,
            chapters: updated.chapters.length ? updated.chapters : current.chapters,
        }));
        setDraft(draftFrom(updated));
    }, []);

    if (status !== "ready") {
        return (
            <AdminEbookFrame title="Kelola ebook">
                {status === "loading" && <p className="py-16 text-center text-zinc-400" role="status">Memuat ebook…</p>}
                {status === "error" && <InlineError message={error} onRetry={() => { setStatus("loading"); setReloadKey((key) => key + 1); }} />}
            </AdminEbookFrame>
        );
    }

    return (
        <AdminEbookFrame
            title={ebook.title || "Ebook tanpa judul"}
            description={ebook.updatedAt ? `Terakhir diubah ${formatUserTime(ebook.updatedAt)}` : undefined}
            onNavigate={confirmLeave}
            actions={(
                <>
                    <Link href={`/dashboard/admin/ebooks/${encodeURIComponent(ebook.id)}/progress`} onClick={confirmLeave} className={SECONDARY_BUTTON}>Lihat progres pembaca</Link>
                    {ebook.status === "PUBLISHED" && ebook.slug && (
                        <Link href={`/dashboard/ebook/${encodeURIComponent(ebook.slug)}`} onClick={confirmLeave} className={QUIET_BUTTON}>Buka halaman pembaca</Link>
                    )}
                </>
            )}
        >
            <div className="space-y-6">
                <PublicationSection ebook={ebook} detailsDirty={detailsDirty} onSaved={applySaved} />
                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
                    <DetailsSection ebook={ebook} draft={draft} setDraft={setDraft} dirty={detailsDirty} onSaved={applySaved} />
                    <CoverSection ebook={ebook} onSaved={(updated) => setEbook((current) => ({ ...current, cover: updated.cover, updatedAt: updated.updatedAt }))} />
                </div>
                <StructureSection ebook={ebook} setEbook={setEbook} />
            </div>
        </AdminEbookFrame>
    );
}
