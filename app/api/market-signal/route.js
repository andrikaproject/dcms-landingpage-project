import { NextResponse } from "next/server";
import { apiError, enforceRateLimit, requireApiSession } from "@/lib/api-gateway";
import { getFreshSignalSnapshot } from "@/lib/market-dashboard";

export async function GET(request) {
    const { session, response } = await requireApiSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "15m";
    const symbol = searchParams.get("symbol") || "";

    if (!symbol.trim()) {
        return apiError("Symbol wajib diisi.", 400);
    }

    const rateLimit = await enforceRateLimit(`api-market-signal:${session.user.email}`, {
        limit: 30,
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
        const signal = await getFreshSignalSnapshot({ symbol, timeframe });

        return NextResponse.json({
            signal,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Market Signal Error:", error);
        return NextResponse.json(
            { error: "Tidak bisa mengambil data coin yang dipilih." },
            { status: 502 }
        );
    }
}
