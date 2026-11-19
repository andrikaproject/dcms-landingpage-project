"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthProvider";
import AdminEbookFrame, { FOCUS_RING, InlineError, PRIMARY_BUTTON, QUIET_BUTTON, SECONDARY_BUTTON, StatusBadge, TEXT_INPUT } from "@/components/ebooks/admin/AdminEbookFrame";
import { createAdminEbook, fetchAdminEbooks } from "@/lib/ebooks/api";
import { MAX_DESCRIPTION_LENGTH, MAX_SLUG_LENGTH, MAX_TITLE_LENGTH, isValidSlug, slugify } from "@/lib/ebooks/content";
import { describeEbookError, fieldErrorsFrom } from "@/lib/ebooks/payload";
import { formatUserTime } from "@/lib/signals/format";
import { isAbortError } from "@/lib/signals/request";

function CreateEbookForm({ onCancel }) {
    const router = useRouter();
    const id = useId();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [slugEdited, setSlugEdited] = useState(false);
    const [description, setDescription] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const effectiveSlug = slugEdited ? slug : slugify(title);

    async function submit(event) {
        event.preventDefault();
        const localErrors = {};
        if (!title.trim()) localErrors.title = "Judul wajib diisi.";
        if (!isValidSlug(effectiveSlug)) localErrors.slug = "Gunakan huruf kecil, angka, dan tanda hubung.";
        setFieldErrors(localErrors);
        if (Object.keys(localErrors).length) return;

        setPending(true);
        setError("");
        try {
            const body = { title: title.trim(), slug: effectiveSlug };
            if (description.trim()) body.description = description.trim();
            const created = await createAdminEbook(body);
            // Editor dibuka memakai ID dari server, bukan slug buatan browser.
            router.push(`/dashboard/admin/ebooks/${encodeURIComponent(created.id)}`);
        } catch (createError) {
            setFieldErrors(fieldErrorsFrom(createError));
            setError(describeEbookError(createError, "Ebook gagal dibuat."));
            setPending(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate className="mb-8 space-y-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4 sm:p-5" aria-labelledby={`${id}-heading`}>
            <h2 id={`${id}-heading`} className="font-nebulica text-lg font-bold">Ebook baru</h2>
            <p className="text-sm text-zinc-400">Ebook dibuat sebagai draft. Cover, bab, dan subbab diisi di halaman berikutnya.</p>
            <div>
                <label htmlFor={`${id}-title`} className="text-sm font-semibold text-zinc-200">Judul</label>
                <input
                    id={`${id}-title`}
                    autoFocus
                    value={title}
                    maxLength={MAX_TITLE_LENGTH}
                    onChange={(event) => { setTitle(event.target.value); setFieldErrors((current) => ({ ...current, title: undefined })); }}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? `${id}-title-error` : undefined}
                    className={`mt-1.5 ${TEXT_INPUT} ${fieldErrors.title ? "border-red-400/60" : "border-white/15"}`}
                />
                {fieldErrors.title && <p id={`${id}-title-error`} className="mt-1 text-xs text-red-300">{fieldErrors.title}</p>}
            </div>
            <div>
                <label htmlFor={`${id}-slug`} className="text-sm font-semibold text-zinc-200">Slug</label>
                <p id={`${id}-slug-hint`} className="text-xs text-zinc-400">Terisi otomatis dari judul. Tampil di alamat halaman pembaca.</p>
                <input
                    id={`${id}-slug`}
                    value={effectiveSlug}
                    maxLength={MAX_SLUG_LENGTH}
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={(event) => { setSlugEdited(true); setSlug(event.target.value.toLowerCase()); setFieldErrors((current) => ({ ...current, slug: undefined })); }}
                    aria-invalid={Boolean(fieldErrors.slug)}
                    aria-describedby={[`${id}-slug-hint`, fieldErrors.slug ? `${id}-slug-error` : null].filter(Boolean).join(" ")}
                    className={`mt-1.5 font-mono ${TEXT_INPUT} ${fieldErrors.slug ? "border-red-400/60" : "border-white/15"}`}
                />
                {fieldErrors.slug && <p id={`${id}-slug-error`} className="mt-1 text-xs text-red-300">{fieldErrors.slug}</p>}
            </div>
            <div>
                <label htmlFor={`${id}-description`} className="text-sm font-semibold text-zinc-200">Deskripsi <span className="font-normal text-zinc-400">(boleh diisi nanti)</span></label>
                <textarea
                    id={`${id}-description`}
                    value={description}
                    rows={3}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    onChange={(event) => setDescription(event.target.value)}
                    className={`mt-1.5 py-2 leading-6 ${TEXT_INPUT} border-white/15`}
                />
            </div>
            <InlineError message={error} />
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>{pending ? "Membuat draft…" : "Buat draft ebook"}</button>
                <button type="button" onClick={onCancel} disabled={pending} className={QUIET_BUTTON}>Batal</button>
            </div>
        </form>
    );
}

function AdminEbookList() {
    const [ebooks, setEbooks] = useState([]);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetchAdminEbooks({ signal: controller.signal })
            .then((items) => {
                setEbooks(items);
                setStatus("ready");
            })
            .catch((loadError) => {
                if (isAbortError(loadError, controller.signal)) return;
                setError(describeEbookError(loadError, "Daftar ebook gagal dimuat."));
                setStatus("error");
            });
        return () => controller.abort();
    }, [reloadKey]);

    return (
        <AdminEbookFrame
            title="CMS Ebook"
            description="Kelola ebook, bab, dan subbab. Ebook terbit tersedia untuk semua pengguna yang login."
            backHref="/dashboard/admin"
            backLabel="Kembali ke Panel admin"
            actions={!creating && <button type="button" onClick={() => setCreating(true)} className={PRIMARY_BUTTON}>Tambah ebook</button>}
        >
            {creating && <CreateEbookForm onCancel={() => setCreating(false)} />}

            {status === "loading" && <p role="status" className="py-16 text-center text-zinc-400">Memuat daftar ebook…</p>}
            {status === "error" && <InlineError message={error} onRetry={() => { setStatus("loading"); setReloadKey((key) => key + 1); }} />}
            {status === "ready" && ebooks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                    <p className="text-zinc-300">Belum ada ebook.</p>
                    <p className="mt-1 text-sm text-zinc-400">Mulai dengan menekan &ldquo;Tambah ebook&rdquo;.</p>
                </div>
            )}
            {status === "ready" && ebooks.length > 0 && (
                <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-zinc-950/70">
                    {ebooks.map((ebook) => (
                        <li key={ebook.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link href={`/dashboard/admin/ebooks/${encodeURIComponent(ebook.id)}`} className={`break-words font-semibold text-white underline-offset-4 hover:underline ${FOCUS_RING}`}>
                                        {ebook.title || "Tanpa judul"}
                                    </Link>
                                    <StatusBadge status={ebook.status} />
                                </div>
                                <p className="mt-1 break-all font-mono text-xs text-zinc-400">/{ebook.slug}</p>
                                {ebook.updatedAt && <p className="mt-0.5 text-xs text-zinc-400">Diubah {formatUserTime(ebook.updatedAt)}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link href={`/dashboard/admin/ebooks/${encodeURIComponent(ebook.id)}`} className={SECONDARY_BUTTON}>Kelola</Link>
                                <Link href={`/dashboard/admin/ebooks/${encodeURIComponent(ebook.id)}/progress`} className={QUIET_BUTTON}>Progres pembaca</Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </AdminEbookFrame>
    );
}

// Guard di level halaman: request admin baru dikirim setelah sesi terbukti ADMIN.
export default function AdminEbooksPage() {
    return <AuthGuard admin><AdminEbookList /></AuthGuard>;
}
