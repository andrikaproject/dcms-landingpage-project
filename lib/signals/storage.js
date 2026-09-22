// localStorage hanya menyimpan identitas dan preferensi kartu. Level rencana dan
// status selalu dipulihkan dari server, bukan dari cache browser.

const BOARD_PREFIX = "dcms-dashboard-signal-board";
const CACHE_VERSION = 2;

export function boardCacheKey(timeframe) {
    return `${BOARD_PREFIX}:v${CACHE_VERSION}:${timeframe}`;
}

export function legacyBoardKey(timeframe) {
    return `${BOARD_PREFIX}:${timeframe}`;
}

export function legacyRemovedKey(timeframe) {
    return `${BOARD_PREFIX}:removed:${timeframe}`;
}

function resolveStorage(storage) {
    if (storage) return storage;
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function readJson(storage, key, fallback) {
    if (!storage) return fallback;
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(storage, key, value) {
    if (!storage) return false;
    try {
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function normalizeCard(raw) {
    if (!raw || typeof raw !== "object") return null;
    const symbol = raw.symbol ? String(raw.symbol) : null;
    const signalId = raw.signalId ? String(raw.signalId) : null;
    if (!symbol && !signalId) return null;

    return {
        signalId,
        symbol,
        timeframe: raw.timeframe ? String(raw.timeframe) : null,
        addedAt: raw.addedAt ? String(raw.addedAt) : null,
        isLegacy: signalId === null,
    };
}

function normalizeCache(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.cards)) return null;

    return {
        version: CACHE_VERSION,
        cards: raw.cards.map(normalizeCard).filter(Boolean),
        hidden: Array.isArray(raw.hidden) ? raw.hidden.map(normalizeCard).filter(Boolean) : [],
    };
}

// Kartu lama hanya menyimpan symbol, padahal satu symbol bisa punya beberapa
// rencana. Migrasi menyalin identitas lama tanpa menghapus data lama.
export function migrateBoardCache(timeframe, storage) {
    const store = resolveStorage(storage);
    const existing = normalizeCache(readJson(store, boardCacheKey(timeframe), null));
    if (existing) return { cache: existing, migrated: false };

    const legacySignals = readJson(store, legacyBoardKey(timeframe), []);
    const legacyRemoved = readJson(store, legacyRemovedKey(timeframe), []);

    const cache = {
        version: CACHE_VERSION,
        cards: (Array.isArray(legacySignals) ? legacySignals : [])
            .map((signal) => normalizeCard({ symbol: signal?.symbol, timeframe, addedAt: signal?.updatedAt || null }))
            .filter(Boolean),
        hidden: (Array.isArray(legacyRemoved) ? legacyRemoved : [])
            .map((symbol) => normalizeCard({ symbol, timeframe }))
            .filter(Boolean),
    };

    writeJson(store, boardCacheKey(timeframe), cache);
    return { cache, migrated: true };
}

export function readBoardCache(timeframe, storage) {
    return migrateBoardCache(timeframe, storage).cache;
}

export function writeBoardCache(timeframe, cache, storage) {
    return writeJson(resolveStorage(storage), boardCacheKey(timeframe), {
        version: CACHE_VERSION,
        cards: (cache?.cards || []).map(normalizeCard).filter(Boolean),
        hidden: (cache?.hidden || []).map(normalizeCard).filter(Boolean),
    });
}

function sameCard(a, b) {
    if (a.signalId && b.signalId) return a.signalId === b.signalId;
    if (a.signalId || b.signalId) return false;
    return a.symbol === b.symbol;
}

export function rememberCard(cache, card) {
    const entry = normalizeCard(card);
    if (!entry) return cache;

    return {
        version: CACHE_VERSION,
        cards: [entry, ...(cache?.cards || []).filter((item) => !sameCard(item, entry))],
        hidden: (cache?.hidden || []).filter((item) => !sameCard(item, entry)),
    };
}

// Menyembunyikan kartu adalah preferensi tampilan. Evaluasi backend dan histori
// tidak ikut terhapus.
export function hideCard(cache, card) {
    const entry = normalizeCard(card);
    if (!entry) return cache;

    return {
        version: CACHE_VERSION,
        cards: (cache?.cards || []).filter((item) => !sameCard(item, entry)),
        hidden: [entry, ...(cache?.hidden || []).filter((item) => !sameCard(item, entry))],
    };
}

export function isHidden(cache, card) {
    const entry = normalizeCard(card);
    if (!entry) return false;
    return (cache?.hidden || []).some((item) => sameCard(item, entry));
}
