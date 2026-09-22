// Helper request murni supaya bisa diuji tanpa jaringan atau DOM.

// Response pencarian lama tidak boleh menimpa pencarian terbaru.
export function createRequestSequence() {
    let latest = 0;

    return {
        next() {
            latest += 1;
            return latest;
        },
        isCurrent(token) {
            return token === latest;
        },
        get current() {
            return latest;
        },
    };
}

export function isAbortError(error, signal) {
    if (signal?.aborted) return true;
    if (!error) return false;
    return error.name === "AbortError" || /abort/i.test(String(error.message || ""));
}

const FALLBACK_STATUSES = new Set([404, 405, 501]);
// Backend memakai 503 untuk dua hal berbeda. `FEATURE_DISABLED` berarti flag
// pending-nya mati dan jalur lama masih sah dipakai; `RECORDING_FAILED` berarti
// penyimpanan gagal, dan itu kegagalan nyata yang harus tetap terlihat.
const FALLBACK_CODES = new Set(["FEATURE_DISABLED"]);

// Hanya endpoint yang memang belum ada atau sengaja dimatikan yang boleh jatuh
// ke jalur lama. Auth, rate limit, dan error server tetap dilaporkan sebagai error.
export function shouldFallbackToLegacy(error) {
    if (!error) return false;
    if (FALLBACK_STATUSES.has(Number(error.status))) return true;
    return Number(error.status) === 503 && FALLBACK_CODES.has(String(error.code));
}

// Engine pending-v1 belum melayani seluruh timeframe dashboard. Timeframe di
// luar dukungan langsung memakai jalur lama, bukan menerima error validasi.
export function supportsPendingAnalysis(timeframe, supportedTimeframes) {
    if (!Array.isArray(supportedTimeframes) || supportedTimeframes.length === 0) return true;
    return supportedTimeframes.includes(String(timeframe || "").toLowerCase());
}

export function nextBackoffMs(previousMs, { baseMs = 30_000, maxMs = 300_000 } = {}) {
    const next = previousMs > 0 ? previousMs * 2 : baseMs;
    return Math.min(next, maxMs);
}
