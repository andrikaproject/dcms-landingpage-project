import { NextResponse } from "next/server";
import { apiError, enforceRateLimit, requireApiSession } from "@/lib/api-gateway";
import {
    getCachedPwlProximityScannerResult,
    scanPwlProximity,
} from "@/lib/market/pwl-proximity-scanner";
import { createPwlScannerRouteHandler } from "@/lib/market/pwl-proximity-scanner-route";
import { normalizeScannerLevel } from "@/lib/market/pwl-proximity-scanner-core";

const handleRequest = createPwlScannerRouteHandler({
    requireSession: requireApiSession,
    enforceLimit: (email) =>
        enforceRateLimit(`api-market-analysis-pwl-scanner:${email}`, {
            limit: 6,
            windowMs: 5 * 60 * 1000,
        }),
    getCached: getCachedPwlProximityScannerResult,
    scan: scanPwlProximity,
    json: (data, { cacheStatus }) =>
        NextResponse.json(data, {
            headers: {
                "Cache-Control": "private, no-store",
                "X-PWL-Scanner-Cache": cacheStatus,
            },
        }),
    error: apiError,
});

export async function GET(request) {
    const level = normalizeScannerLevel(
        new URL(request.url).searchParams.get("level")
    );
    return handleRequest(level);
}
