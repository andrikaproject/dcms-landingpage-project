// Kontrak dokumen materi v1 (docs/superpowers/specs/2026-09-22-ebook-cms-contract.md).
// Batas di sini mengikuti validator BE agar admin melihat kesalahan sebelum
// request dikirim. BE tetap menjadi penentu akhir.

export const CONTENT_SCHEMA_VERSION = 1;
export const MAX_DOCUMENT_BYTES = 512 * 1024;
export const MAX_DOCUMENT_DEPTH = 20;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_SLUG_LENGTH = 191;
export const MAX_ALT_LENGTH = 300;
export const MAX_LINK_LENGTH = 2048;
export const MAX_ASSET_ID_LENGTH = 36;
export const HEADING_LEVELS = [2, 3];

const BLOCK_NODES = new Set(["paragraph", "heading", "bulletList", "orderedList", "image"]);
const INLINE_NODES = new Set(["text", "hardBreak"]);
const LIST_BODY_NODES = new Set(["paragraph", "bulletList", "orderedList"]);

export class EbookContentError extends Error {
    constructor(message, path = []) {
        super(message);
        this.name = "EbookContentError";
        this.path = path.join(".") || "doc";
    }
}

export function emptyDocument() {
    return { type: "doc", content: [{ type: "paragraph" }] };
}

// Hanya http/https. javascript:, data:, dan URL relatif ditolak karena renderer
// menaruh href ini langsung pada <a>.
export function safeLinkHref(value) {
    if (typeof value !== "string") return null;
    const href = value.trim();
    if (!href || href.length > MAX_LINK_LENGTH) return null;
    let url;
    try {
        url = new URL(href);
    } catch {
        return null;
    }
    return url.protocol === "http:" || url.protocol === "https:" ? href : null;
}

// Admin biasa mengetik "dcms.id/materi" tanpa skema. Skema lain yang eksplisit
// tidak diubah supaya safeLinkHref tetap menolaknya.
export function normalizeLinkInput(value) {
    const input = String(value ?? "").trim();
    if (!input) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(input)) return input;
    return `https://${input.replace(/^\/+/, "")}`;
}

export function slugify(value) {
    return String(value ?? "")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/, "");
}

