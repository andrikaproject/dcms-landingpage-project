// Bagian murni dari pencarian coin: pemeringkatan saran, monogram, dan cache
// browser. Tidak menyentuh React atau window supaya bisa diuji di Node.

export const TRADING_PAIRS_CACHE_KEY = "dcms-trading-pairs:v2";
export const TRADING_PAIRS_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_SUGGESTION_LIMIT = 8;

export function usableTradingPairs(payload) {
    const rows = Array.isArray(payload) ? payload : payload?.items;
    if (!Array.isArray(rows)) throw new TypeError("Format daftar coin Bitunix tidak valid.");

    return rows.filter((pair) =>
        pair && typeof pair.symbol === "string" && typeof pair.base === "string"
        && pair.quote === "USDT"
        && (pair.symbolStatus === undefined || pair.symbolStatus === "OPEN")
        && pair.isApiSupported !== false
    );
}

export function normalizeQuery(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Peringkat lebih kecil tampil lebih dulu. Kecocokan persis pada base menang,
// lalu awalan base, lalu awalan symbol, baru kecocokan di tengah kata.
function rankOf(pair, query) {
    const base = pair.base.toUpperCase();
    const symbol = pair.symbol.toUpperCase();
    if (base === query) return 0;
    if (base.startsWith(query)) return 1;
    if (symbol.startsWith(query)) return 2;
    if (base.includes(query)) return 3;
    if (symbol.includes(query)) return 4;
    return null;
}

export function filterTradingPairs(pairs, rawQuery, { limit = DEFAULT_SUGGESTION_LIMIT } = {}) {
    const query = normalizeQuery(rawQuery);
    if (!query || !Array.isArray(pairs)) return [];

    return pairs
        .map((pair) => ({ pair, rank: rankOf(pair, query) }))
        .filter((entry) => entry.rank !== null)
        .sort((a, b) => a.rank - b.rank || a.pair.base.length - b.pair.base.length || a.pair.base.localeCompare(b.pair.base))
        .slice(0, limit)
        .map((entry) => entry.pair);
}

// Bitunix tidak menyediakan ikon, jadi tiap coin diberi monogram dengan warna
// yang konsisten dari nama base-nya.
export function monogramFor(base) {
    const text = String(base || "?").toUpperCase();
    let hash = 0;
    for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return {
        initials: text.slice(0, text.length > 3 ? 2 : 3),
        hue: hash % 360,
    };
}

function safeStorage(storage) {
    if (storage) return storage;
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

export function readCachedPairs({ storage, now = Date.now(), ttlMs = TRADING_PAIRS_TTL_MS } = {}) {
    const store = safeStorage(storage);
    if (!store) return null;
    try {
        const raw = store.getItem(TRADING_PAIRS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed?.items) || parsed.items.length === 0 || typeof parsed.fetchedAt !== "number") return null;
        if (now - parsed.fetchedAt > ttlMs) return null;
        return { items: parsed.items, fetchedAt: parsed.fetchedAt };
    } catch {
        return null;
    }
}

export function writeCachedPairs(items, { storage, now = Date.now() } = {}) {
    const store = safeStorage(storage);
    if (!store || !Array.isArray(items) || items.length === 0) return false;
    try {
        store.setItem(TRADING_PAIRS_CACHE_KEY, JSON.stringify({ items, fetchedAt: now }));
        return true;
    } catch {
        return false;
    }
}
