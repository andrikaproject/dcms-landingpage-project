// Wrapper endpoint ebook sesuai kontrak v1. Autentikasi, refresh token, dan
// envelope { ok, data } ditangani apiRequest; modul ini tidak menyimpan token.
import { apiRequest } from "@/lib/api/client";
import {
    normalizeAdminChapter,
    normalizeAdminEbook,
    normalizeAdminEbookList,
    normalizeAdminLesson,
    normalizeCatalog,
    normalizeCompletion,
    normalizeMediaEntry,
    normalizeProgressReport,
    normalizeReaderEbook,
    normalizeReaderLesson,
    normalizeUserProgressDetail,
} from "./payload";

const segment = encodeURIComponent;
const privateGet = (path, { signal, query } = {}) => apiRequest(path, { cache: "no-store", signal, query });

function required(value, message) {
    if (!value) throw new Error(message);
    return value;
}

// Pembaca

export async function fetchCatalog({ signal } = {}) {
    return normalizeCatalog(await privateGet("/ebooks", { signal }));
}

export async function fetchReaderEbook(slug, { signal } = {}) {
    return required(normalizeReaderEbook(await privateGet(`/ebooks/${segment(slug)}`, { signal })), "Respons detail ebook tidak lengkap.");
}

export async function fetchReaderLesson(slug, lessonId, { signal } = {}) {
    return required(
        normalizeReaderLesson(await privateGet(`/ebooks/${segment(slug)}/lessons/${segment(lessonId)}`, { signal })),
        "Respons materi tidak lengkap."
    );
}

export async function recordLessonOpen(slug, lessonId, { signal } = {}) {
    return apiRequest(`/ebooks/${segment(slug)}/lessons/${segment(lessonId)}/open`, { method: "POST", cache: "no-store", signal });
}

export async function completeLesson(slug, lessonId, { signal } = {}) {
    return normalizeCompletion(await apiRequest(`/ebooks/${segment(slug)}/lessons/${segment(lessonId)}/completion`, {
        method: "PUT",
        cache: "no-store",
        signal,
    }));
}

export async function refreshReaderMedia(slug, assetId, { signal } = {}) {
    return normalizeMediaEntry(await privateGet(`/ebooks/${segment(slug)}/media/${segment(assetId)}`, { signal }));
}

// Admin CMS

export async function fetchAdminEbooks({ signal } = {}) {
    return normalizeAdminEbookList(await privateGet("/admin/ebooks", { signal }));
}

export async function createAdminEbook(body) {
    return required(normalizeAdminEbook(await apiRequest("/admin/ebooks", { method: "POST", body })), "Respons pembuatan ebook tidak lengkap.");
}

export async function fetchAdminEbook(ebookId, { signal } = {}) {
    return required(normalizeAdminEbook(await privateGet(`/admin/ebooks/${segment(ebookId)}`, { signal })), "Respons ebook tidak lengkap.");
}

export async function updateAdminEbook(ebookId, body) {
    return required(normalizeAdminEbook(await apiRequest(`/admin/ebooks/${segment(ebookId)}`, { method: "PATCH", body })), "Respons ebook tidak lengkap.");
}

export async function createAdminChapter(ebookId, body) {
    return required(normalizeAdminChapter(await apiRequest(`/admin/ebooks/${segment(ebookId)}/chapters`, { method: "POST", body })), "Respons bab tidak lengkap.");
}

export async function updateAdminChapter(ebookId, chapterId, body) {
    return normalizeAdminChapter(await apiRequest(`/admin/ebooks/${segment(ebookId)}/chapters/${segment(chapterId)}`, { method: "PATCH", body }));
}

export async function reorderAdminChapters(ebookId, ids) {
    return apiRequest(`/admin/ebooks/${segment(ebookId)}/chapter-order`, { method: "PUT", body: { ids } });
}

export async function createAdminLesson(ebookId, chapterId, body) {
    const result = normalizeAdminLesson(await apiRequest(`/admin/ebooks/${segment(ebookId)}/chapters/${segment(chapterId)}/lessons`, { method: "POST", body }));
    return required(result, "Respons subbab tidak lengkap.").lesson;
}

export async function reorderAdminLessons(ebookId, chapterId, ids) {
    return apiRequest(`/admin/ebooks/${segment(ebookId)}/chapters/${segment(chapterId)}/lesson-order`, { method: "PUT", body: { ids } });
}

export async function fetchAdminLesson(ebookId, lessonId, { signal } = {}) {
    return required(normalizeAdminLesson(await privateGet(`/admin/ebooks/${segment(ebookId)}/lessons/${segment(lessonId)}`, { signal })), "Respons subbab tidak lengkap.");
}

export async function updateAdminLesson(ebookId, lessonId, body) {
    return required(normalizeAdminLesson(await apiRequest(`/admin/ebooks/${segment(ebookId)}/lessons/${segment(lessonId)}`, { method: "PATCH", body })), "Respons subbab tidak lengkap.");
}

// Laporan progres

export async function fetchProgressReport(ebookId, { q, page = 1, limit = 25, signal } = {}) {
    const payload = await privateGet(`/admin/ebooks/${segment(ebookId)}/progress`, { signal, query: { q, page, limit } });
    return normalizeProgressReport(payload, { page, limit });
}

export async function fetchUserProgress(ebookId, accountType, userId, { signal } = {}) {
    return required(
        normalizeUserProgressDetail(await privateGet(`/admin/ebooks/${segment(ebookId)}/progress/${segment(accountType)}/${segment(userId)}`, { signal })),
        "Respons detail progres tidak lengkap."
    );
}

// Media admin

export const mediaApi = {
    startUpload: (body, { signal } = {}) => apiRequest("/admin/media/uploads", { method: "POST", body, signal }),
    completeUpload: (assetId, { signal } = {}) => apiRequest(`/admin/media/uploads/${segment(assetId)}/complete`, { method: "POST", signal }),
};

export async function refreshAdminMedia(assetId, { signal } = {}) {
    return normalizeMediaEntry(await privateGet(`/admin/media/${segment(assetId)}`, { signal }));
}
