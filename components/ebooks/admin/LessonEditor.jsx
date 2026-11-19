"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { ListItem } from "@tiptap/extension-list";
import {
    ArrowClockwise,
    ArrowCounterClockwise,
    ImageSquare,
    LinkSimple,
    ListBullets,
    ListNumbers,
    Paragraph,
    TextB,
    TextHThree,
    TextHTwo,
    Trash,
} from "@phosphor-icons/react";
import { PrivateImage } from "@/components/ebooks/EbookCover";
import { MAX_ALT_LENGTH, emptyDocument, normalizeLinkInput, safeLinkHref } from "@/lib/ebooks/content";
import { mediaApi, refreshAdminMedia } from "@/lib/ebooks/api";
import { IMAGE_ACCEPT, finalizeUpload, uploadImage } from "@/lib/ebooks/upload";
import { isAbortError } from "@/lib/signals/request";

const EditorMediaContext = createContext({ media: {}, refresh: null });

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]";

function EditorImageView({ node, updateAttributes, deleteNode, selected }) {
    const { media, refresh } = useContext(EditorMediaContext);
    const altId = useId();
    const { assetId, alt } = node.attrs;

    return (
        <NodeViewWrapper className={`my-5 rounded-xl border p-3 ${selected ? "border-[#B7FB5B]/70" : "border-white/10"}`} data-asset-id={assetId}>
            <PrivateImage assetId={assetId} media={media[assetId]} refresh={refresh} alt={alt || ""} className="h-auto max-h-[420px] w-full rounded-lg object-contain" />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end" contentEditable={false}>
                <label htmlFor={altId} className="min-w-0 flex-1 text-xs text-zinc-400">
                    Teks alternatif
                    <input
                        id={altId}
                        type="text"
                        value={alt || ""}
                        maxLength={MAX_ALT_LENGTH}
                        onChange={(event) => updateAttributes({ alt: event.target.value.slice(0, MAX_ALT_LENGTH) || null })}
                        placeholder="Jelaskan isi gambar untuk pembaca layar"
                        className={`mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-zinc-400 ${FOCUS_RING}`}
                    />
                </label>
                <button type="button" onClick={deleteNode} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-400/30 px-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 ${FOCUS_RING}`}>
                    <Trash size={16} aria-hidden />
                    Hapus gambar
                </button>
            </div>
            <p className="mt-1 text-xs text-zinc-400">Kosongkan jika gambar hanya hiasan.</p>
        </NodeViewWrapper>
    );
}

// Node gambar hanya menyimpan assetId dan alt. URL bertanda tangan diresolusikan
// oleh node view dan tidak pernah masuk ke JSON yang disimpan.
const AssetImage = Image.extend({
    draggable: false,
    addAttributes() {
        return {
            assetId: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-asset-id"),
                renderHTML: (attributes) => (attributes.assetId ? { "data-asset-id": attributes.assetId } : {}),
            },
            alt: {
                default: null,
                parseHTML: (element) => element.getAttribute("alt"),
                renderHTML: (attributes) => (attributes.alt ? { alt: attributes.alt } : {}),
            },
        };
    },
    // Gambar dari luar (HTML tempelan atau sintaks markdown) tidak punya aset
    // terverifikasi, jadi hanya gambar yang sudah memiliki assetId yang diterima.
    parseHTML() {
        return [{ tag: "img[data-asset-id]" }];
    },
    addInputRules() {
        return [];
    },
    addNodeView() {
        return ReactNodeViewRenderer(EditorImageView);
    },
}).configure({ inline: false, allowBase64: false });

// BE hanya menerima paragraf dan daftar bertingkat di dalam item daftar.
const LessonListItem = ListItem.extend({
    content: "paragraph (paragraph | bulletList | orderedList)*",
});

function buildExtensions() {
    return [
        // Link berasal dari StarterKit v3; jangan daftarkan extension Link terpisah.
        StarterKit.configure({
            blockquote: false,
            code: false,
            codeBlock: false,
            horizontalRule: false,
            italic: false,
            strike: false,
            underline: false,
            listItem: false,
            heading: { levels: [2, 3] },
            link: {
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                defaultProtocol: "https",
                isAllowedUri: (url) => Boolean(safeLinkHref(url)),
                shouldAutoLink: (url) => Boolean(safeLinkHref(normalizeLinkInput(url))),
            },
        }),
        LessonListItem,
        AssetImage,
    ];
}

function ToolbarButton({ label, shortcut, active, disabled, onClick, children }) {
    return (
        <button
            type="button"
            // Klik mouse tidak memindahkan fokus dari editor, jadi seleksi dan kursor tetap
            // di tempatnya. Pengguna keyboard tetap bisa Tab ke tombol ini.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active === undefined ? undefined : active}
            title={shortcut ? `${label} (${shortcut})` : label}
            className={`grid size-11 shrink-0 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING} ${active ? "bg-white/15 text-white" : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"}`}
        >
            {children}
        </button>
    );
}

