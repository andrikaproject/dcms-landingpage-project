import assert from "node:assert/strict";
import test from "node:test";
import {
    adjacentLessons,
    createIdentityCache,
    identityOf,
    initialReaderState,
    markLessonCompleted,
    readerReducer,
    resumeTarget,
} from "../../lib/ebooks/reader-state.js";

// Fixture pengujian, bukan data pengguna.
const lessonData = (id, completed = false) => ({
    lesson: { id, title: `Subbab ${id}`, completed, completedAt: completed ? "2026-09-22T09:00:00.000Z" : null },
    progress: { completedLessons: completed ? 1 : 0, totalLessons: 3, percent: completed ? 33 : 0, status: completed ? "IN_PROGRESS" : "NOT_STARTED" },
    media: {},
});

function reduce(state, ...actions) {
    return actions.reduce(readerReducer, state);
}

test("gagal simpan menampilkan error, retry berhasil menjadi saved", () => {
    let state = reduce(initialReaderState("l1"), { type: "loaded", lessonId: "l1", data: lessonData("l1") });
    assert.equal(state.completion, "idle");

    state = reduce(state, { type: "completeStart", lessonId: "l1" });
    assert.equal(state.completion, "saving");
    state = reduce(state, { type: "completeFailed", lessonId: "l1", message: "Tidak dapat terhubung ke server." });
    assert.equal(state.completion, "error");
    assert.equal(state.completedAt, null, "Error tidak boleh terlihat sebagai selesai");

    state = reduce(state, { type: "completeStart", lessonId: "l1" });
    assert.equal(state.completion, "saving");
    assert.equal(state.completionError, null);
    state = reduce(state, {
        type: "completeSucceeded",
        lessonId: "l1",
        completedAt: "2026-09-22T10:00:00.000Z",
        progress: { completedLessons: 1, totalLessons: 3, percent: 33, status: "IN_PROGRESS" },
    });
    assert.equal(state.completion, "saved");
    assert.equal(state.completedAt, "2026-09-22T10:00:00.000Z");
    assert.equal(state.progress.percent, 33, "Summary dipakai dari respons BE");
});

test("respons dari lesson yang sudah ditinggalkan diabaikan", () => {
    const current = reduce(initialReaderState("l2"), { type: "loaded", lessonId: "l2", data: lessonData("l2") });
    assert.equal(reduce(current, { type: "loaded", lessonId: "l1", data: lessonData("l1", true) }), current);
    assert.equal(reduce(current, { type: "loadFailed", lessonId: "l1", message: "404" }), current);
    assert.equal(reduce(current, { type: "completeSucceeded", lessonId: "l1", completedAt: "2026-09-22T10:00:00.000Z" }), current);
    assert.equal(reduce(current, { type: "completeFailed", lessonId: "l1", message: "x" }), current);
});

test("klik ganda dan sukses tanpa request berjalan tidak mengubah state", () => {
    let state = reduce(initialReaderState("l1"), { type: "loaded", lessonId: "l1", data: lessonData("l1") });
    const saving = reduce(state, { type: "completeStart", lessonId: "l1" });
    assert.equal(reduce(saving, { type: "completeStart", lessonId: "l1" }), saving);

    state = reduce(state, { type: "completeSucceeded", lessonId: "l1", completedAt: "2026-09-22T10:00:00.000Z" });
    assert.equal(state.completion, "idle", "Sukses tanpa completeStart diabaikan");
    assert.equal(reduce(initialReaderState("l1"), { type: "completeStart", lessonId: "l1" }).completion, "idle", "Belum dimuat tidak bisa diselesaikan");
});

test("membuka ulang lesson selesai tetap saved dan tidak bisa dikirim ulang", () => {
    const state = reduce(initialReaderState("l1"), { type: "loaded", lessonId: "l1", data: lessonData("l1", true) });
    assert.equal(state.completion, "saved");
    assert.equal(reduce(state, { type: "completeStart", lessonId: "l1" }), state);
});

