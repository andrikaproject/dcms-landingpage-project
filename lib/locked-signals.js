import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lockedSignals } from "@/db/schema";
import { getFreshSignalSnapshot } from "@/lib/market-dashboard";

function toNumber(value) {
    if (value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function decimalData(signal) {
    return {
        entry: toDecimalString(signal.entry),
        currentPrice: toDecimalString(signal.price),
        sl: toDecimalString(signal.sl),
        tp1: toDecimalString(signal.tp1),
        tp2: toDecimalString(signal.tp2 || signal.tp),
        rsi: toDecimalString(signal.rsi),
        emaFast: toDecimalString(signal.emaFast),
        emaSlow: toDecimalString(signal.emaSlow),
        stochK: toDecimalString(signal.stochK),
        stochD: toDecimalString(signal.stochD),
        riskPercent: toDecimalString(signal.riskPercent),
        rewardPercent: toDecimalString(signal.rewardPercent),
        riskReward: toDecimalString(signal.riskReward),
        sinceEntryPercent: toDecimalString(signal.sinceEntryPercent),
        progressPercent: toDecimalString(signal.progressPercent),
    };
}

function toDecimalString(value) {
    const number = toNumber(value);
    return number === null ? null : String(number);
}

export function serializeLockedSignal(signal) {
    return {
        ...signal,
        entry: toNumber(signal.entry),
        currentPrice: toNumber(signal.currentPrice),
        sl: toNumber(signal.sl),
        tp1: toNumber(signal.tp1),
        tp2: toNumber(signal.tp2),
        rsi: toNumber(signal.rsi),
        emaFast: toNumber(signal.emaFast),
        emaSlow: toNumber(signal.emaSlow),
        stochK: toNumber(signal.stochK),
        stochD: toNumber(signal.stochD),
        riskPercent: toNumber(signal.riskPercent),
        rewardPercent: toNumber(signal.rewardPercent),
        riskReward: toNumber(signal.riskReward),
        sinceEntryPercent: toNumber(signal.sinceEntryPercent),
        progressPercent: toNumber(signal.progressPercent),
    };
}

export async function refreshLockedSignalsForUser(userEmail) {
    if (!userEmail) return [];

    const activeSignals = await db.query.lockedSignals.findMany({
        where: and(
            eq(lockedSignals.userEmail, userEmail),
            eq(lockedSignals.status, "ACTIVE"),
        ),
        orderBy: [desc(lockedSignals.createdAt)],
    });

    await Promise.allSettled(
        activeSignals.map(async (lockedSignal) => {
            const freshSignal = await getFreshSignalSnapshot({
                symbol: lockedSignal.symbol,
                timeframe: lockedSignal.timeframe,
            });
            const currentPrice = toNumber(freshSignal.price);
            const entry = toNumber(lockedSignal.entry);
            const sl = toNumber(lockedSignal.sl);
            const tp2 = toNumber(lockedSignal.tp2);
            const isShort = lockedSignal.bias === "short";
            const hitTp = tp2 !== null && currentPrice !== null && (isShort ? currentPrice <= tp2 : currentPrice >= tp2);
            const hitSl = sl !== null && currentPrice !== null && (isShort ? currentPrice >= sl : currentPrice <= sl);
            const status = hitTp ? "HIT_TP" : hitSl ? "HIT_SL" : "ACTIVE";
            const sinceEntryPercent = entry ? (currentPrice - entry) / entry * 100 : null;

            await db
                .update(lockedSignals)
                .set({
                    currentPrice: toDecimalString(freshSignal.price),
                    rsi: toDecimalString(freshSignal.rsi),
                    emaFast: toDecimalString(freshSignal.emaFast),
                    emaSlow: toDecimalString(freshSignal.emaSlow),
                    fastPeriod: freshSignal.fastPeriod || lockedSignal.fastPeriod,
                    slowPeriod: freshSignal.slowPeriod || lockedSignal.slowPeriod,
                    stochK: toDecimalString(freshSignal.stochK),
                    stochD: toDecimalString(freshSignal.stochD),
                    sinceEntryPercent: toDecimalString(sinceEntryPercent),
                    status,
                    hitAt: status === "ACTIVE" ? null : new Date(),
                    lastCheckedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(lockedSignals.id, lockedSignal.id));
        })
    );

    const userLockedSignals = await db.query.lockedSignals.findMany({
        where: and(
            eq(lockedSignals.userEmail, userEmail),
            eq(lockedSignals.status, "ACTIVE"),
        ),
        orderBy: [desc(lockedSignals.createdAt)],
    });

    return userLockedSignals.map(serializeLockedSignal);
}

export async function upsertLockedSignal({ session, signal }) {
    const userEmail = session?.user?.email;

    if (!userEmail || !signal?.symbol || !signal?.entry) {
        throw new Error("Invalid lock signal payload");
    }

    const data = {
        userEmail,
        uuidBitunix: session.user.uuidBitunix || null,
        symbol: signal.symbol,
        base: signal.base,
        timeframe: signal.timeframe || "15m",
        bias: signal.bias || "neutral",
        source: signal.source || null,
        marketType: signal.marketType || "CEX",
        fastPeriod: signal.fastPeriod ? Number(signal.fastPeriod) : null,
        slowPeriod: signal.slowPeriod ? Number(signal.slowPeriod) : null,
        status: "ACTIVE",
        ...decimalData(signal),
        lastCheckedAt: new Date(),
    };

    const now = new Date();
    const values = {
        ...data,
        createdAt: now,
        updatedAt: now,
    };

    await db
        .insert(lockedSignals)
        .values(values)
        .onDuplicateKeyUpdate({
            set: {
                ...data,
                updatedAt: now,
            },
        });

    return db.query.lockedSignals.findFirst({
        where: and(
            eq(lockedSignals.userEmail, userEmail),
            eq(lockedSignals.symbol, signal.symbol),
            eq(lockedSignals.timeframe, signal.timeframe || "15m"),
            eq(lockedSignals.status, "ACTIVE"),
        ),
    });
}

export async function deleteLockedSignalForUser({ userEmail, signalId }) {
    if (!userEmail || !signalId) {
        throw new Error("Invalid delete locked signal payload");
    }

    const [result] = await db
        .delete(lockedSignals)
        .where(
            and(
                eq(lockedSignals.id, signalId),
                eq(lockedSignals.userEmail, userEmail),
                eq(lockedSignals.status, "ACTIVE"),
            ),
        );

    return { count: result?.affectedRows || 0 };
}
