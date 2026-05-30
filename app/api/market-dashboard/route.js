import { NextResponse } from "next/server";
import { apiError, enforceRateLimit, requireApiSession } from "@/lib/api-gateway";
import { getMarketDashboard } from "@/lib/market-dashboard";

export async function GET(request) {
    const { session, response } = await requireApiSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "15m";
    const symbol = searchParams.get("symbol") || "";
    const reanalyze = searchParams.get("reanalyze") || "";
    const rateLimit = await enforceRateLimit(`api-market-dashboard:${session.user.email}`, {
        limit: 60,
        windowMs: 10 * 60 * 1000,
    });

    if (rateLimit.response) {
        const payload = await rateLimit.response.json();
        return apiError(payload.error?.message || "Terlalu banyak percobaan.", 429);
    }

    try {
        return NextResponse.json(await getMarketDashboard({ timeframe, symbol, reanalyze }));
    } catch (error) {
        console.error("Market Dashboard Error:", error);
        return NextResponse.json(
            { error: "Tidak bisa mengambil data market dashboard." },
            { status: 502 }
        );
    }
}