export function isValidSlug(value) {
    return typeof value === "string" && value.length <= MAX_SLUG_LENGTH && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function normalizeMarks(marks) {
    if (!Array.isArray(marks)) return undefined;
    const result = [];
    const seen = new Set();
    for (const mark of marks) {
        if (!mark || seen.has(mark.type)) continue;
        if (mark.type === "bold") {
            result.push({ type: "bold" });
            seen.add("bold");
        } else if (mark.type === "link") {
            // Tiptap menambahkan target/rel/class/title; kontrak hanya menyimpan href.
            const href = safeLinkHref(mark.attrs?.href);
            if (!href) continue;
            result.push({ type: "link", attrs: { href } });
            seen.add("link");
        }
    }
    return result.length ? result : undefined;
}

function normalizeChildren(children, allowed, depth, path, parentType) {
    if (children === undefined || children === null) return [];
    if (!Array.isArray(children)) throw new EbookContentError("Isi dokumen harus berupa daftar node.", path);
    const result = [];
    children.forEach((child, index) => {
        const childPath = [...path, String(index)];
        if (!child || typeof child !== "object") throw new EbookContentError("Node dokumen tidak valid.", childPath);
        if (!allowed.has(child.type)) {
            // Heading di dalam daftar tidak didukung BE; teksnya dipertahankan sebagai paragraf.
            if (parentType === "listItem" && child.type === "heading") {
                const paragraph = normalizeNode({ type: "paragraph", content: child.content }, depth, childPath);
                if (paragraph) result.push(paragraph);
                return;
            }
            throw new EbookContentError(`Konten "${child.type}" tidak didukung di dalam ${parentType}.`, childPath);
        }
        const node = normalizeNode(child, depth, childPath);
        if (node) result.push(node);
    });
    return result;
}

function normalizeNode(node, depth, path) {
    if (depth > MAX_DOCUMENT_DEPTH) throw new EbookContentError(`Kedalaman dokumen melebihi ${MAX_DOCUMENT_DEPTH} tingkat.`, path);
    const contentPath = [...path, "content"];

    switch (node.type) {
        case "text": {
            if (typeof node.text !== "string" || node.text === "") return null;
            const marks = normalizeMarks(node.marks);
            return marks ? { type: "text", text: node.text, marks } : { type: "text", text: node.text };
        }
        case "hardBreak":
            return { type: "hardBreak" };
        case "paragraph": {
            const content = normalizeChildren(node.content, INLINE_NODES, depth + 1, contentPath, "paragraph");
            return content.length ? { type: "paragraph", content } : { type: "paragraph" };
        }
        case "heading": {
            const level = Number(node.attrs?.level) >= 3 ? 3 : 2;
            const content = normalizeChildren(node.content, INLINE_NODES, depth + 1, contentPath, "heading");
            return { type: "heading", attrs: { level }, ...(content.length ? { content } : {}) };
        }
        case "bulletList":
        case "orderedList": {
            const items = normalizeChildren(node.content, new Set(["listItem"]), depth + 1, contentPath, node.type);
            if (!items.length) return null;
            const start = Number(node.attrs?.start);
            const attrs = node.type === "orderedList" && Number.isInteger(start) && start > 1 && start <= 10_000 ? { start } : undefined;
            return { type: node.type, ...(attrs ? { attrs } : {}), content: items };
        }
        case "listItem": {
            const content = normalizeChildren(node.content, LIST_BODY_NODES, depth + 1, contentPath, "listItem");
            return { type: "listItem", content: content.length ? content : [{ type: "paragraph" }] };
        }
        case "image": {
            const assetId = typeof node.attrs?.assetId === "string" ? node.attrs.assetId.trim() : "";
            if (!assetId || assetId.length > MAX_ASSET_ID_LENGTH) throw new EbookContentError("Gambar belum selesai diunggah. Hapus lalu unggah ulang gambar tersebut.", path);
            const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "";
            if (alt.length > MAX_ALT_LENGTH) throw new EbookContentError(`Teks alternatif gambar maksimal ${MAX_ALT_LENGTH} karakter.`, path);
            return { type: "image", attrs: alt ? { assetId, alt } : { assetId } };
        }
        default:
            throw new EbookContentError(`Konten "${node.type}" tidak didukung.`, path);
    }
}

// Mengubah JSON editor menjadi dokumen kontrak: hanya node, mark, dan atribut yang
// diizinkan BE. URL sementara gambar tidak pernah ikut tersimpan.
export function toContractDocument(document) {
    if (!document || typeof document !== "object" || document.type !== "doc") {
        throw new EbookContentError("Dokumen materi tidak valid.");
    }
    const content = normalizeChildren(document.content, BLOCK_NODES, 1, ["content"], "doc");
    return content.length ? { type: "doc", content } : { type: "doc" };
}

function collect(node, summary) {
    if (!node || typeof node !== "object") return;
    if (node.type === "text" && typeof node.text === "string" && node.text.trim()) summary.hasText = true;
    if (node.type === "image" && node.attrs?.assetId) summary.assetIds.add(node.attrs.assetId);
    if (Array.isArray(node.content)) for (const child of node.content) collect(child, summary);
}

export function summarizeDocument(document) {
    const summary = { hasText: false, assetIds: new Set() };
    collect(document, summary);
    return {
        bytes: new TextEncoder().encode(JSON.stringify(document ?? null)).length,
        hasContent: summary.hasText || summary.assetIds.size > 0,
        assetIds: [...summary.assetIds],
    };
}

export function documentSizeError(document) {
    const { bytes } = summarizeDocument(document);
    return bytes > MAX_DOCUMENT_BYTES ? `Materi terlalu besar (${Math.ceil(bytes / 1024)} KiB). Batasnya ${MAX_DOCUMENT_BYTES / 1024} KiB.` : null;
}