test("gagal muat dapat dicoba ulang", () => {
    let state = reduce(initialReaderState("l1"), { type: "loadFailed", lessonId: "l1", message: "Server bermasalah" });
    assert.equal(state.load, "error");
    state = reduce(state, { type: "retryLoad", lessonId: "l1" });
    assert.equal(state.load, "loading");
    state = reduce(state, { type: "loaded", lessonId: "l1", data: lessonData("l1") });
    assert.equal(state.load, "ready");
});

const chapters = [
    { id: "c1", title: "Bab 1", lessons: [{ id: "l1", title: "Satu", completed: true, lastOpenedAt: "2026-09-22T08:00:00.000Z" }, { id: "l2", title: "Dua", completed: false, lastOpenedAt: null }] },
    { id: "c2", title: "Bab 2", lessons: [{ id: "l3", title: "Tiga", completed: false, lastOpenedAt: null }] },
];

test("navigasi subbab melintasi batas bab", () => {
    const middle = adjacentLessons(chapters, "l2");
    assert.equal(middle.previous.id, "l1");
    assert.equal(middle.next.id, "l3");
    assert.equal(middle.next.chapterTitle, "Bab 2");
    assert.equal(middle.position, 2);
    assert.equal(middle.total, 3);
    assert.equal(adjacentLessons(chapters, "l1").previous, null);
    assert.equal(adjacentLessons(chapters, "l3").next, null);
    assert.equal(adjacentLessons(chapters, "hilang").current, null);
});

test("tombol lanjut memilih subbab terakhir dibuka yang belum selesai", () => {
    assert.equal(resumeTarget({ chapters, progress: { lastLessonId: "l3" } }).lesson.id, "l3");
    assert.deepEqual(resumeTarget({ chapters, progress: { lastLessonId: "l1" } }).lesson.id, "l2");
    const fresh = chapters.map((chapter) => ({ ...chapter, lessons: chapter.lessons.map((lesson) => ({ ...lesson, completed: false, lastOpenedAt: null })) }));
    assert.deepEqual(resumeTarget({ chapters: fresh, progress: null }).label, "Mulai membaca");
    const done = chapters.map((chapter) => ({ ...chapter, lessons: chapter.lessons.map((lesson) => ({ ...lesson, completed: true })) }));
    assert.deepEqual(resumeTarget({ chapters: done, progress: null }), { lesson: { ...done[0].lessons[0], chapterId: "c1", chapterTitle: "Bab 1" }, label: "Baca dari awal" });
    assert.equal(resumeTarget({ chapters: [] }), null);
});

test("penyelesaian memperbarui navigasi dengan summary dari BE", () => {
    const ebook = { id: "e1", progress: { completedLessons: 1, totalLessons: 3, percent: 33 }, chapters };
    const updated = markLessonCompleted(ebook, "l2", { completedAt: "2026-09-22T10:00:00.000Z", progress: { completedLessons: 2, totalLessons: 3, percent: 66 } });
    assert.equal(updated.chapters[0].lessons[1].completed, true);
    assert.equal(updated.progress.percent, 66);
    assert.equal(ebook.chapters[0].lessons[1].completed, false, "Objek asal tidak dimutasi");
});

test("cache tidak membocorkan data akun A ke akun B", () => {
    const cache = createIdentityCache();
    const accountA = identityOf({ sub: "7", accountType: "USER" });
    const accountB = identityOf({ sub: "7", accountType: "BITUNIX" });
    assert.notEqual(accountA, accountB, "ID sama dengan jenis akun berbeda adalah identitas berbeda");

    cache.set("catalog", accountA, [{ id: "e1", progress: { percent: 50 } }]);
    assert.equal(cache.get("catalog", accountB), undefined);
    cache.set("detail:dasar", accountB, { id: "e1" });
    assert.equal(cache.get("catalog", accountA), undefined, "Pergantian pemilik mengosongkan cache lama");
    assert.equal(cache.size, 1);

    cache.syncIdentity(null);
    assert.equal(cache.size, 0, "Logout mengosongkan cache");
    assert.equal(identityOf(null), null);
});
