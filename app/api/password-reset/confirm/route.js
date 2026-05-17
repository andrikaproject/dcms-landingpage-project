import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

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
