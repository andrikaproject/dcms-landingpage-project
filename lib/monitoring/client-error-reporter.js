export const CLIENT_LOG_ENDPOINT_PATH = "/logs/client";
export const DEDUPE_WINDOW_MS = 60_000;
export const BUDGET_WINDOW_MS = 60_000;
export const BUDGET_MAX_REPORTS = 20;
export const MAX_STACK_LENGTH = 8000;
export const MAX_MESSAGE_LENGTH = 1000;

export function buildPage(location) {
    return location?.pathname || "/";
}

export function hashKey(type, message, stack) {
    const input = `${type}|${message}|${(stack || "").slice(0, 200)}`;
    let hash = 5381;
    for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
    return String(hash);
}

export function isReporterEnabled(env = process.env) {
    return env.NODE_ENV === "production" || env.NEXT_PUBLIC_CLIENT_LOGS_ENABLED === "true";
}

export function normalizeError(reason) {
    try {
        const message = typeof reason === "string" ? reason : reason?.message || JSON.stringify(reason) || "Unknown error";
        return {
            message: String(message).slice(0, MAX_MESSAGE_LENGTH),
            stack: typeof reason?.stack === "string" ? reason.stack.slice(0, MAX_STACK_LENGTH) : undefined,
        };
    } catch {
        return { message: "Unknown error", stack: undefined };
    }
}

export function createReporter({ endpoint, getToken = () => null, fetchImpl = globalThis.fetch, now = Date.now, location = globalThis.location, enabled = true }) {
    const hashes = new Map();
    let timestamps = [];
    let reporting = false;

    function report(entry, { bypassDedupe = false, force = false } = {}) {
        try {
            if ((!enabled && !force) || reporting) return false;
            // Guard synchronous re-entry, including getters, serialization and fetch mocks.
            reporting = true;
            try {
                const { message, stack } = normalizeError(entry);
                const payload = { type: entry.type, message, stack, page: buildPage(location) };
                for (const field of ["digest", "requestId", "path", "method", "durationMs", "retried", "details"]) {
                    if (entry[field] !== undefined) payload[field] = entry[field];
                }
                const time = now();
                for (const [key, timestamp] of hashes) {
                    if (time - timestamp >= DEDUPE_WINDOW_MS) hashes.delete(key);
                }
                const key = hashKey(payload.type, message, stack);
                if (!bypassDedupe && hashes.has(key)) return false;
                timestamps = timestamps.filter((timestamp) => time - timestamp < BUDGET_WINDOW_MS);
                if (timestamps.length >= BUDGET_MAX_REPORTS) return false;
                const token = getToken();
                Promise.resolve(fetchImpl(endpoint, {
                    method: "POST",
                    keepalive: true,
                    credentials: "include",
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify(payload),
                })).catch(() => {});
                hashes.set(key, time);
                timestamps.push(time);
                return true;
            } finally {
                reporting = false;
            }
        } catch {
            return false;
        }
    }

    function installGlobalListeners(target) {
        const onError = (event) => report({ type: "CLIENT_UNCAUGHT_ERROR", ...normalizeError(event.error || event.message) });
        const onRejection = (event) => report({ type: "CLIENT_UNHANDLED_REJECTION", ...normalizeError(event.reason) });
        const onRequest = (event) => {
            const detail = event.detail;
            if (!detail || (detail.status !== 0 && detail.code !== "NETWORK_ERROR")) return;
            report({
                type: "CLIENT_NETWORK_ERROR",
                message: `Request gagal: ${detail.method} ${detail.path}`,
                path: detail.path,
                method: detail.method,
                requestId: detail.requestId,
                durationMs: detail.durationMs,
                retried: detail.retried,
            });
        };
        target.addEventListener("error", onError);
        target.addEventListener("unhandledrejection", onRejection);
        target.addEventListener("dcms:api-request", onRequest);
        return () => {
            target.removeEventListener("error", onError);
            target.removeEventListener("unhandledrejection", onRejection);
            target.removeEventListener("dcms:api-request", onRequest);
        };
    }

    return { report, installGlobalListeners };
}
