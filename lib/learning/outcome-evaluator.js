import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { signalSnapshots } from "@/db/schema";
import { fetchBinanceCandlesSince, fetchBybitCandlesSince } from "@/lib/market/exchange-fetchers";
import { isResolvable, checkCandleOutcome } from "@/lib/learning/candle-math";

export { isResolvable, checkCandleOutcome };

const BATCH_LIMIT = 20;
const CEX_SOURCES = new Set(["BINANCE", "BYBIT"]);

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

async function fetchCandlesSince({ symbol, timeframe, source, sinceMs }) {
    if (source === "BINANCE") return fetchBinanceCandlesSince({ symbol, timeframe, sinceMs });
    if (source === "BYBIT") return fetchBybitCandlesSince({ symbol, timeframe, sinceMs });
    return [];
}

export async function evaluateOpenSnapshotsForSymbolTimeframe({ symbol, timeframe, source, currentBias }) {
    if (!symbol || !timeframe || !CEX_SOURCES.has(source)) return;

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
        const candles = await fetchCandlesSince({ symbol, timeframe, source, sinceMs: oldestCloseTime });

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
    }
}
