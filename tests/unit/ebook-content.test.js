import assert from "node:assert/strict";
import test from "node:test";
import {
    EbookContentError,
    MAX_DOCUMENT_BYTES,
    documentSizeError,
    emptyDocument,
    isValidSlug,
    normalizeLinkInput,
    safeLinkHref,
    slugify,
    summarizeDocument,
    toContractDocument,
} from "../../lib/ebooks/content.js";
import {
    describeEbookError,
    fieldErrorsFrom,
    normalizeCompletion,
    normalizeMediaEntry,
    normalizeProgress,
    normalizeProgressReport,
    normalizeReaderEbook,
    normalizeReaderLesson,
} from "../../lib/ebooks/payload.js";

// Semua data di file ini adalah fixture pengujian, bukan data pengguna.

test("link hanya menerima http dan https dengan panjang terbatas", () => {
    assert.equal(safeLinkHref("https://dcms.example.test/materi"), "https://dcms.example.test/materi");
    assert.equal(safeLinkHref("  http://example.test  "), "http://example.test");
    for (const value of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,<script>", "mailto:a@b.test", "/relatif", "", null, 42]) {
        assert.equal(safeLinkHref(value), null, String(value));
    }
    assert.equal(safeLinkHref(`https://example.test/${"a".repeat(2048)}`), null);
});

test("input link tanpa skema diberi https, skema lain tidak diubah", () => {
    assert.equal(normalizeLinkInput("dcms.example.test/a"), "https://dcms.example.test/a");
    assert.equal(normalizeLinkInput("javascript:alert(1)"), "javascript:alert(1)");
    assert.equal(safeLinkHref(normalizeLinkInput("javascript:alert(1)")), null);
    assert.equal(normalizeLinkInput("   "), "");
});

test("JSON Tiptap dinormalisasi ke atribut yang diizinkan kontrak", () => {
    const editorJson = {
        type: "doc",
        content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Pengantar" }] },
            {
                type: "paragraph",
                content: [
                    { type: "text", text: "Baca ", marks: [{ type: "bold" }, { type: "italic" }] },
                    { type: "text", text: "sumber", marks: [{ type: "link", attrs: { href: "https://example.test", target: "_blank", rel: "noopener", class: null, title: null } }] },
                    { type: "hardBreak" },
                    { type: "text", text: "berbahaya", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
                ],
            },
            { type: "orderedList", attrs: { start: 1, type: null }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] }] },
            { type: "orderedList", attrs: { start: 3, type: "a" }, content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
            { type: "image", attrs: { assetId: "asset-1", alt: " Ilustrasi ", src: "https://signed.example.test/x?sig=1", title: null, width: 10, height: 10 } },
        ],
    };

    assert.deepEqual(toContractDocument(editorJson), {
        type: "doc",
        content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Pengantar" }] },
            {
                type: "paragraph",
                content: [
                    { type: "text", text: "Baca ", marks: [{ type: "bold" }] },
                    { type: "text", text: "sumber", marks: [{ type: "link", attrs: { href: "https://example.test" } }] },
                    { type: "hardBreak" },
                    { type: "text", text: "berbahaya" },
                ],
            },
            { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] }] },
            { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
            { type: "image", attrs: { assetId: "asset-1", alt: "Ilustrasi" } },
        ],
    });
});

test("URL sementara gambar tidak pernah ikut tersimpan", () => {
    const saved = JSON.stringify(toContractDocument({ type: "doc", content: [{ type: "image", attrs: { assetId: "asset-9", src: "https://signed.example.test/?X-Amz-Signature=abc" } }] }));
    assert.equal(saved.includes("signed.example.test"), false);
    assert.equal(saved.includes("src"), false);
});

test("node di luar allowlist ditolak dengan path", () => {
    assert.throws(() => toContractDocument({ type: "doc", content: [{ type: "codeBlock", content: [] }] }), (error) => error instanceof EbookContentError && error.path === "content.0");
    assert.throws(() => toContractDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "image", attrs: { assetId: "a" } }] }] }), EbookContentError);
    assert.throws(() => toContractDocument({ type: "doc", content: [{ type: "image", attrs: { src: "https://x.test/a.png" } }] }), /Gambar belum selesai diunggah/);
    assert.throws(() => toContractDocument({ type: "html", content: [] }), EbookContentError);
    assert.throws(() => toContractDocument({ type: "doc", content: [{ type: "image", attrs: { assetId: "a", alt: "x".repeat(301) } }] }), /300/);
});

