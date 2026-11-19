"use client";

import { Fragment, useEffect } from "react";
import { PrivateImage } from "./EbookCover";
import { CONTENT_SCHEMA_VERSION, MAX_DOCUMENT_DEPTH, safeLinkHref, summarizeDocument } from "@/lib/ebooks/content";
import { getAppReporter } from "@/lib/monitoring/app-reporter";

// Renderer pembaca untuk dokumen kontrak v1. Setiap node dipetakan ke React
// element; teks selalu menjadi text node, jadi markup di dalam materi tidak
// pernah dieksekusi. Editor Tiptap tidak dimuat di halaman pembaca.

const BLOCK = new Set(["paragraph", "heading", "bulletList", "orderedList", "image"]);
const INLINE = new Set(["text", "hardBreak"]);
const LIST_ITEM = new Set(["listItem"]);
const LIST_BODY = new Set(["paragraph", "bulletList", "orderedList"]);

const CHILDREN_OF = {
    paragraph: INLINE,
    heading: INLINE,
    bulletList: LIST_ITEM,
    orderedList: LIST_ITEM,
    listItem: LIST_BODY,
};

function UnsupportedContent({ type, path, inline }) {
    useEffect(() => {
        getAppReporter().report({
            type: "CLIENT_RENDER_ERROR",
            message: "Materi ebook memuat konten yang tidak didukung renderer.",
            details: { scope: "ebook-lesson", nodeType: String(type).slice(0, 60), path },
        });
    }, [type, path]);

    const message = `Bagian materi ini tidak dapat ditampilkan (jenis konten: ${String(type).slice(0, 60)}). Laporkan ke admin DCMS.`;
    if (inline) return <span className="rounded bg-amber-400/10 px-1 text-amber-200">[{message}]</span>;
    return (
        <div role="note" className="my-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-4 text-sm text-amber-100">
            {message}
        </div>
    );
}

function renderText(node, key) {
    const marks = Array.isArray(node.marks) ? node.marks : [];
    let element = node.text;
    if (marks.some((mark) => mark?.type === "bold")) element = <strong className="font-bold text-white">{element}</strong>;
    const link = marks.find((mark) => mark?.type === "link");
    const href = link ? safeLinkHref(link.attrs?.href) : null;
    if (href) {
        // target dan rel ditentukan aplikasi, bukan diambil dari dokumen.
        element = (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-semibold text-white underline decoration-[#B7FB5B] decoration-2 underline-offset-4 transition hover:decoration-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]"
            >
                {element}
            </a>
        );
    }
    return <Fragment key={key}>{element}</Fragment>;
}

function renderChildren(node, context, path, depth) {
    const allowed = CHILDREN_OF[node.type];
    const children = Array.isArray(node.content) ? node.content : [];
    return children.map((child, index) => {
        const childPath = `${path}.${index}`;
        if (!child || !allowed.has(child.type)) {
            return <UnsupportedContent key={childPath} type={child?.type ?? "invalid"} path={childPath} inline={allowed === INLINE} />;
        }
        return renderNode(child, context, childPath, depth + 1);
    });
}

function renderNode(node, context, path, depth) {
    if (depth > MAX_DOCUMENT_DEPTH) return <UnsupportedContent key={path} type="depth" path={path} inline={INLINE.has(node.type)} />;

    switch (node.type) {
        case "text":
            return typeof node.text === "string" ? renderText(node, path) : <UnsupportedContent key={path} type="text" path={path} inline />;
        case "hardBreak":
            return <br key={path} />;
        case "paragraph": {
            const children = renderChildren(node, context, path, depth);
            return <p key={path} className="my-4 leading-[1.8]">{children.length ? children : <br />}</p>;
        }
        case "heading": {
            const Tag = node.attrs?.level === 3 ? "h3" : "h2";
            const style = Tag === "h2"
                ? "mb-3 mt-10 font-nebulica text-[clamp(1.25rem,1.1rem+0.6vw,1.6rem)] font-bold leading-snug text-white"
                : "mb-2 mt-8 font-nebulica text-[clamp(1.1rem,1rem+0.4vw,1.3rem)] font-bold leading-snug text-white";
            return <Tag key={path} className={style}>{renderChildren(node, context, path, depth)}</Tag>;
        }
        case "bulletList":
            return <ul key={path} className="my-4 list-disc space-y-2 pl-6 marker:text-zinc-500">{renderChildren(node, context, path, depth)}</ul>;
        case "orderedList": {
            const start = Number.isInteger(node.attrs?.start) && node.attrs.start > 1 ? node.attrs.start : undefined;
            return <ol key={path} start={start} className="my-4 list-decimal space-y-2 pl-6 marker:text-zinc-400">{renderChildren(node, context, path, depth)}</ol>;
        }
        case "listItem":
            return <li key={path} className="pl-1 [&>p]:my-1">{renderChildren(node, context, path, depth)}</li>;
        case "image": {
            const assetId = typeof node.attrs?.assetId === "string" ? node.attrs.assetId : "";
            if (!assetId) return <UnsupportedContent key={path} type="image" path={path} />;
            const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
            return (
                <figure key={path} className="my-6">
                    <PrivateImage
                        assetId={assetId}
                        media={context.media?.[assetId]}
                        refresh={context.refreshMedia}
                        alt={alt}
                        className="h-auto w-full rounded-xl border border-white/10"
                    />
                </figure>
            );
        }
        default:
            return <UnsupportedContent key={path} type={node.type} path={path} />;
    }
}

export default function LessonRenderer({ document, schemaVersion = CONTENT_SCHEMA_VERSION, media, refreshMedia, emptyMessage = "Materi ini belum memiliki isi." }) {
    if (schemaVersion !== CONTENT_SCHEMA_VERSION) {
        return (
            <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-4 text-sm text-amber-100">
                Versi materi ({String(schemaVersion)}) belum didukung halaman ini. Muat ulang halaman; jika masih muncul, laporkan ke admin DCMS.
            </div>
        );
    }
    if (!document || document.type !== "doc") {
        return <UnsupportedContent type={document?.type ?? "empty-document"} path="doc" />;
    }
    if (!summarizeDocument(document).hasContent) {
        return <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400">{emptyMessage}</p>;
    }

    const context = { media, refreshMedia };
    const blocks = Array.isArray(document.content) ? document.content : [];
    return (
        <div className="break-words text-[1.0625rem] text-zinc-200 [overflow-wrap:anywhere] [&>*:first-child]:mt-0">
            {blocks.map((node, index) => {
                const path = `content.${index}`;
                if (!node || !BLOCK.has(node.type)) return <UnsupportedContent key={path} type={node?.type ?? "invalid"} path={path} />;
                return renderNode(node, context, path, 1);
            })}
        </div>
    );
}
