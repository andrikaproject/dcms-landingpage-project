import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { checkRateLimit, getRequestIp } from "@/lib/safe-action";

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const ip = await getRequestIp();
    const rateLimit = checkRateLimit(`password-reset-confirm:${ip}`, {
        limit: 10,
        windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: `Terlalu banyak percobaan. Coba lagi dalam ${rateLimit.retryAfter} detik.` },
            { status: 429 }
        );
    }

    try {
        const result = await resetPasswordWithToken({ token, password });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: "Password berhasil diperbarui. Silakan login." });
    } catch (error) {
        console.error("Password Reset Confirm Error:", error);

        return NextResponse.json(
            { error: "Tidak bisa memperbarui password saat ini." },
            { status: 500 }
        );
    }
}
