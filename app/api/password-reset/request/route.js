import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";
import { checkRateLimit, getRequestIp } from "@/lib/safe-action";

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const ip = await getRequestIp();
    const rateLimit = checkRateLimit(`password-reset-request:${ip}:${email || "empty"}`, {
        limit: 5,
        windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: `Terlalu banyak percobaan. Coba lagi dalam ${rateLimit.retryAfter} detik.` },
            { status: 429 }
        );
    }

    try {
        const result = await requestPasswordReset({ email, origin });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        const payload = {
            success: "Jika email terdaftar, link reset password akan dikirim beberapa saat lagi.",
        };

        if (process.env.NODE_ENV !== "production" && result.debugResetUrl) {
            payload.debugResetUrl = result.debugResetUrl;
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Password Reset Request Error:", error);

        return NextResponse.json(
            { error: "Tidak bisa memproses reset password saat ini." },
            { status: 500 }
        );
    }
}
