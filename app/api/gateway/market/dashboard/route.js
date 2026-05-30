import { z } from "zod";
import {
    enforceRateLimit,
    gatewayError,
    gatewayOk,
    requireGatewaySession,
} from "@/lib/api-gateway";
import { getMarketDashboard } from "@/lib/market-dashboard";

const marketDashboardQuerySchema = z.object({
    timeframe: z.enum(["1m", "15m", "1h", "4h", "1d"]).default("15m"),
    symbol: z.string().trim().max(32, "Symbol terlalu panjang.").default(""),
    reanalyze: z.string().trim().max(32, "Symbol re-analyze terlalu panjang.").default(""),
});

export async function GET(request) {
    const auth = await requireGatewaySession();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const parsed = marketDashboardQuerySchema.safeParse({
        timeframe: searchParams.get("timeframe") || undefined,
        symbol: searchParams.get("symbol") || "",
        reanalyze: searchParams.get("reanalyze") || "",
    });

    if (!parsed.success) {
        return gatewayError(
            "INVALID_MARKET_QUERY",
            parsed.error.issues[0]?.message || "Query market dashboard tidak valid.",
            400
        );
    }

    const rateLimit = await enforceRateLimit(`gateway-market-dashboard:${auth.session.user.email}`, {
        limit: 60,
        windowMs: 10 * 60 * 1000,
    });

    if (rateLimit.response) return rateLimit.response;

    try {
        const data = await getMarketDashboard(parsed.data);
        return gatewayOk(data);
    } catch (error) {
        console.error("Gateway Market Dashboard Error:", error);
        return gatewayError(
            "MARKET_PROVIDER_UNAVAILABLE",
            "Tidak bisa mengambil data market dashboard.",
            502
        );
    }
}
