const API_ORIGIN = "https://dcms-api.my.id";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, { params }: RouteContext) {
    const { path } = await params;
    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(`/v1/${path.join("/")}`, API_ORIGIN);
    upstreamUrl.search = requestUrl.search;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("host");
    requestHeaders.delete("content-length");
    // This is a server-to-server hop. Do not forward the browser Origin, or
    // the API will treat local development as an untrusted CORS client.
    requestHeaders.delete("origin");
    requestHeaders.set("x-forwarded-host", requestUrl.host);

    const init: RequestInit & { duplex?: "half" } = {
        method: request.method,
        headers: requestHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        cache: "no-store",
        duplex: "half",
    };
    const upstream = await fetch(upstreamUrl, init);

    const responseHeaders = new Headers();
    for (const name of ["cache-control", "content-type", "etag", "vary", "x-request-id"]) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
    }

    const setCookies = typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : (upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")] : []);
    for (const cookie of setCookies) {
        responseHeaders.append(
            "set-cookie",
            cookie.replace(/Path=\/v1\/auth(?=;|$)/i, "Path=/api/v1/auth")
        );
    }

    return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
    });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
