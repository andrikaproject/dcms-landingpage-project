// Peta status bersama FE dan BE (rencana ml-fe.md bagian 4).
// Label FE hanya boleh berubah bersama kontrak backend.

export const SIGNAL_STATUS = {
    PENDING_ENTRY: "PENDING_ENTRY",
    ACTIVE: "ACTIVE",
    TP_HIT: "TP_HIT",
    SL_HIT: "SL_HIT",
    TIME_EXIT: "TIME_EXIT",
    EXPIRED: "EXPIRED",
    INVALIDATED: "INVALIDATED",
    AMBIGUOUS: "AMBIGUOUS",
};

export const ANALYSIS_DECISION = {
    PUBLISHED: "PUBLISHED",
    NO_SETUP: "NO_SETUP",
};

// phase: waiting = belum entry, open = posisi simulasi berjalan, terminal = selesai.
const STATUS_PRESENTATION = {
    [SIGNAL_STATUS.PENDING_ENTRY]: {
        label: "Menunggu Entry",
        description: "Harga belum mencapai pemicu entry.",
        phase: "waiting",
        className: "border-sky-400/25 bg-sky-500/10 text-sky-300",
    },
    [SIGNAL_STATUS.ACTIVE]: {
        label: "Entry Tersentuh",
        description: "Pemicu entry terpenuhi menurut simulasi backend.",
        phase: "open",
        className: "border-[#B7FB5B]/25 bg-[#B7FB5B]/10 text-[#B7FB5B]",
    },
    [SIGNAL_STATUS.TP_HIT]: {
        label: "TP Tercapai",
        description: "Target final tercapai setelah entry.",
        phase: "terminal",
        className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    },
    [SIGNAL_STATUS.SL_HIT]: {
        label: "SL Tercapai",
        description: "Stop tercapai setelah entry.",
        phase: "terminal",
        className: "border-red-400/25 bg-red-500/10 text-red-300",
    },
    [SIGNAL_STATUS.TIME_EXIT]: {
        label: "Selesai: Batas Waktu",
        description: "Posisi simulasi keluar sesuai batas durasi.",
        phase: "terminal",
        className: "border-orange-400/25 bg-orange-500/10 text-orange-300",
    },
    [SIGNAL_STATUS.EXPIRED]: {
        label: "Kedaluwarsa Tanpa Entry",
        description: "Masa tunggu habis sebelum entry. Bukan trade loss.",
        phase: "terminal",
        className: "border-zinc-600/40 bg-zinc-700/20 text-zinc-400",
    },
    [SIGNAL_STATUS.INVALIDATED]: {
        label: "Setup Dibatalkan",
        description: "Kondisi pembatalan terjadi sebelum entry. Bukan SL.",
        phase: "terminal",
        className: "border-zinc-600/40 bg-zinc-700/20 text-zinc-400",
    },
    [SIGNAL_STATUS.AMBIGUOUS]: {
        label: "Hasil Belum Dapat Dipastikan",
        description: "Urutan peristiwa tidak diketahui dari data yang tersedia.",
        phase: "terminal",
        className: "border-yellow-400/25 bg-yellow-500/10 text-yellow-300",
    },
};

const UNKNOWN_PRESENTATION = {
    label: "Status Tidak Dikenal",
    description: "Status ini belum dikenal frontend. Perlu pemeriksaan kontrak API.",
    phase: "unknown",
    className: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300",
};

export function describeStatus(status) {
    const known = STATUS_PRESENTATION[status];
    if (known) return { status, isKnown: true, ...known };

    // Status asing tidak boleh diasumsikan ACTIVE; tandai sebagai masalah kontrak.
    return { status: status || null, isKnown: false, ...UNKNOWN_PRESENTATION };
}

export function isKnownStatus(status) {
    return Object.prototype.hasOwnProperty.call(STATUS_PRESENTATION, status);
}

export function isPendingStatus(status) {
    return status === SIGNAL_STATUS.PENDING_ENTRY;
}

export function isTerminalStatus(status) {
    return describeStatus(status).phase === "terminal";
}

export function isLiveStatus(status) {
    const phase = describeStatus(status).phase;
    return phase === "waiting" || phase === "open";
}

// Hanya status berikut yang pernah membuka posisi simulasi, jadi hanya ini yang
// boleh masuk denominator hit rate.
export function isTradeOutcomeStatus(status) {
    return status === SIGNAL_STATUS.TP_HIT
        || status === SIGNAL_STATUS.SL_HIT
        || status === SIGNAL_STATUS.TIME_EXIT;
}

export const STATUS_FILTER_OPTIONS = [
    { value: "", label: "Semua Status" },
    ...Object.keys(STATUS_PRESENTATION).map((status) => ({
        value: status,
        label: STATUS_PRESENTATION[status].label,
    })),
];
