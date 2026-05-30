import { auth } from "@/auth";
import { headers } from "next/headers";
import { createSafeActionClient } from "next-safe-action";

const rateLimitStore = new Map();

export class PublicActionError extends Error {
    constructor(message) {
        super(message);
        this.name = "PublicActionError";
    }
}

export const actionClient = createSafeActionClient({
    defaultValidationErrorsShape: "flattened",
    handleServerError(error) {
        if (error instanceof PublicActionError) {
            return error.message;
        }

        console.error("Safe action error:", error);
        return "Terjadi kesalahan pada server. Silakan coba lagi.";
    },
});

export const authActionClient = actionClient.use(async ({ next }) => {
    const session = await auth();

    if (!session?.user?.email) {
        throw new PublicActionError("Silakan login terlebih dahulu.");
    }

    return next({ ctx: { session, user: session.user } });
});

export const adminActionClient = authActionClient.use(async ({ next, ctx }) => {
    if (ctx.user.role !== "ADMIN") {
        throw new PublicActionError("Unauthorized: Hanya admin yang bisa melakukan ini.");
    }

    return next({ ctx: { isAdmin: true } });
});

export async function getRequestIp() {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");

    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    return (
        requestHeaders.get("x-real-ip") ||
        requestHeaders.get("cf-connecting-ip") ||
        "unknown"
    );
}

export function checkRateLimit(key, { limit, windowMs }) {
    const now = Date.now();
    const bucket = rateLimitStore.get(key);

    if (!bucket || bucket.resetAt <= now) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfter: 0 };
    }

    if (bucket.count >= limit) {
        return {
            allowed: false,
            retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
        };
    }

    bucket.count += 1;
    rateLimitStore.set(key, bucket);
    return { allowed: true, retryAfter: 0 };
}

export function rateLimitAction({ keyPrefix, limit, windowMs, keyFromInput }) {
    return async ({ clientInput, ctx, next }) => {
        const ip = await getRequestIp();
        const identity =
            keyFromInput?.({ clientInput, ctx, ip }) ||
            ctx?.user?.email ||
            ip;
        const result = checkRateLimit(`${keyPrefix}:${identity}`, { limit, windowMs });

        if (!result.allowed) {
            throw new PublicActionError(
                `Terlalu banyak percobaan. Coba lagi dalam ${result.retryAfter} detik.`
            );
        }

        return next();
    };
}