const UPLOAD_STAGE_LABELS = {
    preparing: "Menyiapkan upload…",
    uploading: "Mengunggah gambar…",
    verifying: "Memverifikasi gambar di server…",
};

function LinkForm({ initialHref, onApply, onRemove, onCancel }) {
    const inputId = useId();
    const [value, setValue] = useState(initialHref || "");
    const [error, setError] = useState("");

    function submit(event) {
        event.preventDefault();
        const href = safeLinkHref(normalizeLinkInput(value));
        if (!href) {
            setError("Tautan harus berupa alamat web http:// atau https://.");
            return;
        }
        onApply(href);
    }

    return (
        <form
            onSubmit={submit}
            onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onCancel(); } }}
            className="flex flex-col gap-2 border-b border-white/10 bg-black/30 p-3 sm:flex-row sm:items-start"
        >
            <div className="min-w-0 flex-1">
                <label htmlFor={inputId} className="sr-only">Alamat tautan</label>
                <input
                    id={inputId}
                    type="text"
                    inputMode="url"
                    autoFocus
                    value={value}
                    onChange={(event) => { setValue(event.target.value); setError(""); }}
                    placeholder="https://contoh.id/materi"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className={`block min-h-11 w-full rounded-lg border bg-black/40 px-3 text-sm text-white placeholder:text-zinc-400 ${error ? "border-red-400/60" : "border-white/15"} ${FOCUS_RING}`}
                />
                {error && <p id={`${inputId}-error`} className="mt-1 text-xs text-red-300">{error}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
                <button type="submit" className={`min-h-11 rounded-lg bg-white px-4 text-sm font-bold text-black ${FOCUS_RING}`}>Terapkan</button>
                {initialHref && <button type="button" onClick={onRemove} className={`min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold text-zinc-200 ${FOCUS_RING}`}>Hapus tautan</button>}
                <button type="button" onClick={onCancel} className={`min-h-11 rounded-lg px-3 text-sm text-zinc-400 hover:text-white ${FOCUS_RING}`}>Batal</button>
            </div>
        </form>
    );
}

