import { NextResponse } from "next/server";
import { apiError, requireApiSession } from "@/lib/api-gateway";
import { fetchBitunixCandles, fetchBitunixCandlesSince } from "@/lib/market/exchange-fetchers";
import { calcVPVR } from "@/lib/market/indicators";

function aggregateToWeekly(dailyCandles) {
    const weekMap = new Map();
    for (const c of dailyCandles) {
        const date = new Date(c.openTime);
        const dow = date.getDay();
        const daysBack = dow === 0 ? 6 : dow - 1;
        const monday = new Date(date);
        monday.setDate(date.getDate() - daysBack);
        monday.setHours(0, 0, 0, 0);
        const key = monday.getTime();

        if (!weekMap.has(key)) {
            weekMap.set(key, {
                openTime: key,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
            });
        } else {
            const week = weekMap.get(key);
            week.high = Math.max(week.high, c.high);
            week.low = Math.min(week.low, c.low);
            week.close = c.close;
            week.volume += c.volume;
        }
    }
    return [...weekMap.values()].sort((a, b) => a.openTime - b.openTime);
}

export async function GET(request) {
    const { session, response } = await requireApiSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
    const rawPeriod = searchParams.get("period") || "24h";
    const period = ["24h", "weekly"].includes(rawPeriod) ? rawPeriod : "24h";

    if (!symbol) return apiError("Symbol wajib diisi.", 400);

    try {
        let candles;
        let rawDailyCount = null;

        if (period === "24h") {
            const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
            candles = await fetchBitunixCandlesSince({ symbol, timeframe: "15m", sinceMs, limit: 96 });
        } else {
            const dailyCandles = await fetchBitunixCandles(symbol, 200, true);
            rawDailyCount = dailyCandles.length;
            candles = aggregateToWeekly(dailyCandles);
        }

        if (candles.length === 0) return apiError("Tidak ada data candle.", 404);

        const closes = candles.map((c) => c.close);
        const highs = candles.map((c) => c.high);
        const lows = candles.map((c) => c.low);
        const volumes = candles.map((c) => c.volume);

        const vpvr = calcVPVR(closes, highs, lows, volumes);

        return NextResponse.json({
            period,
            candleCount: candles.length,
            ...(rawDailyCount !== null && { rawDailyCount }),
            ...vpvr,
        });
    } catch (error) {
        return apiError(error.message || "Gagal fetch VPVR.", 500);
    }
}
