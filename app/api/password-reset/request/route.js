import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const origin = request.nextUrl.origin;

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
