import { and, count, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { adaptiveGateLogs, signalExposures, signalSnapshots } from "@/db/schema";

const VALID_TIMEFRAMES = new Set(["1m", "15m", "1h", "4h", "1d"]);
const VALID_SOURCES = new Set(["BITUNIX", "BYBIT"]);

// ─── Snapshot Summary ─────────────────────────────────────────────────────────

export async function getSnapshotSummary({ timeframe, source } = {}) {
    const conditions = [];
    if (timeframe && VALID_TIMEFRAMES.has(timeframe)) {
        conditions.push(eq(signalSnapshots.timeframe, timeframe));
    }
    if (source && VALID_SOURCES.has(source)) {
        conditions.push(eq(signalSnapshots.source, source));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [row] = await db
        .select({
            total: count(),
            open: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'OPEN' THEN 1 ELSE 0 END)`,
            win: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'WIN' THEN 1 ELSE 0 END)`,
            loss: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'LOSS' THEN 1 ELSE 0 END)`,
            softLoss: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'LOSS_SOFT' THEN 1 ELSE 0 END)`,
            ambiguous: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'AMBIGUOUS' THEN 1 ELSE 0 END)`,
        })
        .from(signalSnapshots)
        .where(whereClause);

    const total = Number(row?.total || 0);
    const open = Number(row?.open || 0);
    const win = Number(row?.win || 0);
    const loss = Number(row?.loss || 0);
    const softLoss = Number(row?.softLoss || 0);
    const ambiguous = Number(row?.ambiguous || 0);
    const resolved = win + loss + softLoss + ambiguous;

    return { total, open, resolved, win, loss, softLoss, ambiguous };
}

// ─── Breakdowns ───────────────────────────────────────────────────────────────

export async function getTimeframeBreakdown() {
    return db
        .select({ timeframe: signalSnapshots.timeframe, count: count() })
        .from(signalSnapshots)
        .groupBy(signalSnapshots.timeframe)
        .orderBy(desc(count()));
}

export async function getSourceBreakdown() {
    return db
        .select({ source: signalSnapshots.source, count: count() })
        .from(signalSnapshots)
        .groupBy(signalSnapshots.source)
        .orderBy(desc(count()));
}

export async function getEngineVersionBreakdown() {
    return db
        .select({ engineVersion: signalSnapshots.engineVersion, count: count() })
        .from(signalSnapshots)
        .groupBy(signalSnapshots.engineVersion)
        .orderBy(desc(count()))
        .limit(5);
}

// ─── Gate Log Metrics ─────────────────────────────────────────────────────────

export async function getGateLogSummary({ timeframe } = {}) {
    const conditions = [];
    if (timeframe && VALID_TIMEFRAMES.has(timeframe)) {
        // gate logs don't have timeframe — join to snapshot for filtering
    }

    const [row] = await db
        .select({
            total: count(),
            longValid: sql`SUM(CASE WHEN ${adaptiveGateLogs.result} = 'LONG_VALID' THEN 1 ELSE 0 END)`,
            shortValid: sql`SUM(CASE WHEN ${adaptiveGateLogs.result} = 'SHORT_VALID' THEN 1 ELSE 0 END)`,
            notReady: sql`SUM(CASE WHEN ${adaptiveGateLogs.result} = 'NOT_READY' THEN 1 ELSE 0 END)`,
        })
        .from(adaptiveGateLogs);

    const total = Number(row?.total || 0);
    const longValid = Number(row?.longValid || 0);
    const shortValid = Number(row?.shortValid || 0);
    const notReady = Number(row?.notReady || 0);

    return { total, longValid, shortValid, notReady };
}

export async function getTopFailedGates() {
    const rows = await db
        .select({
            failedGate: adaptiveGateLogs.failedGate,
            count: count(),
        })
        .from(adaptiveGateLogs)
        .where(isNotNull(adaptiveGateLogs.failedGate))
        .groupBy(adaptiveGateLogs.failedGate)
        .orderBy(desc(count()))
        .limit(6);

    return rows.filter((r) => r.failedGate !== null);
}

export async function getTopRejectionReasons() {
    // Fetch recent gate logs with reasons and aggregate in JS.
    const logs = await db
        .select({ reasonsJson: adaptiveGateLogs.reasonsJson })
        .from(adaptiveGateLogs)
        .where(isNotNull(adaptiveGateLogs.reasonsJson))
        .orderBy(desc(adaptiveGateLogs.createdAt))
        .limit(500);

    const reasonCounts = {};
    for (const log of logs) {
        try {
            const reasons = JSON.parse(log.reasonsJson || "[]");
            for (const reason of reasons) {
                if (typeof reason === "string" && reason.trim()) {
                    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                }
            }
        } catch {
            // ignore invalid JSON
        }
    }

    return Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([reason, count]) => ({ reason, count }));
}

// ─── Pattern Metrics ──────────────────────────────────────────────────────────

export async function getTopPatterns({ limit = 5 } = {}) {
    const rows = await db
        .select({
            fingerprint: signalSnapshots.featureFingerprint,
            total: count(),
            winCount: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'WIN' THEN 1 ELSE 0 END)`,
            lossCount: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'LOSS' THEN 1 ELSE 0 END)`,
            softCount: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'LOSS_SOFT' THEN 1 ELSE 0 END)`,
            ambiguousCount: sql`SUM(CASE WHEN ${signalSnapshots.outcomeStatus} = 'AMBIGUOUS' THEN 1 ELSE 0 END)`,
        })
        .from(signalSnapshots)
        .where(and(
            isNotNull(signalSnapshots.featureFingerprint),
            ne(signalSnapshots.outcomeStatus, "OPEN")
        ))
        .groupBy(signalSnapshots.featureFingerprint)
        .having(sql`COUNT(*) >= 5`)
        .limit(200);

    const patterns = rows.map((r) => {
        const total = Number(r.total);
        const win = Number(r.winCount || 0);
        const loss = Number(r.lossCount || 0);
        const soft = Number(r.softCount || 0);
        const ambiguous = Number(r.ambiguousCount || 0);
        const winRate = total > 0 ? win / total : 0;
        const badRate = total > 0 ? (loss + ambiguous + soft * 0.5) / total : 0;
        return { fingerprint: r.fingerprint, total, win, loss, soft, ambiguous, winRate, badRate };
    });

    const best = [...patterns].sort((a, b) => b.winRate - a.winRate).slice(0, limit);
    const worst = [...patterns].sort((a, b) => b.badRate - a.badRate).slice(0, limit);

    return { best, worst };
}

