// Data Panel admin. Semua angka berasal dari respons API apa adanya; helper ini
// hanya merangkum dan memformat, tidak pernah mengisi nilai yang tidak ada.

export const MEMBERS_PER_PAGE = 10;

export function summarizeEbooks(items) {
    const summary = { draft: 0, published: 0, archived: 0, total: 0 };
    for (const item of Array.isArray(items) ? items : []) {
        summary.total += 1;
        if (item?.status === "PUBLISHED") summary.published += 1;
        else if (item?.status === "ARCHIVED") summary.archived += 1;
        else summary.draft += 1;
    }
    return summary;
}

export function describeEbooks(summary) {
    if (!summary.total) return "Belum ada ebook";
    return `${summary.draft} draft · ${summary.published} terbit`;
}

// /admin/logs/days sudah urut dari tanggal terbaru.
export function latestLogDay(days) {
    const day = Array.isArray(days) ? days.find((item) => typeof item?.date === "string") : null;
    if (!day) return null;
    return {
        date: day.date,
        errors: Number(day.errors) || 0,
        warnings: Number(day.warnings) || 0,
    };
}

export function formatDay(date) {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(parsed);
}

export function describeLogDay(day) {
    if (!day) return "Belum ada log";
    const parts = [`${day.errors} error`];
    if (day.warnings) parts.push(`${day.warnings} warning`);
    return `${parts.join(", ")} · ${formatDay(day.date)}`;
}

export function normalizeMembers(payload) {
    const list = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload?.items) ? payload.items : [];
    return list
        .filter((item) => item && item.id !== undefined && item.id !== null)
        .map((item) => ({
            id: String(item.id),
            name: typeof item.name === "string" ? item.name.trim() : "",
            email: typeof item.email === "string" ? item.email : "",
            uuidBitunix: item.uuidBitunix ? String(item.uuidBitunix) : "",
            status: typeof item.bitunixStatus === "string" ? item.bitunixStatus : "",
            depositUsdt: item.amountUsdt === null || item.amountUsdt === undefined || item.amountUsdt === "" ? null : Number(item.amountUsdt),
            createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
        }));
}

export function filterMembers(members, query) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) => [member.name, member.email, member.uuidBitunix].some((value) => value.toLowerCase().includes(needle)));
}

export function pageOf(items, page, size = MEMBERS_PER_PAGE) {
    const pages = Math.max(1, Math.ceil(items.length / size));
    const current = Math.min(Math.max(1, page), pages);
    return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}

export function formatUsdt(value) {
    if (value === null || !Number.isFinite(value)) return "–";
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

export function formatJoined(iso) {
    if (!iso) return "–";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "–";
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

const STATUS_LABELS = { VERIFIED: "Terverifikasi", PENDING: "Menunggu", REJECTED: "Ditolak", UNVERIFIED: "Belum terverifikasi" };

export function memberStatus(status) {
    return {
        label: STATUS_LABELS[status] || status || "–",
        tone: status === "VERIFIED" ? "ok" : status === "REJECTED" ? "danger" : "neutral",
    };
}
