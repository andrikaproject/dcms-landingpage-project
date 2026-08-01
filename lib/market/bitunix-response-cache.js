export const BITUNIX_RESPONSE_CACHE_MS = 60 * 1000;

export function createBitunixResponseCache({
    ttlMs = BITUNIX_RESPONSE_CACHE_MS,
    now = Date.now,
} = {}) {
    const records = new Map();

    function read(key) {
        const cached = records.get(key);
        if (!cached || now() >= cached.expiresAt) {
            records.delete(key);
            return null;
        }
        return cached.data;
    }

    function write(key, data) {
        records.set(key, { data, expiresAt: now() + ttlMs });
        return data;
    }

    return { read, write };
}
