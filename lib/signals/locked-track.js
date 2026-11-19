import { SIGNAL_STATUS } from "./lifecycle.js";
import { resolveLockedLifecycleStatus } from "./locked.js";

// Tiga zona track kartu sinyal terkunci: SL–Entry, Entry–TP1, TP1–TP2.
// "loss" dan "profit" menandai zona tempat harga berada sekarang; "passed"
// menandai zona profit yang sudah dilewati.
export const TRACK_ZONE = { IDLE: "idle", LOSS: "loss", PROFIT: "profit", PASSED: "passed" };

function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export function lockedTrackZones(signal) {
    const idle = [TRACK_ZONE.IDLE, TRACK_ZONE.IDLE, TRACK_ZONE.IDLE];
    const entry = toNumber(signal?.entry);
    const price = toNumber(signal?.currentPrice ?? signal?.price);
    const tp1 = toNumber(signal?.tp1);
    if (entry === null || price === null) return idle;

    // Rencana yang belum entry belum punya posisi untuk diukur.
    if (resolveLockedLifecycleStatus(signal) === SIGNAL_STATUS.PENDING_ENTRY) return idle;

    const direction = String(signal?.bias || "").toLowerCase() === "short" ? -1 : 1;
    if ((price - entry) * direction < 0) return [TRACK_ZONE.LOSS, TRACK_ZONE.IDLE, TRACK_ZONE.IDLE];
    if (tp1 === null || (price - tp1) * direction < 0) return [TRACK_ZONE.IDLE, TRACK_ZONE.PROFIT, TRACK_ZONE.IDLE];
    return [TRACK_ZONE.IDLE, TRACK_ZONE.PASSED, TRACK_ZONE.PROFIT];
}

// Notifikasi pantauan dibandingkan antara dua pembacaan daftar sinyal aktif.
// TP1 terlihat dari harga; sinyal yang keluar dari daftar aktif berarti TP2,
// SL, atau masa berlakunya tercapai, dan detailnya ada di riwayat.
export const LOCKED_ALERT = { TP1: "tp1", CLOSED: "closed" };

function reachedTp1(signal) {
    return lockedTrackZones(signal)[1] === TRACK_ZONE.PASSED;
}

export function lockedAlerts(previous, items, { ignoreIds = new Set() } = {}) {
    const snapshot = new Map(items.map((signal) => [signal.id, { signal, tp1: reachedTp1(signal) }]));
    // Pembacaan pertama hanya menjadi titik awal pembanding.
    if (!previous) return { alerts: [], snapshot };

    const alerts = [];
    for (const [id, current] of snapshot) {
        const before = previous.get(id);
        if (before && !before.tp1 && current.tp1) alerts.push({ kind: LOCKED_ALERT.TP1, signal: current.signal });
    }
    for (const [id, before] of previous) {
        if (!snapshot.has(id) && !ignoreIds.has(id)) alerts.push({ kind: LOCKED_ALERT.CLOSED, signal: before.signal });
    }
    return { alerts, snapshot };
}
