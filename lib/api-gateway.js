import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit, getRequestIp } from "@/lib/safe-action";

export function apiError(message, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export function gatewayOk(data, init) {
    return NextResponse.json({ ok: true, data }, init);
}

export function gatewayError(code, message, status = 400, details = {}) {
    return NextResponse.json(
        {
            ok: false,
            error: {
                code,
                message,
                ...details,
            },
        },
        { status }
    );
}

export async function requireApiSession() {
    const session = await auth();

    if (!session?.user?.email) {
        return {
            session: null,
            response: apiError("Unauthorized.", 401),
        };
    }

    return { session, response: null };
}

export async function requireApiAdmin() {
    const { session, response } = await requireApiSession();

    if (response) return { session, response };

    if (session.user.role !== "ADMIN") {
        return {
            session,
            response: apiError("Forbidden.", 403),
        };
    }

    return { session, response: null };
}

export async function requireGatewaySession() {
    const session = await auth();

    if (!session?.user?.email) {
        return {
            session: null,
            response: gatewayError(
                "UNAUTHORIZED",
                "Silakan login terlebih dahulu.",
                401
            ),
        };
    }

    return { session, response: null };
}

export async function enforceRateLimit(key, { limit, windowMs }) {
    const ip = await getRequestIp();
    const result = checkRateLimit(`${key}:${ip}`, { limit, windowMs });

    if (!result.allowed) {
        return {
            ip,
            response: gatewayError(
                "RATE_LIMITED",
                `Terlalu banyak percobaan. Coba lagi dalam ${result.retryAfter} detik.`,
                429,
                { retryAfter: result.retryAfter }
            ),
        };
    }

    return { ip, response: null };
}
