import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { signalSnapshots } from "@/db/schema";
import { fetchBitunixCandlesSince, fetchBybitCandlesSince } from "@/lib/market/exchange-fetchers";
import { isResolvable, checkCandleOutcome } from "@/lib/learning/candle-math";

export { isResolvable, checkCandleOutcome };

const BATCH_LIMIT = 20;
const CEX_SOURCES = new Set(["BITUNIX", "BYBIT"]);
const EXCHANGE_FETCH_TIMEOUT_MS = 15_000;

// In-memory lock: prevents concurrent evaluation for the same symbol+timeframe+source.
// Limitation: per-process only — not effective across multiple Node.js instances.
const runningEvaluations = new Set();

function evaluateSnapshotAgainstCandles(snapshot, allCandles) {
    if (!isResolvable(snapshot)) return null;

    const tp1 = Number(snapshot.tp1);
    const sl = Number(snapshot.sl);
    const bias = snapshot.bias;
    const snapshotCloseTime = Number(snapshot.candleCloseTime);

    const relevantCandles = allCandles.filter((c) => Number(c.openTime) > snapshotCloseTime);

    for (const candle of relevantCandles) {
        const outcome = checkCandleOutcome(candle, tp1, sl, bias);
        if (outcome) {
            return { status: outcome, reason: `${outcome.toLowerCase()}_at:${candle.openTime}` };
        }
    }

    return null;
}

function isOppositeBias(biasA, biasB) {
    if (!biasA || !biasB || biasA === "neutral" || biasB === "neutral") return false;
    return biasA !== biasB;
}

async function fetchCandlesSince({ symbol, timeframe, source, sinceMs, signal }) {
    if (source === "BITUNIX") return fetchBitunixCandlesSince({ symbol, timeframe, sinceMs, signal });
    if (source === "BYBIT") return fetchBybitCandlesSince({ symbol, timeframe, sinceMs, signal });
    return [];
}

async function fetchCandlesWithTimeout({ symbol, timeframe, source, sinceMs }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EXCHANGE_FETCH_TIMEOUT_MS);
    try {
        return await fetchCandlesSince({ symbol, timeframe, source, sinceMs, signal: controller.signal });
    } catch (err) {
        if (err.name === "AbortError") {
            console.warn("[outcome-evaluator] exchange fetch timeout", {
                symbol,
                timeframe,
                source,
                sinceMs,
                timeoutMs: EXCHANGE_FETCH_TIMEOUT_MS,
            });
            return [];
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export async function evaluateOpenSnapshotsForSymbolTimeframe({ symbol, timeframe, source, currentBias }) {
    if (!symbol || !timeframe || !CEX_SOURCES.has(source)) return;

    const lockKey = `${symbol}|${timeframe}|${source}`;
    if (runningEvaluations.has(lockKey)) {
        console.debug("[outcome-evaluator] skip duplicate run:", lockKey);
        return;
    }
    runningEvaluations.add(lockKey);

    try {
        const openSnapshots = await db.query.signalSnapshots.findMany({
            where: and(
                eq(signalSnapshots.symbol, symbol),
                eq(signalSnapshots.timeframe, timeframe),
                eq(signalSnapshots.source, source),
                eq(signalSnapshots.outcomeStatus, "OPEN"),
            ),
            columns: { id: true, bias: true, tp1: true, sl: true, candleCloseTime: true },
            limit: BATCH_LIMIT,
            orderBy: (table, { asc }) => [asc(table.candleCloseTime)],
        });

        if (openSnapshots.length === 0) return;

        const oldestCloseTime = Number(openSnapshots[0].candleCloseTime);
        const candles = await fetchCandlesWithTimeout({ symbol, timeframe, source, sinceMs: oldestCloseTime });

        const now = new Date();
        const updates = [];

        for (const snapshot of openSnapshots) {
            let result = evaluateSnapshotAgainstCandles(snapshot, candles);

            if (!result && isOppositeBias(currentBias, snapshot.bias)) {
                result = { status: "LOSS_SOFT", reason: `bias_reversed:${currentBias}` };
            }

            if (result) updates.push({ id: snapshot.id, ...result });
        }

        if (updates.length === 0) return;

        await Promise.all(
            updates.map((update) =>
                db.update(signalSnapshots)
                    .set({
                        outcomeStatus: update.status,
                        outcomeResolvedAt: now,
                        outcomeReason: update.reason,
                    })
                    .where(eq(signalSnapshots.id, update.id))
            )
        );
    } catch (error) {
        console.error("Outcome evaluator failed:", error);
    } finally {
        runningEvaluations.delete(lockKey);
    }
}
