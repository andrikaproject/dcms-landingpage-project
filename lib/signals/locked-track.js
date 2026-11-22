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

// Progres proporsional untuk track kartu: seberapa jauh harga sudah berjalan
// dari entry menuju SL, TP1, atau TP2. Segmen hanya penuh ("hit") bila level itu
// benar-benar tercapai; selebihnya terisi sebanding jarak ("approach").
// Urutan segmen sama dengan tampilan: [SL–Entry, Entry–TP1, TP1–TP2].
// Segmen SL terisi dari sisi Entry ke arah SL, segmen TP dari kiri ke kanan.
export const TRACK_LEVEL = { SL: "sl", TP1: "tp1", TP2: "tp2" };
export const SEGMENT_STATE = { IDLE: "idle", APPROACH: "approach", HIT: "hit" };

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const idleSegment = () => ({ fill: 0, state: SEGMENT_STATE.IDLE });

function segmentFrom(ratio) {
    if (ratio === null || ratio <= 0) return idleSegment();
    return ratio >= 1 ? { fill: 1, state: SEGMENT_STATE.HIT } : { fill: ratio, state: SEGMENT_STATE.APPROACH };
}

// Rasio jarak yang sudah ditempuh dari `from` ke `to` searah posisi; null bila
// salah satu level tidak ada atau keduanya sama.
function travelled(price, from, to) {
    if (from === null || to === null || from === to) return null;
    return (price - from) / (to - from);
}

export function lockedTrackProgress(signal) {
    const entry = toNumber(signal?.entry);
    const price = toNumber(signal?.currentPrice ?? signal?.price);
    const sl = toNumber(signal?.sl);
    const tp1 = toNumber(signal?.tp1);
    const tp2 = toNumber(signal?.tp2 ?? signal?.tp);
    const status = resolveLockedLifecycleStatus(signal);
    const empty = { segments: [idleSegment(), idleSegment(), idleSegment()], marker: null, target: null, pending: false };
    if (entry === null || price === null) return empty;
    if (status === SIGNAL_STATUS.PENDING_ENTRY) return { ...empty, pending: true };

    const toSl = travelled(price, entry, sl);
    const toTp1 = travelled(price, entry, tp1);
    const toTp2 = travelled(price, tp1, tp2);

    // Status dari backend menang atas harga: SL/TP yang sudah tercatat tetap penuh
    // walau harga kembali menjauh.
    const slSegment = status === SIGNAL_STATUS.SL_HIT ? segmentFrom(1) : segmentFrom(toSl);
    let tp1Segment = segmentFrom(toTp1);
    let tp2Segment = tp1Segment.state === SEGMENT_STATE.HIT ? segmentFrom(toTp2) : idleSegment();
    if (status === SIGNAL_STATUS.TP_HIT) {
        tp1Segment = segmentFrom(1);
        tp2Segment = segmentFrom(1);
    }

    // Penanda harga: indeks segmen dan posisi 0–1 di dalamnya (kiri ke kanan).
    let marker;
    if (toSl !== null && toSl > 0) marker = { segment: 0, position: 1 - clamp01(toSl) };
    else if (toSl === null && toTp1 !== null && toTp1 < 0) marker = { segment: 0, position: 1 };
    else if (toTp1 === null || toTp1 < 1) marker = { segment: 1, position: clamp01(toTp1 ?? 0) };
    else marker = { segment: 2, position: clamp01(toTp2 ?? 0) };

    // Level berikutnya yang dituju harga, dengan sisa jarak dalam persen harga.
    const remaining = (level) => Math.abs(level - price) / price * 100;
    let target = null;
    if (toSl !== null && toSl > 0 && slSegment.state !== SEGMENT_STATE.HIT) {
        target = { level: TRACK_LEVEL.SL, progress: toSl, remainingPercent: remaining(sl) };
    } else if (toSl === null || toSl <= 0) {
        if (tp1 !== null && tp1Segment.state !== SEGMENT_STATE.HIT) {
            target = { level: TRACK_LEVEL.TP1, progress: clamp01(toTp1), remainingPercent: remaining(tp1) };
        } else if (tp2 !== null && tp1Segment.state === SEGMENT_STATE.HIT && tp2Segment.state !== SEGMENT_STATE.HIT) {
            target = { level: TRACK_LEVEL.TP2, progress: clamp01(toTp2 ?? 0), remainingPercent: remaining(tp2) };
        }
    }

    return { segments: [slSegment, tp1Segment, tp2Segment], marker, target, pending: false };
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
