"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { lockSignalPlan } from "@/lib/signals/api";
import { SIGNAL_FLAGS, SIGNAL_TRACKING } from "@/lib/signals/flags";
import { isLiveStatus } from "@/lib/signals/lifecycle";
import { isNewerSignalUpdate, planKey } from "@/lib/signals/plan";
import { hideCard, readBoardCache, rememberCard, writeBoardCache } from "@/lib/signals/storage";
import { useSignalPolling } from "@/lib/signals/useSignalPolling";
import NoSetupCard from "./NoSetupCard";
import PendingSignalCard from "./PendingSignalCard";

const CLOCK_TICK_MS = 30_000;

export default function PendingSignalSection({
    timeframe,
    plans,
    noSetups,
    monitoredPlanIds = new Set(),
    onPlanUpdate,
    onPlanRemove,
    onNoSetupDismiss,
    onAddToBoard,
    onLocked,
    onToast,
}) {
    const [now, setNow] = useState(() => Date.now());
    const [lockState, setLockState] = useState({});
    const [pollError, setPollError] = useState("");

    // Jam ini hanya menyegarkan label countdown dan kesegaran data.
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
        return () => window.clearInterval(timer);
    }, []);

    const trackedIds = useMemo(
        () => plans.filter((plan) => plan.signalId && isLiveStatus(plan.status)).map((plan) => plan.signalId),
        [plans]
    );

    const handlePolled = useCallback((nextPlan) => {
        onPlanUpdate(nextPlan, { source: "poll" });
    }, [onPlanUpdate]);

    const handlePollError = useCallback((error, meta) => {
        if (!error) {
            setPollError("");
            return;
        }
        const retrySeconds = Math.round((meta?.nextRetryMs || 0) / 1000);
        setPollError(`Pembaruan status gagal: ${error.message || "koneksi bermasalah"}. Mencoba lagi dalam ${retrySeconds} detik.`);
    }, []);

    useSignalPolling({
        signalIds: trackedIds,
        enabled: trackedIds.length > 0,
        intervalMs: SIGNAL_TRACKING.pollIntervalMs,
        maxBackoffMs: SIGNAL_TRACKING.maxBackoffMs,
        onUpdate: handlePolled,
        onError: handlePollError,
    });

    async function handleLock(plan) {
        const key = planKey(plan);
        setLockState((current) => ({ ...current, [key]: { isLocking: true, error: "" } }));

        try {
            const payload = await lockSignalPlan(plan);
            setLockState((current) => ({ ...current, [key]: { isLocking: false, error: "" } }));
            if (payload?.signal) onLocked?.(payload.signal);
            onToast?.("success", `${plan.base} dipantau di Lock Signal.`);
        } catch (error) {
            const message = error?.message || "Gagal menambahkan signal ke pemantauan.";
            setLockState((current) => ({ ...current, [key]: { isLocking: false, error: message } }));
            onToast?.("error", message);
        }
    }

    // Kartu pindah ke Signal Board: rencananya disalin ke board, kartu pending
    // ditutup, dan preferensi itu diingat supaya tidak muncul lagi setelah
    // reload. Evaluasi backend tetap jalan.
    function handleAddToBoard(plan) {
        const added = onAddToBoard?.(plan);
        if (added === false) return;

        const cache = hideCard(readBoardCache(timeframe), { signalId: plan.signalId, symbol: plan.symbol, timeframe });
        writeBoardCache(timeframe, cache);
        onPlanRemove(plan);
    }

    if (plans.length === 0 && noSetups.length === 0) return null;

    return (
        <section className="mb-6 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Rencana Trading</p>
                    <h2 className="mt-1 font-nebulica text-[clamp(1.1rem,1rem+0.6vw,1.35rem)] font-bold text-white">
                        Hasil Analisis
                    </h2>
                </div>
                {SIGNAL_FLAGS.pendingSignalsPreview && (
                    <span className="rounded-md border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-1 font-chakra text-[10px] font-bold text-fuchsia-200">
                        Data contoh sintetis
                    </span>
                )}
            </div>

            {pollError && (
                <p className="rounded-lg border border-yellow-400/20 bg-yellow-500/10 px-3 py-2 font-chakra text-xs text-yellow-200">
                    {pollError}
                </p>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
                {noSetups.map((entry) => (
                    <NoSetupCard
                        key={`${entry.symbol}-${entry.generatedAt || entry.requestedAt}`}
                        symbol={entry.symbol}
                        timeframe={entry.timeframe}
                        reasons={entry.reasons}
                        reasonSummary={entry.reasonSummary}
                        generatedAt={entry.generatedAt}
                        onDismiss={() => onNoSetupDismiss(entry)}
                    />
                ))}

                {plans.map((plan) => {
                    const key = planKey(plan);
                    const state = lockState[key] || {};

                    return (
                        <PendingSignalCard
                            key={key}
                            plan={plan}
                            now={now}
                            isLocking={Boolean(state.isLocking)}
                            isLocked={monitoredPlanIds.has(plan.signalId)}
                            lockError={state.error || ""}
                            onLock={handleLock}
                            onAddToBoard={handleAddToBoard}
                        />
                    );
                })}
            </div>
        </section>
    );
}

// Dipakai workspace agar update polling dan hasil analisis memakai aturan
// urutan yang sama.
export function upsertPlan(plans, nextPlan) {
    const key = planKey(nextPlan);
    const index = plans.findIndex((plan) => planKey(plan) === key);
    if (index === -1) return [nextPlan, ...plans];

    const merged = isNewerSignalUpdate(plans[index], nextPlan) ? nextPlan : plans[index];
    return [...plans.slice(0, index), merged, ...plans.slice(index + 1)];
}

export function rememberPlan(timeframe, plan) {
    const cache = rememberCard(readBoardCache(timeframe), {
        signalId: plan.signalId,
        symbol: plan.symbol,
        timeframe: plan.timeframe || timeframe,
        addedAt: plan.publishedAt || plan.generatedAt,
    });
    writeBoardCache(timeframe, cache);
}