// editorRef menerima instance Tiptap agar halaman induk mengambil getJSON() saat
// menyimpan, tanpa menyalin seluruh dokumen ke state di setiap ketikan.
export default function LessonEditor({ initialContent, media: initialMedia = {}, editorRef, onDirty, disabled = false, labelledBy }) {
    const [media, setMedia] = useState(initialMedia);
    const [linkFormOpen, setLinkFormOpen] = useState(false);
    const [upload, setUpload] = useState(null);
    const fileInputRef = useRef(null);
    const uploadAbortRef = useRef(null);
    const onDirtyRef = useRef(onDirty);
    const openLinkFormRef = useRef(() => {});

    useEffect(() => { onDirtyRef.current = onDirty; }, [onDirty]);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: buildExtensions(),
        // Draft kosong disimpan BE sebagai { type: "doc" }; schema editor butuh minimal satu blok.
        content: initialContent?.type === "doc" && initialContent.content?.length ? initialContent : emptyDocument(),
        editable: !disabled,
        editorProps: {
            attributes: {
                class: "min-h-[320px] px-4 py-5 text-[1.0625rem] leading-[1.8] text-zinc-100 outline-none sm:px-6",
                role: "textbox",
                "aria-multiline": "true",
                ...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": "Isi materi" }),
            },
            handleKeyDown: (_view, event) => {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                    event.preventDefault();
                    openLinkFormRef.current();
                    return true;
                }
                return false;
            },
        },
        onUpdate: () => onDirtyRef.current?.(),
    });

    useEffect(() => {
        if (!editorRef) return undefined;
        editorRef.current = editor;
        return () => { editorRef.current = null; };
    }, [editor, editorRef]);

    useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);

    useEffect(() => () => uploadAbortRef.current?.abort(), []);

    const state = useEditorState({
        editor,
        selector: ({ editor: current }) => ({
            paragraph: current?.isActive("paragraph") ?? false,
            h2: current?.isActive("heading", { level: 2 }) ?? false,
            h3: current?.isActive("heading", { level: 3 }) ?? false,
            bold: current?.isActive("bold") ?? false,
            bulletList: current?.isActive("bulletList") ?? false,
            orderedList: current?.isActive("orderedList") ?? false,
            link: current?.isActive("link") ?? false,
            linkHref: current?.getAttributes("link").href ?? "",
            canUndo: current?.can().undo() ?? false,
            canRedo: current?.can().redo() ?? false,
        }),
    }) ?? {};

    const openLinkForm = useCallback(() => {
        if (editor?.isEditable) setLinkFormOpen(true);
    }, [editor]);
    useEffect(() => { openLinkFormRef.current = openLinkForm; }, [openLinkForm]);

    function applyLink(href) {
        const chain = editor.chain().focus().extendMarkRange("link");
        if (editor.state.selection.empty && !editor.isActive("link")) {
            chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
        } else {
            chain.setLink({ href }).run();
        }
        setLinkFormOpen(false);
    }

    function removeLink() {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        setLinkFormOpen(false);
    }

    const refresh = useCallback(async (assetId) => refreshAdminMedia(assetId), []);

    function insertImage(assetId) {
        editor.chain().focus().insertContent({ type: "image", attrs: { assetId, alt: null } }).run();
    }

    async function resolveAndInsert(assetId) {
        try {
            const entry = await refreshAdminMedia(assetId);
            if (entry) setMedia((current) => ({ ...current, [assetId]: entry }));
        } catch {
            // Node view akan mencoba lagi dan menampilkan fallback bila tetap gagal.
        }
        insertImage(assetId);
        setUpload({ stage: "done", message: "Gambar ditambahkan. Isi teks alternatif di bawah gambar." });
    }

    async function startUpload(file) {
        uploadAbortRef.current?.abort();
        const controller = new AbortController();
        uploadAbortRef.current = controller;
        setUpload({ stage: "preparing", file });
        try {
            const { assetId } = await uploadImage(file, {
                purpose: "LESSON_IMAGE",
                api: mediaApi,
                signal: controller.signal,
                onStage: (stage) => { if (!controller.signal.aborted && UPLOAD_STAGE_LABELS[stage]) setUpload({ stage, file }); },
            });
            if (controller.signal.aborted) return;
            await resolveAndInsert(assetId);
        } catch (error) {
            if (isAbortError(error, controller.signal)) {
                setUpload({ stage: "cancelled", message: "Upload dibatalkan. Isi materi tidak berubah." });
                return;
            }
            setUpload({ stage: "error", file, message: error.message, retryAssetId: error.stage === "complete" ? error.assetId : null });
        } finally {
            if (uploadAbortRef.current === controller) uploadAbortRef.current = null;
        }
    }

    async function retryUpload() {
        if (!upload) return;
        if (!upload.retryAssetId) {
            if (upload.file) startUpload(upload.file);
            return;
        }
        const controller = new AbortController();
        uploadAbortRef.current = controller;
        const { retryAssetId, file } = upload;
        setUpload({ stage: "verifying", file });
        try {
            await finalizeUpload(mediaApi, retryAssetId, { signal: controller.signal });
            await resolveAndInsert(retryAssetId);
        } catch (error) {
            if (isAbortError(error, controller.signal)) {
                setUpload({ stage: "cancelled", message: "Upload dibatalkan. Isi materi tidak berubah." });
                return;
            }
            setUpload({ stage: "error", file, message: error.message, retryAssetId });
        }
    }

    const uploading = upload && UPLOAD_STAGE_LABELS[upload.stage];
    const controlsDisabled = !editor || disabled;

    return (
        <div className={`overflow-hidden rounded-2xl border bg-[#0d0f13] transition focus-within:border-[#B7FB5B]/50 ${disabled ? "border-white/5 opacity-70" : "border-white/10"}`}>
            <div role="toolbar" aria-label="Format materi" className="flex flex-wrap items-center gap-1 border-b border-white/10 p-2">
                <ToolbarButton label="Teks biasa" active={state.paragraph} disabled={controlsDisabled} onClick={() => editor.chain().focus().setParagraph().run()}><Paragraph size={18} aria-hidden /></ToolbarButton>
                <ToolbarButton label="Judul bagian" shortcut="Ctrl+Alt+2" active={state.h2} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><TextHTwo size={18} aria-hidden /></ToolbarButton>
                <ToolbarButton label="Subjudul" shortcut="Ctrl+Alt+3" active={state.h3} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><TextHThree size={18} aria-hidden /></ToolbarButton>
                <span className="mx-1 h-6 w-px bg-white/10" aria-hidden />
                <ToolbarButton label="Tebal" shortcut="Ctrl+B" active={state.bold} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleBold().run()}><TextB size={18} weight="bold" aria-hidden /></ToolbarButton>
                <ToolbarButton label="Tautan" shortcut="Ctrl+K" active={state.link} disabled={controlsDisabled} onClick={openLinkForm}><LinkSimple size={18} aria-hidden /></ToolbarButton>
                <span className="mx-1 h-6 w-px bg-white/10" aria-hidden />
                <ToolbarButton label="Daftar berpoin" shortcut="Ctrl+Shift+8" active={state.bulletList} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><ListBullets size={18} aria-hidden /></ToolbarButton>
                <ToolbarButton label="Daftar bernomor" shortcut="Ctrl+Shift+7" active={state.orderedList} disabled={controlsDisabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListNumbers size={18} aria-hidden /></ToolbarButton>
                <ToolbarButton label="Sisipkan gambar" disabled={controlsDisabled || Boolean(uploading) || state.bulletList || state.orderedList} onClick={() => fileInputRef.current?.click()}><ImageSquare size={18} aria-hidden /></ToolbarButton>
                <span className="mx-1 h-6 w-px bg-white/10" aria-hidden />
                <ToolbarButton label="Urungkan" shortcut="Ctrl+Z" disabled={controlsDisabled || !state.canUndo} onClick={() => editor.chain().focus().undo().run()}><ArrowCounterClockwise size={18} aria-hidden /></ToolbarButton>
                <ToolbarButton label="Ulangi" shortcut="Ctrl+Shift+Z" disabled={controlsDisabled || !state.canRedo} onClick={() => editor.chain().focus().redo().run()}><ArrowClockwise size={18} aria-hidden /></ToolbarButton>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) startUpload(file);
                    }}
                />
            </div>

            {linkFormOpen && editor && (
                <LinkForm
                    initialHref={state.linkHref}
                    onApply={applyLink}
                    onRemove={removeLink}
                    onCancel={() => { setLinkFormOpen(false); editor.commands.focus(); }}
                />
            )}

            {upload && upload.stage !== "idle" && (
                <div role="status" aria-live="polite" className={`flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2 text-sm ${upload.stage === "error" ? "bg-red-500/10 text-red-100" : "bg-white/[0.03] text-zinc-300"}`}>
                    <span className="min-w-0">{uploading ? UPLOAD_STAGE_LABELS[upload.stage] : upload.message}</span>
                    <span className="flex gap-2">
                        {uploading && (
                            <button type="button" onClick={() => uploadAbortRef.current?.abort()} className={`min-h-11 rounded-lg px-3 text-sm font-semibold text-zinc-200 hover:text-white ${FOCUS_RING}`}>Batalkan</button>
                        )}
                        {upload.stage === "error" && (
                            <button type="button" onClick={retryUpload} className={`min-h-11 rounded-lg border border-red-300/40 px-3 text-sm font-semibold ${FOCUS_RING}`}>
                                {upload.retryAssetId ? "Coba verifikasi lagi" : "Coba lagi"}
                            </button>
                        )}
                        {!uploading && (
                            <button type="button" onClick={() => setUpload(null)} className={`min-h-11 rounded-lg px-3 text-sm text-zinc-400 hover:text-white ${FOCUS_RING}`}>Tutup</button>
                        )}
                    </span>
                </div>
            )}

            <EditorMediaContext.Provider value={{ media, refresh }}>
                {editor ? (
                    <EditorContent
                        editor={editor}
                        className="[&_.ProseMirror]:break-words [&_.ProseMirror]:[overflow-wrap:anywhere] [&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_a]:decoration-[#B7FB5B] [&_a]:decoration-2 [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-nebulica [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-nebulica [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_li>p]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_strong]:text-white [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
                    />
                ) : (
                    <div className="min-h-[320px] animate-pulse bg-white/[0.02]" aria-busy="true" aria-label="Memuat editor" />
                )}
            </EditorMediaContext.Provider>
        </div>
    );
}
