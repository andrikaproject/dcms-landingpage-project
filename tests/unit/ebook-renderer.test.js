import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/component-hooks.js";

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { default: LessonRenderer } = await import("../../components/ebooks/LessonRenderer.jsx");

// Dokumen di file ini adalah fixture pengujian.
const render = (document, props = {}) => renderToStaticMarkup(createElement(LessonRenderer, { document, media: {}, refreshMedia: async () => null, ...props }));
const paragraph = (...content) => ({ type: "paragraph", content });
const text = (value, marks) => (marks ? { type: "text", text: value, marks } : { type: "text", text: value });

test("teks berisi markup dirender sebagai teks, bukan elemen", () => {
    const html = render({ type: "doc", content: [paragraph(text("<script>alert(1)</script><img src=x onerror=alert(1)>"))] });
    assert.equal(html.includes("<script"), false);
    assert.equal(html.includes("<img"), false);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("link hanya http/https dan atribut target/rel dari aplikasi", () => {
    const html = render({
        type: "doc",
        content: [paragraph(
            text("aman", [{ type: "link", attrs: { href: "https://example.test/a", target: "_self", rel: "opener", onclick: "alert(1)" } }]),
            text(" dan "),
            text("bahaya", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]),
        )],
    });
    assert.match(html, /<a href="https:\/\/example.test\/a" target="_blank" rel="noopener noreferrer nofollow"/);
    assert.equal(html.includes("javascript:"), false);
    assert.equal(html.includes("onclick"), false);
    assert.equal(html.includes("_self"), false);
    assert.equal((html.match(/<a /g) || []).length, 1);
});

test("node tidak dikenal tampil sebagai pesan yang dapat dilaporkan", () => {
    const html = render({ type: "doc", content: [{ type: "html", attrs: { html: "<iframe src=//evil.test>" } }, paragraph(text("lanjut"))] });
    assert.match(html, /tidak dapat ditampilkan \(jenis konten: html\)/);
    assert.equal(html.includes("<iframe"), false);
    assert.match(html, /lanjut/);
});

test("node di posisi yang salah tidak dirender sebagai blok di dalam paragraf", () => {
    const html = render({ type: "doc", content: [paragraph(text("a"), { type: "image", attrs: { assetId: "x" } })] });
    assert.match(html, /<p[^>]*>a<span[^>]*>\[Bagian materi ini tidak dapat ditampilkan \(jenis konten: image\)/);
});

test("heading, daftar, dan tebal dipetakan ke elemen semantik", () => {
    const html = render({
        type: "doc",
        content: [
            { type: "heading", attrs: { level: 1 }, content: [text("Judul")] },
            { type: "heading", attrs: { level: 3 }, content: [text("Sub")] },
            { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [paragraph(text("poin", [{ type: "bold" }]))] }] },
            { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("a"), { type: "hardBreak" }, text("b"))] }] },
        ],
    });
    assert.match(html, /<h2[^>]*>Judul<\/h2>/);
    assert.match(html, /<h3[^>]*>Sub<\/h3>/);
    assert.match(html, /<ol start="3"[^>]*><li[^>]*><p[^>]*><strong[^>]*>poin<\/strong><\/p><\/li><\/ol>/);
    assert.match(html, /<ul[^>]*><li[^>]*><p[^>]*>a<br\/>b<\/p><\/li><\/ul>/);
});

test("gambar memakai URL dari map media dan alt dari dokumen", () => {
    const document = { type: "doc", content: [{ type: "image", attrs: { assetId: "a1", alt: "Grafik volume" } }] };
    const withMedia = render(document, { media: { a1: { url: "https://storage.example.test/a1.webp?sig=1", width: 800, height: 450 } } });
    assert.match(withMedia, /<img src="https:\/\/storage.example.test\/a1.webp\?sig=1" alt="Grafik volume" width="800" height="450"/);
    assert.match(withMedia, /referrerPolicy="no-referrer"|referrerpolicy="no-referrer"/i);

    const pending = render(document);
    assert.equal(pending.includes("<img"), false, "Tanpa URL, placeholder ditampilkan sambil meminta URL baru");
    assert.match(pending, /aria-busy="true"/);
});

test("versi skema lain, dokumen kosong, dan dokumen rusak memiliki state sendiri", () => {
    assert.match(render({ type: "doc", content: [paragraph(text("x"))] }, { schemaVersion: 2 }), /Versi materi \(2\) belum didukung/);
    assert.match(render({ type: "doc" }), /Materi ini belum memiliki isi/);
    assert.match(render({ type: "doc", content: [paragraph(text("   "))] }), /Materi ini belum memiliki isi/);
    assert.match(render(null), /tidak dapat ditampilkan/);
});
