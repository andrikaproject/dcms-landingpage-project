"use client";

import { useEffect, useRef } from "react";
import { fetchSignalById } from "./api";
import { SIGNAL_TRACKING } from "./flags";
import { isAbortError, nextBackoffMs } from "./request";

// Status hanya berubah karena backend. Hook ini menjadwalkan pembacaan ulang;
// ia tidak menyimpulkan entry, TP, SL, atau kedaluwarsa sendiri.
export function useSignalPolling({
    signalIds = [],
    enabled = true,
    intervalMs = SIGNAL_TRACKING.pollIntervalMs,
    maxBackoffMs = SIGNAL_TRACKING.maxBackoffMs,
    onUpdate,
    onError,
}) {
    const onUpdateRef = useRef(onUpdate);
    const onErrorRef = useRef(onError);
    const idsKey = signalIds.filter(Boolean).join(",");

    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    useEffect(() => {
        if (!enabled || !idsKey || typeof window === "undefined") return undefined;

        const ids = idsKey.split(",");
        const controller = new AbortController();
        let cancelled = false;
        let timer = null;
        let backoffMs = 0;

        function schedule(delayMs) {
            if (cancelled) return;
            window.clearTimeout(timer);
            timer = window.setTimeout(poll, delayMs);
        }

        async function poll() {
            if (cancelled) return;

            // Tab tidak aktif tidak perlu membebani API; pembacaan menyusul saat kembali.
            if (typeof document !== "undefined" && document.hidden) {
                schedule(intervalMs);
                return;
            }

            const results = await Promise.allSettled(
                ids.map((signalId) => fetchSignalById(signalId, { signal: controller.signal }))
            );
            if (cancelled) return;

            let failures = 0;
            let lastError = null;

            for (const result of results) {
                if (result.status === "fulfilled") {
                    if (result.value) onUpdateRef.current?.(result.value);
                    continue;
                }
                if (isAbortError(result.reason, controller.signal)) return;
                failures += 1;
                lastError = result.reason;
            }

            if (failures === ids.length) {
                backoffMs = nextBackoffMs(backoffMs, { baseMs: intervalMs, maxMs: maxBackoffMs });
                onErrorRef.current?.(lastError, { nextRetryMs: backoffMs });
                schedule(backoffMs);
                return;
            }

            backoffMs = 0;
            onErrorRef.current?.(null);
            schedule(intervalMs);
        }

        function refreshNow() {
            if (typeof document !== "undefined" && document.hidden) return;
            backoffMs = 0;
            schedule(0);
        }

        document.addEventListener("visibilitychange", refreshNow);
        window.addEventListener("online", refreshNow);
        poll();

        return () => {
            cancelled = true;
            controller.abort();
            window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", refreshNow);
            window.removeEventListener("online", refreshNow);
        };
    }, [enabled, idsKey, intervalMs, maxBackoffMs]);
}