// ─── Pattern Readiness ────────────────────────────────────────────────────────

export async function getPatternReadinessStats() {
    const rows = await db
        .select({
            fingerprint: signalSnapshots.featureFingerprint,
            resolvedCount: count(),
        })
        .from(signalSnapshots)
        .where(and(
            isNotNull(signalSnapshots.featureFingerprint),
            ne(signalSnapshots.outcomeStatus, "OPEN"),
        ))
        .groupBy(signalSnapshots.featureFingerprint);

    let ready = 0, warming = 0, cold = 0, totalResolvedSnapshots = 0;

    for (const row of rows) {
        const n = Number(row.resolvedCount);
        totalResolvedSnapshots += n;
        if (n >= 20) ready++;
        else if (n >= 5) warming++;
        else cold++;
    }

    return { ready, warming, cold, totalPatterns: rows.length, totalResolvedSnapshots };
}

export async function getReadinessByTimeframe() {
    const rows = await db
        .select({
            fingerprint: signalSnapshots.featureFingerprint,
            resolvedCount: count(),
        })
        .from(signalSnapshots)
        .where(and(
            isNotNull(signalSnapshots.featureFingerprint),
            ne(signalSnapshots.outcomeStatus, "OPEN"),
        ))
        .groupBy(signalSnapshots.featureFingerprint);

    const tfMap = {};
    for (const row of rows) {
        const tf = (row.fingerprint || "").split("|")[1] || "unknown";
        if (!tfMap[tf]) tfMap[tf] = { ready: 0, warming: 0, cold: 0 };
        const n = Number(row.resolvedCount);
        if (n >= 20) tfMap[tf].ready++;
        else if (n >= 5) tfMap[tf].warming++;
        else tfMap[tf].cold++;
    }

    const TF_ORDER = { "1m": 0, "15m": 1, "1h": 2, "4h": 3, "1d": 4 };
    return Object.entries(tfMap)
        .sort(([a], [b]) => (TF_ORDER[a] ?? 99) - (TF_ORDER[b] ?? 99))
        .map(([timeframe, counts]) => ({ timeframe, ...counts }));
}

// ─── User Exposure Summary ────────────────────────────────────────────────────

export async function getExposureSummary() {
    const [row] = await db
        .select({
            total: count(),
            uniqueUsers: sql`COUNT(DISTINCT ${signalExposures.userEmail})`,
            searchCount: sql`SUM(CASE WHEN ${signalExposures.actionType} = 'SEARCH' THEN 1 ELSE 0 END)`,
            reanalyzeCount: sql`SUM(CASE WHEN ${signalExposures.actionType} = 'REANALYZE' THEN 1 ELSE 0 END)`,
        })
        .from(signalExposures);

    return {
        total: Number(row?.total || 0),
        uniqueUsers: Number(row?.uniqueUsers || 0),
        searchCount: Number(row?.searchCount || 0),
        reanalyzeCount: Number(row?.reanalyzeCount || 0),
    };
}