test("heading di dalam daftar menjadi paragraf, teks tetap ada", () => {
    const result = toContractDocument({
        type: "doc",
        content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Poin" }] }] }] }],
    });
    assert.deepEqual(result.content[0].content[0].content, [{ type: "paragraph", content: [{ type: "text", text: "Poin" }] }]);
});

test("kedalaman dokumen dibatasi 20 tingkat", () => {
    let list = { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] };
    for (let index = 0; index < 12; index++) {
        list = { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }, list] }] };
    }
    assert.throws(() => toContractDocument({ type: "doc", content: [list] }), /Kedalaman/);
});

test("draft kosong tetap valid; ringkasan membedakan spasi dari isi", () => {
    assert.deepEqual(toContractDocument(emptyDocument()), { type: "doc", content: [{ type: "paragraph" }] });
    assert.deepEqual(toContractDocument({ type: "doc", content: [] }), { type: "doc" });
    assert.equal(summarizeDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "   " }] }] }).hasContent, false);
    const summary = summarizeDocument({ type: "doc", content: [{ type: "image", attrs: { assetId: "a1" } }, { type: "image", attrs: { assetId: "a1" } }] });
    assert.equal(summary.hasContent, true);
    assert.deepEqual(summary.assetIds, ["a1"]);
});

test("ukuran dokumen di atas 512 KiB ditolak sebelum dikirim", () => {
    const small = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ok" }] }] };
    assert.equal(documentSizeError(small), null);
    const large = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "é".repeat(MAX_DOCUMENT_BYTES / 2) }] }] };
    assert.match(documentSizeError(large), /512 KiB/);
});

test("slug dibuat lowercase, tanpa diakritik, maksimal 191 karakter", () => {
    assert.equal(slugify("  Dasar Trading: Candlestick & Volume  "), "dasar-trading-candlestick-volume");
    assert.equal(slugify("Café Déjà Vu"), "cafe-deja-vu");
    assert.equal(slugify("a".repeat(250)).length, 191);
    assert.equal(isValidSlug("dasar-trading"), true);
    assert.equal(isValidSlug("Dasar Trading"), false);
    assert.equal(isValidSlug("-awal"), false);
});

test("progres memakai angka BE apa adanya dan tidak dihitung ulang", () => {
    assert.deepEqual(normalizeProgress({ completedLessons: 1, totalLessons: 3, percent: 33, status: "IN_PROGRESS", lastLessonId: 7, lastActivityAt: "2026-09-22T10:00:00.000Z" }), {
        completedLessons: 1,
        totalLessons: 3,
        percent: 33,
        status: "IN_PROGRESS",
        lastLessonId: "7",
        lastActivityAt: "2026-09-22T10:00:00.000Z",
    });
    assert.equal(normalizeProgress({ completedLessons: 1, totalLessons: 3 }).percent, null);
    assert.equal(normalizeProgress({ completedLessons: 1, totalLessons: 3, percent: 33, status: "HACKED" }).status, null);
    assert.equal(normalizeProgress({ totalLessons: 3 }), null);
});

test("URL media hanya http/https", () => {
    assert.equal(normalizeMediaEntry({ url: "javascript:alert(1)" }), null);
    assert.deepEqual(normalizeMediaEntry({ url: "https://storage.example.test/a.webp?sig=1", expiresAt: "2026-09-22T10:05:00.000Z", width: 800, height: "450" }), {
        url: "https://storage.example.test/a.webp?sig=1",
        expiresAt: "2026-09-22T10:05:00.000Z",
        width: 800,
        height: 450,
    });
});

