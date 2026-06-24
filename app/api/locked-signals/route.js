import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { apiError, requireApiSession } from "@/lib/api-gateway";
import { db } from "@/db";
import { lockedSignals } from "@/db/schema";
import { upsertLockedSignal } from "@/lib/locked-signals";

const PAGE_LIMIT = 20;
const VALID_STATUSES = new Set(["ACTIVE", "HIT_TP", "HIT_SL"]);

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function serializeRow(row) {
    return {
        id: row.id,
        symbol: row.symbol,
        base: row.base,
        timeframe: row.timeframe,
        bias: row.bias,
        source: row.source,
        marketType: row.marketType,
        status: row.status,
        entry: toNumber(row.entry),
        sl: toNumber(row.sl),
        tp1: toNumber(row.tp1),
        tp2: toNumber(row.tp2),
        riskReward: toNumber(row.riskReward),
        riskPercent: toNumber(row.riskPercent),
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt ?? null),
        hitAt: row.hitAt instanceof Date ? row.hitAt.toISOString() : (row.hitAt ?? null),
        lastCheckedAt: row.lastCheckedAt instanceof Date ? row.lastCheckedAt.toISOString() : (row.lastCheckedAt ?? null),
    };
}

export async function POST(request) {
    const { session, response } = await requireApiSession();
    if (response) return response;

    let body;
    try {
        body = await request.json();
    } catch {
        return apiError("Body tidak valid.", 400);
    }

    const { symbol, base, timeframe, bias, source, marketType, entry, price,
            sl, tp1, tp2, rsi, emaFast, emaSlow, fastPeriod, slowPeriod,
            stochK, stochD, riskPercent, rewardPercent, riskReward,
            sinceEntryPercent, progressPercent } = body;

    if (!symbol || !base || !timeframe || !bias || !entry || !price) {
        return apiError("Field wajib tidak lengkap.", 400);
    }

    try {
        const locked = await upsertLockedSignal({
            session,
            signal: { symbol, base, timeframe, bias, source, marketType,
                       entry, price, sl, tp1, tp2, rsi, emaFast, emaSlow,
                       fastPeriod, slowPeriod, stochK, stochD, riskPercent,
                       rewardPercent, riskReward, sinceEntryPercent, progressPercent },
        });
        return NextResponse.json({ id: locked?.id ?? null });
    } catch (error) {
        return apiError(error.message || "Gagal lock signal.", 500);
    }
}

export async function GET(request) {
    const { session, response } = await requireApiSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const statusParam = searchParams.get("status") || "";

    let whereClause = eq(lockedSignals.userEmail, session.user.email);

    if (statusParam && VALID_STATUSES.has(statusParam)) {
        whereClause = and(whereClause, eq(lockedSignals.status, statusParam));
    } else {
        whereClause = and(whereClause, inArray(lockedSignals.status, ["ACTIVE", "HIT_TP", "HIT_SL"]));
    }

    try {
        const rows = await db
            .select({
                id: lockedSignals.id,
                symbol: lockedSignals.symbol,
                base: lockedSignals.base,
                timeframe: lockedSignals.timeframe,
                bias: lockedSignals.bias,
                source: lockedSignals.source,
                marketType: lockedSignals.marketType,
                status: lockedSignals.status,
                entry: lockedSignals.entry,
                sl: lockedSignals.sl,
                tp1: lockedSignals.tp1,
                tp2: lockedSignals.tp2,
                riskReward: lockedSignals.riskReward,
                riskPercent: lockedSignals.riskPercent,
                createdAt: lockedSignals.createdAt,
                hitAt: lockedSignals.hitAt,
                lastCheckedAt: lockedSignals.lastCheckedAt,
            })
            .from(lockedSignals)
            .where(whereClause)
            .orderBy(desc(lockedSignals.createdAt))
            .limit(PAGE_LIMIT + 1)
            .offset((page - 1) * PAGE_LIMIT);

        const hasMore = rows.length > PAGE_LIMIT;
        return NextResponse.json({
            items: rows.slice(0, PAGE_LIMIT).map(serializeRow),
            hasMore,
            page,
        });
    } catch (error) {
        return apiError(error.message || "Gagal fetch locked signals.", 500);
    }
}
