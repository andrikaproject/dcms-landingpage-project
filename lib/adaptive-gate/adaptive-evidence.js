import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { signalSnapshots } from "@/db/schema";
import { EVIDENCE_CONFIG } from "@/lib/adaptive-gate/gate-config";

const RESOLVED_OUTCOMES = ["WIN", "LOSS", "LOSS_SOFT", "AMBIGUOUS"];

const OUTCOME_WEIGHTS = {
    WIN: { good: 1.0, bad: 0.0 },
    LOSS: { good: 0.0, bad: 1.0 },
    LOSS_SOFT: { good: 0.0, bad: 0.5 },
    AMBIGUOUS: { good: 0.0, bad: 1.0 },
};

function computeMetrics(snapshots) {
    const recentWindowMs = EVIDENCE_CONFIG.recentWindowDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let weightedGood = 0;
    let weightedBad = 0;
    let recentSampleSize = 0;
    const counts = { WIN: 0, LOSS: 0, LOSS_SOFT: 0, AMBIGUOUS: 0 };

    for (const snap of snapshots) {
        const isRecent = snap.createdAt instanceof Date
            && (now - snap.createdAt.getTime()) < recentWindowMs;
        const weight = isRecent ? 2 : 1;
        if (isRecent) recentSampleSize++;

        const status = snap.outcomeStatus;
        if (status in counts) counts[status]++;

        const w = OUTCOME_WEIGHTS[status];
        if (w) {
            weightedGood += w.good * weight;
            weightedBad += w.bad * weight;
        }
    }

    const totalWeight = weightedGood + weightedBad;

    return {
        sampleSize: snapshots.length,
        winCount: counts.WIN,
        lossCount: counts.LOSS,
        softLossCount: counts.LOSS_SOFT,
        ambiguousCount: counts.AMBIGUOUS,
        weightedWinRate: totalWeight > 0 ? weightedGood / totalWeight : 0,
        weightedBadRate: totalWeight > 0 ? weightedBad / totalWeight : 0,
        recentSampleSize,
    };
}

async function queryByFingerprint(featureFingerprint) {
    return db.query.signalSnapshots.findMany({
        where: and(
            eq(signalSnapshots.featureFingerprint, featureFingerprint),
            inArray(signalSnapshots.outcomeStatus, RESOLVED_OUTCOMES),
        ),
        columns: { outcomeStatus: true, createdAt: true },
        limit: EVIDENCE_CONFIG.evidenceQueryLimit,
        orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
}

async function queryBroadPattern(featureFingerprint) {
    // Drop the symbol prefix (first segment) to match any symbol with the same setup pattern.
    // Format: SYMBOL|timeframe|bias|source|...
    const patternSuffix = "|" + featureFingerprint.split("|").slice(1).join("|");

    return db.query.signalSnapshots.findMany({
        where: and(
            like(signalSnapshots.featureFingerprint, `%${patternSuffix}`),
            inArray(signalSnapshots.outcomeStatus, RESOLVED_OUTCOMES),
        ),
        columns: { outcomeStatus: true, createdAt: true },
        limit: EVIDENCE_CONFIG.evidenceQueryLimit,
        orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
}

export async function getAdaptiveEvidence(featureFingerprint) {
    if (!featureFingerprint) return null;

    try {
        const exactMatches = await queryByFingerprint(featureFingerprint);

        if (exactMatches.length >= EVIDENCE_CONFIG.minimumSampleSize) {
            return { ...computeMetrics(exactMatches), queryType: "exact" };
        }

        const broadMatches = await queryBroadPattern(featureFingerprint);

        if (broadMatches.length === 0) return null;

        return { ...computeMetrics(broadMatches), queryType: "broad" };
    } catch (error) {
        console.error("Adaptive evidence query failed:", error);
        return null;
    }
}