test("detail pembaca menyembunyikan bab tanpa subbab terbit", () => {
    const ebook = normalizeReaderEbook({
        ebook: {
            id: "e1",
            slug: "dasar",
            title: "Dasar",
            coverAssetId: "c1",
            chapters: [
                { id: "ch1", title: "Bab 1", lessons: [{ id: "l1", title: "Satu", completedAt: "2026-09-22T10:00:00.000Z" }, { id: "l2", title: "Dua", progress: { lastOpenedAt: "2026-09-22T09:00:00.000Z" } }] },
                { id: "ch2", title: "Bab kosong", lessons: [] },
            ],
        },
        progress: { completedLessons: 1, totalLessons: 2, percent: 50, status: "IN_PROGRESS" },
        media: { c1: { url: "https://storage.example.test/c1.webp" } },
    });
    assert.deepEqual(ebook.chapters.map((chapter) => chapter.id), ["ch1"]);
    assert.equal(ebook.chapters[0].lessons[0].completed, true);
    assert.equal(ebook.chapters[0].lessons[1].completed, false);
    assert.equal(ebook.chapters[0].lessons[1].lastOpenedAt, "2026-09-22T09:00:00.000Z");
    assert.equal(ebook.cover.media.url, "https://storage.example.test/c1.webp");
    assert.equal(ebook.progress.percent, 50);
});

test("respons lesson dan completion memakai kontrak { lesson, progress, media }", () => {
    const result = normalizeReaderLesson({
        lesson: { id: "l1", title: "Satu", content: { type: "doc" }, contentSchemaVersion: 1 },
        progress: { completedLessons: 0, totalLessons: 2, percent: 0, status: "NOT_STARTED" },
        media: { a1: { url: "https://storage.example.test/a1.webp" }, bad: { url: "data:image/png;base64,AA" } },
    });
    assert.equal(result.lesson.completed, false);
    assert.deepEqual(Object.keys(result.media), ["a1"]);
    assert.equal(normalizeReaderLesson({ lesson: {} }), null);

    const completion = normalizeCompletion({ lessonProgress: { completedAt: "2026-09-22T10:00:00.000Z" }, progress: { completedLessons: 1, totalLessons: 2, percent: 50, status: "IN_PROGRESS" } });
    assert.equal(completion.completedAt, "2026-09-22T10:00:00.000Z");
    assert.equal(completion.progress.percent, 50);
});

test("row laporan memakai accountType + userId, bukan email", () => {
    const report = normalizeProgressReport({
        items: [
            { accountType: "USER", userId: 1, name: "Sama", email: "sama@example.test", completedLessons: 0, totalLessons: 4, percent: 0, status: "NOT_STARTED" },
            { accountType: "BITUNIX", userId: "1", name: "Sama", email: "sama@example.test", progress: { completedLessons: 2, totalLessons: 4, percent: 50, status: "IN_PROGRESS", lastLessonId: "l2" }, lastLessonTitle: "Dua" },
        ],
        page: 1,
        limit: 25,
        total: 30,
    });
    assert.deepEqual(report.items.map((row) => row.key), ["USER:1", "BITUNIX:1"]);
    assert.equal(report.items[0].lastLesson, null);
    assert.deepEqual(report.items[1].lastLesson, { id: "l2", title: "Dua" });
    assert.equal(report.totalPages, 2);
    assert.equal(report.hasMore, true);
});

test("error API diterjemahkan ke pesan dan field", () => {
    assert.match(describeEbookError({ status: 0, code: "NETWORK_ERROR" }), /terhubung/);
    assert.match(describeEbookError({ status: 503, code: "MEDIA_STORAGE_UNAVAILABLE" }), /Penyimpanan gambar/);
    assert.equal(describeEbookError({ status: 409, message: "Cover belum siap." }), "Cover belum siap.");
    assert.deepEqual(fieldErrorsFrom({ details: { formErrors: [], fieldErrors: { title: ["Judul wajib diisi."] } } }), { title: "Judul wajib diisi." });
    assert.deepEqual(fieldErrorsFrom({ message: "Slug sudah dipakai.", details: { field: "slug" } }), { slug: "Slug sudah dipakai." });
    assert.deepEqual(fieldErrorsFrom({ details: null }), {});
});
