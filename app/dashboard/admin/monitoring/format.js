export function triggerBrowserDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    try {
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
    } finally {
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }
}

export const TYPE_LABELS = {
    AUTH_LOGIN_SUCCESS: "Login berhasil",
    AUTH_LOGIN_FAILED: "Login gagal",
    AUTH_LOGOUT: "Logout",
    AUTH_REGISTER: "Registrasi",
    AUTH_PASSWORD_RESET_REQUESTED: "Permintaan reset password",
    AUTH_PASSWORD_RESET_COMPLETED: "Reset password selesai",
    MARKET_DASHBOARD_VIEW: "Lihat dashboard market",
    MARKET_SIGNAL_SEARCH: "Cari sinyal",
    MARKET_SCAM_PUMP_VIEW: "Lihat scam pump",
    MARKET_VPVR_VIEW: "Lihat VPVR",
    ANALYSIS_KEY_LEVELS_VIEW: "Lihat key levels",
    ANALYSIS_LEVEL_SCAN: "Pindai level",
    SIGNAL_LOCK_CREATE: "Kunci sinyal",
    SIGNAL_LOCK_DELETE: "Hapus sinyal terkunci",
    SIGNAL_HISTORY_VIEW: "Lihat riwayat sinyal",
    ADMIN_LOGS_EXPORT: "Ekspor log",
    ADMIN_LOGS_DELETE: "Hapus log harian",
    CLIENT_UNCAUGHT_ERROR: "Error JavaScript",
    CLIENT_UNHANDLED_REJECTION: "Promise gagal tanpa penanganan",
    CLIENT_RENDER_ERROR: "Crash render",
    CLIENT_NETWORK_ERROR: "Koneksi API gagal",
};
export const KNOWN_TYPES = Object.keys(TYPE_LABELS);
export const labelForType = (type) => TYPE_LABELS[type] || type;

const red = "border-red-400/25 bg-red-400/10 text-red-300";
const amber = "border-amber-400/25 bg-amber-400/10 text-amber-300";
const zinc = "border-zinc-700 bg-zinc-800/60 text-zinc-300";
export const levelClass = (level) => level === "ERROR" ? red : level === "WARN" ? amber : zinc;
export const impactClass = (impact) => impact === "HIGH" ? red : impact === "MEDIUM" ? amber : zinc;

export function formatDay(date) {
    if (!date) return "—";
    const value = new Date(`${date}T00:00:00Z`);
    return Number.isNaN(value.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

export function formatTime(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(date);
}

export function exportFilename(date, format, kind) {
    return `dcms-logs-${date}${kind ? `-${kind.toLowerCase()}` : ""}.${format}`;
}

export function summarizeEntry(entry) {
    if (entry.kind === "ERROR" && entry.source === "BACKEND") {
        return [entry.method, entry.path, entry.statusCode].filter((value) => value !== null && value !== undefined && value !== "").join(" ");
    }
    return entry.message || "—";
}
