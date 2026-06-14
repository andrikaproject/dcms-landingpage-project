import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { signalExposures, signalSnapshots } from "@/db/schema";
import { buildFeatureFingerprint } from "@/lib/learning/feature-fingerprint";
import { isLearningSignal } from "@/lib/learning/snapshot-utils";

export { isLearningSignal };

const VALID_ACTION_TYPES = new Set(["SEARCH", "REANALYZE", "DASHBOARD_VIEW", "LOCK"]);
const VALID_UI_MODES = new Set(["STANDARD", "CONSERVATIVE", "UNKNOWN"]);

function toDecimalString(value) {
    if (value === null || value === undefined) return null;

    const number = Number(value);
    return Number.isFinite(number) ? String(value) : null;
}

function toNumberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeActionType(actionType) {
    const normalizedActionType = String(actionType || "SEARCH").trim().toUpperCase();
    return VALID_ACTION_TYPES.has(normalizedActionType) ? normalizedActionType : "SEARCH";
}

function normalizeUiMode(uiMode) {
    const normalizedUiMode = String(uiMode || "UNKNOWN").trim().toUpperCase();
    return VALID_UI_MODES.has(normalizedUiMode) ? normalizedUiMode : "UNKNOWN";
}

function getSnapshotIdentity(signal) {
    return and(
        eq(signalSnapshots.symbol, signal.symbol),
        eq(signalSnapshots.timeframe, signal.timeframe || "15m"),
        eq(signalSnapshots.source, signal.source),
        eq(signalSnapshots.candleCloseTime, Number(signal.candleCloseTime)),
        eq(signalSnapshots.engineVersion, signal.engineVersion),
    );
}

async function findSnapshotBySignal(signal) {
    return db.query.signalSnapshots.findFirst({
        where: getSnapshotIdentity(signal),
        columns: {
            id: true,
            featureFingerprint: true,
        },
    });
}

export async function upsertSignalSnapshot(signal) {
    if (!isLearningSignal(signal)) return null;

    const featureFingerprint = buildFeatureFingerprint(signal);
    const snapshotValues = {
        symbol: signal.symbol,
        base: signal.base || signal.symbol.replace(/USDT$/, ""),
        timeframe: signal.timeframe || "15m",
        source: signal.source,
        marketType: signal.marketType || "CEX",
        engineVersion: signal.engineVersion,
        candleOpenTime: Number(signal.candleOpenTime),
        candleCloseTime: Number(signal.candleCloseTime),
        bias: signal.bias || "neutral",
        entry: toDecimalString(signal.entry),
        currentPriceAtSignal: toDecimalString(signal.price),
        sl: toDecimalString(signal.sl),
        tp1: toDecimalString(signal.tp1),
        tp2: toDecimalString(signal.tp2 || signal.tp),
        rsi: toDecimalString(signal.rsi),
        emaFast: toDecimalString(signal.emaFast),
        emaSlow: toDecimalString(signal.emaSlow),
        fastPeriod: toNumberOrNull(signal.fastPeriod),
        slowPeriod: toNumberOrNull(signal.slowPeriod),
        stochK: toDecimalString(signal.stochK),
        stochD: toDecimalString(signal.stochD),
        poc: toDecimalString(signal.poc),
        trendline: signal.trendline || null,
        support: toDecimalString(signal.support),
        resistance: toDecimalString(signal.resistance),
        keyMid: toDecimalString(signal.keyMid),
        atr: toDecimalString(signal.atr),
        riskPercent: toDecimalString(signal.riskPercent),
        rewardPercent: toDecimalString(signal.rewardPercent),
        riskReward: toDecimalString(signal.riskReward),
        tp1RiskReward: toDecimalString(signal.tp1RiskReward),
        featureFingerprint,
        outcomeStatus: "OPEN",
    };

    try {
        await db.insert(signalSnapshots).values(snapshotValues);
    } catch (error) {
        if (error?.code !== "ER_DUP_ENTRY") throw error;
    }

    const snapshot = await findSnapshotBySignal(signal);

    return snapshot
        ? {
            snapshotId: snapshot.id,
            featureFingerprint: snapshot.featureFingerprint || featureFingerprint,
        }
        : null;
}

export async function createSignalExposure({
    snapshotId,
    session,
    actionType = "SEARCH",
    uiMode = "UNKNOWN",
    lockedSignalId = null,
}) {
    const userEmail = session?.user?.email;

    if (!snapshotId || !userEmail) return null;

    await db.insert(signalExposures).values({
        snapshotId,
        userEmail,
        uuidBitunix: session.user.uuidBitunix || null,
        actionType: normalizeActionType(actionType),
        uiMode: normalizeUiMode(uiMode),
        lockedSignalId,
    });

    return { snapshotId };
}

export async function attachSignalMemory({
    signal,
    session,
    actionType = "SEARCH",
    uiMode = "UNKNOWN",
}) {
    if (!isLearningSignal(signal)) {
        return { signal, snapshotId: null, featureFingerprint: null };
    }

    try {
        const snapshot = await upsertSignalSnapshot(signal);

        if (!snapshot?.snapshotId) {
            return { signal, snapshotId: null, featureFingerprint: null };
        }

        await createSignalExposure({
            snapshotId: snapshot.snapshotId,
            session,
            actionType,
            uiMode,
        });

        return {
            signal: {
                ...signal,
                snapshotId: snapshot.snapshotId,
                featureFingerprint: snapshot.featureFingerprint,
            },
            snapshotId: snapshot.snapshotId,
            featureFingerprint: snapshot.featureFingerprint,
        };
    } catch (error) {
        console.error("Signal memory write failed:", error);
        return { signal, snapshotId: null, featureFingerprint: null };
    }
}
