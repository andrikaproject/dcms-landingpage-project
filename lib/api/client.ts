// Keep authentication first-party in Safari. The Next.js route handler proxies
// this path to the API domain and rewrites the refresh-cookie path.
const DEFAULT_API_BASE_URL = "/api/v1";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

export type ApiUser = {
    sub?: string;
    id?: string;
    name?: string | null;
    email: string;
    role: string;
    uuidBitunix?: string | null;
    accountType?: string;
};

type AuthListener = (user: ApiUser | null) => void;

let accessToken: string | null = null;
let refreshPromise: Promise<{ accessToken: string; user: ApiUser } | null> | null = null;
const authListeners = new Set<AuthListener>();

export class ApiError extends Error {
    status: number;
    code: string;
    details?: unknown;

    constructor(message: string, { status = 500, code = "API_ERROR", details }: { status?: number; code?: string; details?: unknown } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function subscribeAuth(listener: AuthListener) {
    authListeners.add(listener);
    return () => { authListeners.delete(listener); };
}

function publishAuth(user: ApiUser | null) {
    for (const listener of authListeners) listener(user);
}

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

function emitTelemetry(detail: Record<string, unknown>) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dcms:api-request", { detail }));
    }
}

async function parseResponse(response: Response) {
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
        throw new ApiError(
            payload?.error?.message || payload?.error || `API request gagal (${response.status}).`,
            {
                status: response.status,
                code: payload?.error?.code || `HTTP_${response.status}`,
                details: payload?.error?.details,
            }
        );
    }
    return payload?.ok === true && "data" in payload ? payload.data : payload;
}

async function refreshSession() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
                headers: { Accept: "application/json" },
            });
            const data = await parseResponse(response);
            accessToken = data.accessToken;
            publishAuth(data.user);
            return data;
        } catch {
            accessToken = null;
            publishAuth(null);
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
    body?: unknown;
    auth?: boolean;
    retryAuth?: boolean;
    requestId?: string;
    query?: Record<string, string | number | boolean | null | undefined>;
};

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const {
        auth = true,
        retryAuth = true,
        requestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `dcms-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        query,
        body,
        headers,
        ...requestInit
    } = options;
    const requestBaseUrl = API_BASE_URL.startsWith("/")
        ? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
        : undefined;
    const url = new URL(
        `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
        requestBaseUrl
    );
    for (const [key, value] of Object.entries(query || {})) {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }

    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");
    requestHeaders.set("X-Request-ID", requestId);
    if (body !== undefined && !(body instanceof FormData)) requestHeaders.set("Content-Type", "application/json");
    if (auth && accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);

    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
        const response = await fetch(url, {
            ...requestInit,
            credentials: "include",
            headers: requestHeaders,
            body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        });

        if (response.status === 401 && auth && retryAuth) {
            const refreshed = await refreshSession();
            if (refreshed) return apiRequest<T>(path, { ...options, requestId, retryAuth: false });
        }

        const data = await parseResponse(response);
        const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        emitTelemetry({ requestId, path: url.pathname, method: requestInit.method || "GET", status: response.status, durationMs: Math.round(finishedAt - startedAt), retried: !retryAuth });
        return data as T;
    } catch (error) {
        const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        emitTelemetry({ requestId, path: url.pathname, method: requestInit.method || "GET", status: error instanceof ApiError ? error.status : 0, code: error instanceof ApiError ? error.code : "NETWORK_ERROR", durationMs: Math.round(finishedAt - startedAt), retried: !retryAuth });
        if (error instanceof ApiError) throw error;
        throw new ApiError(error instanceof Error ? error.message : "Tidak dapat terhubung ke API.", { status: 0, code: "NETWORK_ERROR" });
    }
}

export async function login(identifier: string, password: string) {
    const data = await apiRequest<{ accessToken: string; user: ApiUser }>("/auth/login", {
        method: "POST",
        auth: false,
        retryAuth: false,
        body: { identifier, password },
    });
    accessToken = data.accessToken;
    publishAuth(data.user);
    return data.user;
}

export async function bootstrapSession() {
    return refreshSession();
}

export async function logout() {
    try {
        await apiRequest("/auth/logout", { method: "POST", auth: false, retryAuth: false });
    } finally {
        accessToken = null;
        publishAuth(null);
    }
}
