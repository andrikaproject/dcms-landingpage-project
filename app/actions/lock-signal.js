"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { deleteLockedSignalForUser, upsertLockedSignal } from "@/lib/locked-signals";
import { authActionClient, rateLimitAction } from "@/lib/safe-action";

const optionalNumber = zfd
    .numeric(z.number().finite().optional())
    .transform((value) => value ?? null);

const timeframeSchema = z.string().trim().regex(/^[0-9]{1,2}[mhdw]$/, "Timeframe tidak valid.");
const symbolSchema = z.string().trim().min(1).max(32).regex(/^[A-Z0-9:_/-]+$/i, "Symbol tidak valid.");

const lockSignalSchema = zfd.formData({
    symbol: zfd.text(symbolSchema),
    base: zfd.text(symbolSchema),
    timeframe: zfd.text(timeframeSchema),
    bias: zfd.text(z.enum(["long", "short", "neutral"])),
    source: zfd.text(z.string().trim().max(32).optional()).transform((value) => value || ""),
    marketType: zfd.text(z.enum(["CEX", "DEX"]).optional()).transform((value) => value || "CEX"),
    entry: zfd.numeric(z.number().finite().positive("Entry tidak valid.")),
    price: zfd.numeric(z.number().finite().positive("Price tidak valid.")),
    sl: optionalNumber,
    tp1: optionalNumber,
    tp2: optionalNumber,
    rsi: optionalNumber,
    emaFast: optionalNumber,
    emaSlow: optionalNumber,
    fastPeriod: optionalNumber,
    slowPeriod: optionalNumber,
    stochK: optionalNumber,
    stochD: optionalNumber,
    riskPercent: optionalNumber,
    rewardPercent: optionalNumber,
    riskReward: optionalNumber,
    sinceEntryPercent: optionalNumber,
    progressPercent: optionalNumber,
});

const lockSignalRateLimit = rateLimitAction({
    keyPrefix: "lock-signal",
    limit: 30,
    windowMs: 60 * 1000,
});

const lockSignalSafeAction = authActionClient
    .use(lockSignalRateLimit)
    .inputSchema(lockSignalSchema)
    .action(async ({ parsedInput, ctx }) => {
        await upsertLockedSignal({
            session: ctx.session,
            signal: parsedInput,
        });

        redirect("/dashboard#lock-signal-list");
    });

const removeLockedSignalSafeAction = authActionClient
    .use(lockSignalRateLimit)
    .inputSchema(zfd.formData({ signalId: zfd.text(z.string().trim().uuid("Signal ID tidak valid.")) }))
    .action(async ({ parsedInput: { signalId }, ctx }) => {
        await deleteLockedSignalForUser({
            userEmail: ctx.user.email,
            signalId,
        });

        redirect("/dashboard#lock-signal-list");
    });

export async function lockSignalAction(formData) {
    const result = await lockSignalSafeAction(formData);

    if (result?.serverError === "Silakan login terlebih dahulu.") {
        redirect("/login");
    }

    redirect("/dashboard#lock-signal-list");
}

export async function removeLockedSignalAction(formData) {
    const result = await removeLockedSignalSafeAction(formData);

    if (result?.serverError === "Silakan login terlebih dahulu.") {
        redirect("/login");
    }

    redirect("/dashboard#lock-signal-list");
}
