import { NextResponse } from "next/server";
import { getMarketDashboard } from "@/lib/market-dashboard";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "15m";
    const symbol = searchParams.get("symbol") || "";

    try {
        return NextResponse.json(await getMarketDashboard({ timeframe, symbol }));
    } catch (error) {
        console.error("Market Dashboard Error:", error);
        return NextResponse.json(
            { error: "Tidak bisa mengambil data market dashboard." },
            { status: 502 }
        );
    }
}
