const PRODUCTION_API_ORIGIN = "https://dcms-api.my.id";
const LOCAL_API_ORIGIN = "http://127.0.0.1:4000";

// Proxy /api/v1 hanya meneruskan ke origin. Path, query, dan kredensial di URL
// ditolak agar konfigurasi yang salah gagal saat start, bukan diam-diam
// mengirim cookie refresh ke path yang tidak terduga.
export function resolveApiOrigin(configured, environment) {
    const fallback = environment === "production" ? PRODUCTION_API_ORIGIN : LOCAL_API_ORIGIN;
    const url = new URL(configured?.trim() || fallback);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
        throw new Error("API_UPSTREAM_ORIGIN harus berupa origin HTTP atau HTTPS.");
    }
    return url.origin;
}
