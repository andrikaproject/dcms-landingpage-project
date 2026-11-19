// Normalisasi respons API ebook ke bentuk yang dipakai komponen. Persentase dan
// status progres selalu diambil dari BE; tidak ada perhitungan ulang di sini.
import { CONTENT_SCHEMA_VERSION } from "./content.js";

const PROGRESS_STATUSES = new Set(["EMPTY", "NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);
const CONTENT_STATUSES = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const PROGRESS_STATUS_LABELS = {
    EMPTY: "Belum ada materi",
    NOT_STARTED: "Belum mulai",
    IN_PROGRESS: "Sedang membaca",
    COMPLETED: "Selesai",
};

export const CONTENT_STATUS_LABELS = {
    DRAFT: "Draft",
    PUBLISHED: "Terbit",
    ARCHIVED: "Arsip",
};

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function asId(value) {
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return null;
}

const asText = (value) => (typeof value === "string" ? value : "");

function asCount(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : null;
}

function asDate(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function asPositiveInt(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

function listFrom(payload, ...keys) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
        if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
}

export function normalizeProgress(value) {
    if (!isObject(value)) return null;
    const completedLessons = asCount(value.completedLessons);
    const totalLessons = asCount(value.totalLessons);
    if (completedLessons === null || totalLessons === null) return null;
    const percent = Number(value.percent);
    return {
        completedLessons,
        totalLessons,
        percent: Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : null,
        status: PROGRESS_STATUSES.has(value.status) ? value.status : null,
        lastLessonId: asId(value.lastLessonId),
        lastActivityAt: asDate(value.lastActivityAt),
    };
}

export function normalizeMediaEntry(entry) {
    if (!isObject(entry) || typeof entry.url !== "string" || !/^https?:\/\//i.test(entry.url)) return null;
    return {
        url: entry.url,
        expiresAt: asDate(entry.expiresAt),
        width: asPositiveInt(entry.width),
        height: asPositiveInt(entry.height),
    };
}

export function normalizeMediaMap(media) {
    const map = {};
    if (!isObject(media)) return map;
    for (const [assetId, entry] of Object.entries(media)) {
        const normalized = normalizeMediaEntry(entry);
        if (normalized) map[assetId] = normalized;
    }
    return map;
}

function normalizeCover(raw, media) {
    const cover = isObject(raw?.cover) ? raw.cover : null;
    const assetId = asId(cover?.assetId ?? raw?.coverAssetId);
    if (!assetId) return null;
    return { assetId, media: normalizeMediaEntry(cover) ?? media[assetId] ?? null };
}

// Waktu buka/selesai per subbab bisa dikirim langsung pada lesson atau di bawah
// lesson.progress. Keduanya dibaca apa adanya.
function lessonActivity(raw) {
    const source = isObject(raw?.progress) ? raw.progress : raw;
    const completedAt = asDate(source?.completedAt);
    return {
        completedAt,
        completed: Boolean(completedAt) || source?.completed === true,
        firstOpenedAt: asDate(source?.firstOpenedAt),
        lastOpenedAt: asDate(source?.lastOpenedAt),
    };
}

function normalizeEbookSummary(raw, media) {
    const id = asId(raw?.id);
    const slug = asId(raw?.slug);
    if (!id || !slug) return null;
    return {
        id,
        slug,
        title: asText(raw.title),
        description: asText(raw.description),
        cover: normalizeCover(raw, media),
        progress: normalizeProgress(raw.progress),
    };
}

export function normalizeCatalog(payload) {
    const media = normalizeMediaMap(payload?.media);
    return listFrom(payload, "items", "ebooks").map((raw) => normalizeEbookSummary(raw, media)).filter(Boolean);
}

export function normalizeReaderEbook(payload) {
    const raw = isObject(payload?.ebook) ? payload.ebook : payload;
    const media = { ...normalizeMediaMap(raw?.media), ...normalizeMediaMap(payload?.media) };
    const summary = normalizeEbookSummary(raw, media);
    if (!summary) return null;
    const chapters = listFrom(raw.chapters).map((chapter) => ({
        id: asId(chapter?.id),
        title: asText(chapter?.title),
        lessons: listFrom(chapter?.lessons).map((lesson) => {
            const id = asId(lesson?.id);
            return id ? { id, title: asText(lesson.title), ...lessonActivity(lesson) } : null;
        }).filter(Boolean),
    // Bab tanpa subbab terbit tidak ditampilkan pada pembaca.
    })).filter((chapter) => chapter.id && chapter.lessons.length > 0);
    return { ...summary, progress: normalizeProgress(payload?.progress) ?? summary.progress, chapters };
}

export function normalizeReaderLesson(payload) {
    const raw = payload?.lesson;
    const id = asId(raw?.id);
    if (!id) return null;
    return {
        lesson: {
            id,
            title: asText(raw.title),
            chapterId: asId(raw.chapterId),
            content: raw.content ?? raw.contentJson ?? null,
            schemaVersion: Number(raw.contentSchemaVersion ?? CONTENT_SCHEMA_VERSION),
            ...lessonActivity(payload.lessonProgress ?? raw),
        },
        progress: normalizeProgress(payload.progress),
        media: normalizeMediaMap(payload.media),
    };
}

export function normalizeCompletion(payload) {
    const source = payload?.lessonProgress ?? payload?.lesson ?? payload;
    return {
        completedAt: lessonActivity(source).completedAt ?? asDate(payload?.completedAt),
        progress: normalizeProgress(payload?.progress),
    };
}

function normalizeStatus(value) {
    return CONTENT_STATUSES.has(value) ? value : "DRAFT";
}

function normalizeAdminLessonItem(raw) {
    const id = asId(raw?.id);
    if (!id) return null;
    return {
        id,
        title: asText(raw.title),
        status: normalizeStatus(raw.status),
        updatedAt: asDate(raw.updatedAt),
        publishedAt: asDate(raw.publishedAt),
    };
}

export function normalizeAdminEbookList(payload) {
    const media = normalizeMediaMap(payload?.media);
    return listFrom(payload, "items", "ebooks").map((raw) => {
        const id = asId(raw?.id);
        if (!id) return null;
        return {
            id,
            slug: asText(raw.slug),
            title: asText(raw.title),
            status: normalizeStatus(raw.status),
            cover: normalizeCover(raw, media),
            updatedAt: asDate(raw.updatedAt),
            publishedAt: asDate(raw.publishedAt),
        };
    }).filter(Boolean);
}

export function normalizeAdminEbook(payload) {
    const raw = isObject(payload?.ebook) ? payload.ebook : payload;
    const id = asId(raw?.id);
    if (!id) return null;
    const media = { ...normalizeMediaMap(raw.media), ...normalizeMediaMap(payload?.media) };
    return {
        id,
        slug: asText(raw.slug),
        title: asText(raw.title),
        description: asText(raw.description),
        status: normalizeStatus(raw.status),
        cover: normalizeCover(raw, media),
        updatedAt: asDate(raw.updatedAt),
        publishedAt: asDate(raw.publishedAt),
        chapters: listFrom(raw.chapters).map((chapter) => {
            const chapterId = asId(chapter?.id);
            return chapterId ? {
                id: chapterId,
                title: asText(chapter.title),
                lessons: listFrom(chapter.lessons).map(normalizeAdminLessonItem).filter(Boolean),
            } : null;
        }).filter(Boolean),
    };
}

export function normalizeAdminChapter(payload) {
    const raw = isObject(payload?.chapter) ? payload.chapter : payload;
    const id = asId(raw?.id);
    return id ? { id, title: asText(raw.title), lessons: listFrom(raw.lessons).map(normalizeAdminLessonItem).filter(Boolean) } : null;
}

export function normalizeAdminLesson(payload) {
    const raw = isObject(payload?.lesson) ? payload.lesson : payload;
    const item = normalizeAdminLessonItem(raw);
    if (!item) return null;
    return {
        lesson: {
            ...item,
            chapterId: asId(raw.chapterId),
            content: raw.content ?? raw.contentJson ?? null,
            schemaVersion: Number(raw.contentSchemaVersion ?? CONTENT_SCHEMA_VERSION),
        },
        media: normalizeMediaMap(payload?.media),
    };
}

// Row laporan diidentifikasi accountType + userId. Email bukan identitas.
export function reportRowKey(row) {
    return `${row.accountType}:${row.userId}`;
}

function normalizeReportUser(raw) {
    const accountType = asId(raw?.accountType);
    const userId = asId(raw?.userId);
    if (!accountType || !userId) return null;
    return { accountType, userId, name: asText(raw.name), email: asText(raw.email) };
}

export function normalizeProgressReport(payload, request = {}) {
    const items = listFrom(payload, "items", "users").map((raw) => {
        const user = normalizeReportUser(raw?.user ? { ...raw.user, accountType: raw.user.accountType ?? raw.accountType, userId: raw.user.userId ?? raw.userId } : raw);
        if (!user) return null;
        const progress = normalizeProgress(raw.progress ?? raw);
        const lastLessonId = asId(raw.lastLesson?.id ?? raw.lastLessonId ?? progress?.lastLessonId);
        return {
            ...user,
            key: reportRowKey(user),
            progress,
            lastLesson: lastLessonId ? { id: lastLessonId, title: asText(raw.lastLesson?.title ?? raw.lastLessonTitle) } : null,
            lastActivityAt: progress?.lastActivityAt ?? asDate(raw.lastActivityAt),
        };
    }).filter(Boolean);

    const pagination = isObject(payload?.pagination) ? payload.pagination : payload;
    const page = asPositiveInt(pagination?.page) ?? request.page ?? 1;
    const limit = asPositiveInt(pagination?.limit) ?? request.limit ?? items.length;
    const total = asCount(pagination?.total);
    const totalPages = asPositiveInt(pagination?.totalPages) ?? (total !== null && limit ? Math.max(1, Math.ceil(total / limit)) : null);
    const hasMore = typeof pagination?.hasMore === "boolean" ? pagination.hasMore : totalPages !== null ? page < totalPages : false;
    return { items, page, limit, total, totalPages, hasMore };
}

export function normalizeUserProgressDetail(payload) {
    const user = normalizeReportUser(payload?.user ? { ...payload.user, accountType: payload.user.accountType ?? payload.accountType, userId: payload.user.userId ?? payload.userId } : payload);
    if (!user) return null;
    const ebook = isObject(payload?.ebook) ? payload.ebook : payload;
    return {
        user,
        progress: normalizeProgress(payload.progress),
        chapters: listFrom(ebook, "chapters").map((chapter) => ({
            id: asId(chapter?.id),
            title: asText(chapter?.title),
            lessons: listFrom(chapter?.lessons).map((lesson) => {
                const id = asId(lesson?.id);
                return id ? { id, title: asText(lesson.title), ...lessonActivity(lesson) } : null;
            }).filter(Boolean),
        })).filter((chapter) => chapter.id),
    };
}

// Zod flatten ({ fieldErrors }) dan detail per field dari service BE sama-sama
// dipetakan ke { field: pesan } untuk ditampilkan di samping input.
export function fieldErrorsFrom(error) {
    const details = error?.details;
    if (!isObject(details)) return {};
    const source = isObject(details.fieldErrors) ? details.fieldErrors : isObject(details.fields) ? details.fields : null;
    const result = {};
    if (source) {
        for (const [field, value] of Object.entries(source)) {
            const message = Array.isArray(value) ? value[0] : value;
            if (typeof message === "string" && message) result[field] = message;
        }
    }
    if (typeof details.field === "string" && typeof error.message === "string") result[details.field] = error.message;
    return result;
}

export function describeEbookError(error, fallback = "Terjadi kesalahan. Coba lagi.") {
    const status = Number(error?.status);
    if (error?.code === "NETWORK_ERROR" || status === 0) return "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.";
    if (status === 401) return "Sesi berakhir. Masuk lagi untuk melanjutkan.";
    if (status === 403) return "Akun ini tidak memiliki akses untuk tindakan tersebut.";
    if (status === 404) return "Konten tidak ditemukan atau belum diterbitkan.";
    if (error?.code === "MEDIA_STORAGE_UNAVAILABLE") return "Penyimpanan gambar belum dikonfigurasi di server.";
    if (status >= 500) return "Server sedang bermasalah. Coba lagi beberapa saat lagi.";
    return (typeof error?.message === "string" && error.message) || fallback;
}
