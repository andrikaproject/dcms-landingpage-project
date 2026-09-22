// Next.js hanya menanam NEXT_PUBLIC_* yang direferensikan literal, jadi jangan
// mengaksesnya lewat indeks dinamis.

function readFlag(rawValue, defaultEnabled) {
    if (rawValue === undefined || rawValue === "") return defaultEnabled;
    const value = String(rawValue).toLowerCase();
    return value === "1" || value === "true";
}

function readNumber(rawValue, defaultValue) {
    const number = Number(rawValue);
    return Number.isFinite(number) && number > 0 ? number : defaultValue;
}

export const SIGNAL_FLAGS = {
    // Alur pending signal baru. Mati sampai kontrak BE-1/BE-2 terverifikasi.
    pendingSignals: readFlag(process.env.NEXT_PUBLIC_PENDING_SIGNALS_ENABLED, false),
    // Isi kartu dari fixture sintetis untuk review UI tanpa backend.
    pendingSignalsPreview: readFlag(process.env.NEXT_PUBLIC_PENDING_SIGNALS_PREVIEW, false),
    // Penilaian ML publik menunggu gate BE-5.
    publicAssessment: readFlag(process.env.NEXT_PUBLIC_SIGNAL_ASSESSMENT_ENABLED, false),
    mlAdmin: readFlag(process.env.NEXT_PUBLIC_ML_ADMIN_ENABLED, false),
};

// Timeframe yang dilayani engine pending backend. Diambil dari env supaya bisa
// menyusul perubahan backend tanpa mengubah kode.
export const SIGNAL_ANALYSIS_TIMEFRAMES = String(
    process.env.NEXT_PUBLIC_PENDING_SIGNAL_TIMEFRAMES || "15m,1h"
)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export const SIGNAL_TRACKING = {
    pollIntervalMs: readNumber(process.env.NEXT_PUBLIC_SIGNAL_POLL_INTERVAL_MS, 30_000),
    staleAfterMs: readNumber(process.env.NEXT_PUBLIC_SIGNAL_STALE_AFTER_MS, 180_000),
    maxBackoffMs: readNumber(process.env.NEXT_PUBLIC_SIGNAL_MAX_BACKOFF_MS, 300_000),
};
