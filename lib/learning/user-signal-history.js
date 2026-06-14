import { and, desc, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { adaptiveGateLogs, signalExposures, signalSnapshots } from "@/db/schema";

const PAGE_LIMIT = 20;

const VALID_OUTCOME_STATUSES = new Set(["OPEN", "WIN", "LOSS", "LOSS_SOFT", "AMBIGUOUS"]);
const VALID_ACTION_TYPES = new Set(["SEARCH", "REANALYZE", "DASHBOARD_VIEW", "LOCK"]);
const VALID_TIMEFRAMES = new Set(["1m", "15m", "1h", "4h", "1d"]);

export async function getUserSignalHistory({
    userEmail,
    filters = {},
    page = 1,
}) {
    if (!userEmail) return { items: [], hasMore: false, page: 1 };

    const safePage = Math.max(1, Number(page) || 1);
    const offset = (safePage - 1) * PAGE_LIMIT;

    let whereClause = eq(signalExposures.userEmail, userEmail);

    if (filters.actionType && VALID_ACTION_TYPES.has(filters.actionType)) {
        whereClause = and(whereClause, eq(signalExposures.actionType, filters.actionType));
    }

    if (filters.timeframe && VALID_TIMEFRAMES.has(filters.timeframe)) {
        whereClause = and(whereClause, eq(signalSnapshots.timeframe, filters.timeframe));
    }

    if (filters.outcomeStatus && VALID_OUTCOME_STATUSES.has(filters.outcomeStatus)) {
        whereClause = and(whereClause, eq(signalSnapshots.outcomeStatus, filters.outcomeStatus));
    }

    if (filters.symbol && typeof filters.symbol === "string") {
        const cleanSymbol = filters.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (cleanSymbol) {
            whereClause = and(whereClause, like(signalSnapshots.symbol, `%${cleanSymbol}%`));
        }
    }

    const rows = await db
        .select({
            exposureId: signalExposures.id,
            snapshotId: signalExposures.snapshotId,
            actionType: signalExposures.actionType,
            uiMode: signalExposures.uiMode,
            seenAt: signalExposures.seenAt,
            symbol: signalSnapshots.symbol,
            base: signalSnapshots.base,
            timeframe: signalSnapshots.timeframe,
            source: signalSnapshots.source,
            bias: signalSnapshots.bias,
            entry: signalSnapshots.entry,
            sl: signalSnapshots.sl,
            tp1: signalSnapshots.tp1,
            tp2: signalSnapshots.tp2,
            riskPercent: signalSnapshots.riskPercent,
            riskReward: signalSnapshots.riskReward,
            outcomeStatus: signalSnapshots.outcomeStatus,
            outcomeResolvedAt: signalSnapshots.outcomeResolvedAt,
        })
        .from(signalExposures)
        .innerJoin(signalSnapshots, eq(signalExposures.snapshotId, signalSnapshots.id))
        .where(whereClause)
        .orderBy(desc(signalExposures.seenAt))
        .limit(PAGE_LIMIT + 1)
        .offset(offset);

    const hasMore = rows.length > PAGE_LIMIT;
    const items = rows.slice(0, PAGE_LIMIT);

    // Batch fetch the latest gate log per snapshot for this user
    const snapshotIds = [...new Set(items.map((r) => r.snapshotId))];
    const gateLogMap = {};

    if (snapshotIds.length > 0) {
        const logs = await db
            .select({
                snapshotId: adaptiveGateLogs.snapshotId,
                result: adaptiveGateLogs.result,
                failedGate: adaptiveGateLogs.failedGate,
                createdAt: adaptiveGateLogs.createdAt,
            })
            .from(adaptiveGateLogs)
            .where(
                and(
                    inArray(adaptiveGateLogs.snapshotId, snapshotIds),
                    eq(adaptiveGateLogs.userEmail, userEmail)
                )
            )
            .orderBy(desc(adaptiveGateLogs.createdAt));

        // Keep only the most recent log per snapshotId
        for (const log of logs) {
            if (!gateLogMap[log.snapshotId]) {
                gateLogMap[log.snapshotId] = log;
            }
        }
    }

    return {
        items: items.map((row) => ({
            ...row,
            seenAt: row.seenAt instanceof Date ? row.seenAt.toISOString() : row.seenAt,
            gateLog: gateLogMap[row.snapshotId] ?? null,
        })),
        hasMore,
        page: safePage,
    };
}
