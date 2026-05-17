"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { deleteLockedSignalForUser, upsertLockedSignal } from "@/lib/locked-signals";

function readNumber(formData, key) {
    const value = formData.get(key);
    if (value === null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export async function lockSignalAction(formData) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    await upsertLockedSignal({
        session,
        signal: {
            symbol: String(formData.get("symbol") || ""),
            base: String(formData.get("base") || ""),
            timeframe: String(formData.get("timeframe") || "15m"),
            bias: String(formData.get("bias") || "neutral"),
            source: String(formData.get("source") || ""),
            marketType: String(formData.get("marketType") || "CEX"),
            entry: readNumber(formData, "entry"),
            price: readNumber(formData, "price"),
            sl: readNumber(formData, "sl"),
            tp1: readNumber(formData, "tp1"),
            tp2: readNumber(formData, "tp2"),
            rsi: readNumber(formData, "rsi"),
            emaFast: readNumber(formData, "emaFast"),
            emaSlow: readNumber(formData, "emaSlow"),
            fastPeriod: readNumber(formData, "fastPeriod"),
            slowPeriod: readNumber(formData, "slowPeriod"),
            stochK: readNumber(formData, "stochK"),
            stochD: readNumber(formData, "stochD"),
            riskPercent: readNumber(formData, "riskPercent"),
            rewardPercent: readNumber(formData, "rewardPercent"),
            riskReward: readNumber(formData, "riskReward"),
            sinceEntryPercent: readNumber(formData, "sinceEntryPercent"),
            progressPercent: readNumber(formData, "progressPercent"),
        },
    });

    redirect("/dashboard#lock-signal-list");
}

export async function removeLockedSignalAction(formData) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    await deleteLockedSignalForUser({
        userEmail: session.user.email,
        signalId: String(formData.get("signalId") || ""),
    });

    redirect("/dashboard#lock-signal-list");
}
