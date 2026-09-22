// Logika koordinator dashboard yang murni, supaya urutan request, keputusan
// menerapkan response, dan teks status bisa diuji tanpa DOM atau jaringan.

export const TIMEFRAME_DEBOUNCE_MS = 150;
export const DASHBOARD_TIMEFRAMES = ["1m", "15m", "1h", "4h", "1d"];
export const DEFAULT_TIMEFRAME = "15m";

export function normalizeTimeframe(value) {
    const clean = String(value || "").trim().toLowerCase();
    return DASHBOARD_TIMEFRAMES.includes(clean) ? clean : DEFAULT_TIMEFRAME;
}

export function formatTimeframeLabel(timeframe) {
    return String(timeframe || "").toUpperCase();
}

// URL baru hanya dipasang setelah datanya benar-benar tampil, jadi alamat yang
// dibagikan selalu cocok dengan board yang dilihat.
export function dashboardSearch({ timeframe, symbol }) {
    const params = new URLSearchParams({ timeframe: normalizeTimeframe(timeframe) });
    if (symbol) params.set("symbol", symbol);
    return `?${params.toString()}`;
}

export function readDashboardQuery(search) {
    const params = new URLSearchParams(search || "");
    return { timeframe: normalizeTimeframe(params.get("timeframe")), symbol: params.get("symbol") || "" };
}

export function describePendingTimeframe(timeframe) {
    return `Memuat ${formatTimeframeLabel(timeframe)}...`;
}

// Kegagalan menyebut dua timeframe sekaligus: yang diminta dan yang masih tampil,
// supaya user tidak salah membaca board lama sebagai hasil pilihannya.
export function describeTimeframeError({ requestedTimeframe, displayedTimeframe, message }) {
    if (requestedTimeframe && displayedTimeframe && requestedTimeframe !== displayedTimeframe) {
        return `Data ${formatTimeframeLabel(requestedTimeframe)} gagal diperbarui. Data ${formatTimeframeLabel(displayedTimeframe)} masih ditampilkan.`;
    }
    return message || "Data market gagal diperbarui.";
}

export function describeStaleData({ asOf, now = Date.now() }) {
    if (!asOf) return "";
    const ageMs = now - new Date(asOf).getTime();
    if (!Number.isFinite(ageMs) || ageMs < 0) return "";
    const seconds = Math.round(ageMs / 1000);
    if (seconds < 60) return `Data tertunda, diperbarui ${seconds} detik lalu.`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `Data tertunda, diperbarui ${minutes} menit lalu.`;
    return `Data tertunda, diperbarui ${Math.round(minutes / 60)} jam lalu.`;
}

export function describePartialData(failedSymbols) {
    const symbols = Array.isArray(failedSymbols) ? failedSymbols.filter(Boolean) : [];
    if (!symbols.length) return "";
    return `${symbols.length} koin belum bisa dimuat: ${symbols.join(", ")}.`;
}

// Status ditulis sebagai teks, bukan hanya warna, dan hanya muncul kalau backend
// memang melaporkannya. Backend lama tanpa `meta` menghasilkan status kosong.
export function describeDataHealth(meta, { now = Date.now() } = {}) {
    if (!meta) return { tone: "ok", text: "" };
    if (meta.dataHealth === "PARTIAL") return { tone: "partial", text: describePartialData(meta.failedSymbols) };
    if (meta.dataHealth === "DELAYED") return { tone: "delayed", text: describeStaleData({ asOf: meta.asOf, now }) };
    return { tone: "ok", text: "" };
}

export function isStaleDashboard(meta) {
    return meta?.dataHealth === "DELAYED" || meta?.cacheStatus === "STALE";
}
