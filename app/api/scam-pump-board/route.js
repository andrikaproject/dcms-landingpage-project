import { NextResponse } from "next/server";
import { enforceRateLimit, requireApiSession } from "@/lib/api-gateway";
import { getScamPumpBoard } from "@/lib/scam-pump-board";

export async function GET() {
    const { session, response } = await requireApiSession();
    if (response) return response;

    const rateLimit = await enforceRateLimit(`api-scam-pump-board:${session.user.email}`, {
        limit: 20,
        windowMs: 10 * 60 * 1000,
    });

    if (rateLimit.response) {
        const payload = await rateLimit.response.json();
        return NextResponse.json(
            {
                error: payload.error?.message || "Terlalu banyak percobaan.",
                retryAfter: payload.error?.retryAfter || 0,
            },
            { status: 429 }
        );
    }

    try {
        return NextResponse.json(await getScamPumpBoard());
    } catch (error) {
        console.error("Scam Pump Board Error:", error);
        return NextResponse.json(
            { error: "Tidak bisa menjalankan analisis Scam Pump Board." },
            { status: 502 }
        );
    }
}
