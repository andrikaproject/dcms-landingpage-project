// Riwayat chat AI Agent disimpan di browser, per akun dan per pair. Agent di
// server tidak menyimpan percakapan, jadi tanpa ini chat hilang saat halaman
// ditinggalkan. Semua pair satu akun ada di satu kunci supaya mudah dipangkas.

const PREFIX = "dcms-ai-chat:v1";
export const MAX_SAVED_PAIRS = 10;
export const MAX_SAVED_MESSAGES = 30;
export const HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function resolveStorage(storage) {
    if (storage) return storage;
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

export function historyKey(user) {
    const id = user?.id || user?.sub;
    return id ? `${PREFIX}:${user.accountType || "user"}:${id}` : null;
}

function readAll(storage, key) {
    try {
        const parsed = JSON.parse(storage.getItem(key) || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function writeAll(storage, key, all) {
    if (!Object.keys(all).length) {
        storage.removeItem(key);
        return;
    }
    try {
        storage.setItem(key, JSON.stringify(all));
    } catch {
        // Storage penuh: buang separuh percakapan terlama lalu coba sekali lagi.
        const newest = Object.entries(all)
            .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
            .slice(0, Math.max(1, Math.floor(Object.keys(all).length / 2)));
        try {
            storage.setItem(key, JSON.stringify(Object.fromEntries(newest)));
        } catch {
            // Tetap gagal: chat hanya bertahan selama halaman terbuka.
        }
    }
}

function cleanMessage(raw) {
    if (!raw || (raw.role !== "user" && raw.role !== "assistant") || typeof raw.content !== "string" || raw.failed) return null;
    const message = { role: raw.role, content: raw.content };
    if (Number.isFinite(raw.at)) message.at = raw.at;
    if (raw.role === "assistant") {
        message.charts = Array.isArray(raw.charts) ? raw.charts.filter((name) => typeof name === "string") : [];
        message.plan = raw.plan && typeof raw.plan === "object" ? raw.plan : null;
        if (raw.focus) message.focus = String(raw.focus);
    }
    return message;
}

// Pesan gagal dan pertanyaan terakhir yang belum dijawab tidak ikut disimpan.
export function sanitizeMessages(messages) {
    const clean = (Array.isArray(messages) ? messages : []).map(cleanMessage).filter(Boolean);
    while (clean.length && clean.at(-1).role === "user") clean.pop();
    return clean.slice(-MAX_SAVED_MESSAGES);
}

function fresh(entry, now) {
    return entry && Number.isFinite(entry.updatedAt) && now - entry.updatedAt < HISTORY_TTL_MS;
}

export function loadConversation(key, symbol, { storage, now = Date.now() } = {}) {
    const store = resolveStorage(storage);
    if (!store || !key || !symbol) return null;
    const entry = readAll(store, key)[symbol];
    if (!fresh(entry, now)) return null;
    const messages = sanitizeMessages(entry.messages);
    return messages.length ? { focus: entry.focus || null, messages, updatedAt: entry.updatedAt } : null;
}

export function saveConversation(key, symbol, { focus, messages }, { storage, now = Date.now() } = {}) {
    const store = resolveStorage(storage);
    if (!store || !key || !symbol) return;
    const all = Object.fromEntries(Object.entries(readAll(store, key)).filter(([, entry]) => fresh(entry, now)));
    const clean = sanitizeMessages(messages);
    if (clean.length) all[symbol] = { focus: focus || null, messages: clean, updatedAt: now };
    else delete all[symbol];
    const kept = Object.entries(all)
        .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_SAVED_PAIRS);
    writeAll(store, key, Object.fromEntries(kept));
}

export function describeSavedAt(timestamp, now = Date.now()) {
    const minutes = Math.floor((now - timestamp) / 60_000);
    if (minutes < 1) return "baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "kemarin" : `${days} hari lalu`;
}
