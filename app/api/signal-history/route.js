import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-gateway";
import { getUserSignalHistory } from "@/lib/learning/user-signal-history";
import { ADAPTIVE_GATE } from "@/lib/feature-flags";

export async function GET(request) {
    if (!ADAPTIVE_GATE.userHistory) {
        return NextResponse.json({ error: "Feature not enabled." }, { status: 503 });
    }

    const { session, response } = await requireApiSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));

    const filters = {};
    const symbol = searchParams.get("symbol");
    const timeframe = searchParams.get("timeframe");
    const outcomeStatus = searchParams.get("outcomeStatus");
    const actionType = searchParams.get("actionType");

    if (symbol) filters.symbol = symbol;
    if (timeframe) filters.timeframe = timeframe;
    if (outcomeStatus) filters.outcomeStatus = outcomeStatus;
    if (actionType) filters.actionType = actionType;

    try {
        const result = await getUserSignalHistory({
            userEmail: session.user.email,
            filters,
            page,
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error("Signal history error:", error);
        return NextResponse.json({ error: "Gagal mengambil history signal." }, { status: 500 });
    }
}
