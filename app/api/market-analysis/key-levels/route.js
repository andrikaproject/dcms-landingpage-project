import { NextResponse } from "next/server";
import { apiError, enforceRateLimit, requireApiSession } from "@/lib/api-gateway";
import { getKeyLevels } from "@/lib/market/key-levels";

const VALID_BASIS = new Set(["utc", "session"]);
const VALID_SESSION = new Set(["asia", "london", "new-york"]);
const VALID_INTERVAL = new Set(["1m", "15m", "1h", "4h", "1d"]);

export async function GET(request) {
    const { session, response } = await requireApiSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTCUSDT";
    const basis = VALID_BASIS.has(searchParams.get("basis")) ? searchParams.get("basis") : "utc";
    const sessionParam = VALID_SESSION.has(searchParams.get("session"))
        ? searchParams.get("session")
        : "new-york";
    const interval = VALID_INTERVAL.has(searchParams.get("interval"))
        ? searchParams.get("interval")
        : "15m";
    const forceRefresh = searchParams.get("refresh") === "1";

    const rateLimit = await enforceRateLimit(`api-market-analysis:${session.user.email}`, {
        limit: 60,
        windowMs: 10 * 60 * 1000,
    });

    if (rateLimit.response) {
        const payload = await rateLimit.response.json();
        return apiError(payload.error?.message || "Terlalu banyak percobaan.", 429);
    }

    try {
        const data = await getKeyLevels({ symbol, basis, session: sessionParam, interval, forceRefresh });
        return NextResponse.json(data, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("Market Analysis Key Levels Error:", error);
        const notFound = /not found/i.test(error?.message || "");
        return NextResponse.json(
            {
                error: notFound
                    ? "Symbol tidak ditemukan di Bitunix futures. Coba gunakan format seperti BTCUSDT."
                    : "Data market belum bisa dimuat. Coba lagi dalam beberapa saat.",
            },
            { status: notFound ? 404 : 502 }
        );
    }
}
