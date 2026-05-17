import prisma from "@/lib/prisma";
import { getFreshSignalSnapshot } from "@/lib/market-dashboard";

function toNumber(value) {
    if (value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function decimalData(signal) {
    return {
        entry: toNumber(signal.entry),
        currentPrice: toNumber(signal.price),
        sl: toNumber(signal.sl),
        tp1: toNumber(signal.tp1),
        tp2: toNumber(signal.tp2 || signal.tp),
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

    const activeSignals = await prisma.lockedSignal.findMany({
        where: { userEmail, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
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

            await prisma.lockedSignal.update({
                where: { id: lockedSignal.id },
                data: {
                    currentPrice,
                    rsi: toNumber(freshSignal.rsi),
                    emaFast: toNumber(freshSignal.emaFast),
                    emaSlow: toNumber(freshSignal.emaSlow),
                    fastPeriod: freshSignal.fastPeriod || lockedSignal.fastPeriod,
                    slowPeriod: freshSignal.slowPeriod || lockedSignal.slowPeriod,
                    stochK: toNumber(freshSignal.stochK),
                    stochD: toNumber(freshSignal.stochD),
                    sinceEntryPercent,
                    status,
                    hitAt: status === "ACTIVE" ? null : new Date(),
                    lastCheckedAt: new Date(),
                },
            });
        })
    );

    const lockedSignals = await prisma.lockedSignal.findMany({
        where: { userEmail, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
    });

    return lockedSignals.map(serializeLockedSignal);
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

    return prisma.lockedSignal.upsert({
        where: {
            locked_signal_identity: {
                userEmail,
                symbol: signal.symbol,
                timeframe: signal.timeframe || "15m",
                status: "ACTIVE",
            },
        },
        create: data,
        update: data,
    });
}

export async function deleteLockedSignalForUser({ userEmail, signalId }) {
    if (!userEmail || !signalId) {
        throw new Error("Invalid delete locked signal payload");
    }

    return prisma.lockedSignal.deleteMany({
        where: {
            id: signalId,
            userEmail,
            status: "ACTIVE",
        },
    });
}
