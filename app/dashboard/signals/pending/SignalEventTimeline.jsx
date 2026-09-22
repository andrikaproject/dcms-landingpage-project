"use client";

import { useEffect, useState } from "react";
import { fetchSignalEvents } from "@/lib/signals/api";
import { describeStatus } from "@/lib/signals/lifecycle";
import { formatUserTime } from "@/lib/signals/format";
import { shouldFallbackToLegacy } from "@/lib/signals/request";

export default function SignalEventTimeline({ signalId }) {
    const [state, setState] = useState({ status: "loading", events: [], message: "" });

    useEffect(() => {
        if (!signalId) return undefined;

        const controller = new AbortController();

        fetchSignalEvents(signalId, { signal: controller.signal })
            .then((payload) => {
                if (controller.signal.aborted) return;
                setState({ status: "ready", events: payload.events, message: "" });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setState({
                    status: shouldFallbackToLegacy(error) ? "unavailable" : "error",
                    events: [],
                    message: shouldFallbackToLegacy(error)
                        ? "Endpoint histori lifecycle belum tersedia di backend."
                        : error?.message || "Histori status gagal dimuat.",
                });
            });

        return () => controller.abort();
    }, [signalId]);

    // Rencana legacy belum punya signalId, jadi tidak ada histori yang bisa diminta.
    if (!signalId) {
        return (
            <div>
                <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Histori Status</p>
                <p className="mt-2 font-chakra text-[11px] text-zinc-500">
                    Histori status tersedia setelah backend menerbitkan signalId.
                </p>
            </div>
        );
    }

    return (
        <div>
            <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Histori Status</p>

            {state.status === "loading" && <p className="mt-2 font-chakra text-[11px] text-zinc-500">Memuat histori…</p>}
            {(state.status === "unavailable" || state.status === "error") && (
                <p className={`mt-2 font-chakra text-[11px] ${state.status === "error" ? "text-red-300" : "text-zinc-500"}`}>{state.message}</p>
            )}
            {state.status === "ready" && state.events.length === 0 && (
                <p className="mt-2 font-chakra text-[11px] text-zinc-500">Belum ada perubahan status tercatat.</p>
            )}

            {state.status === "ready" && state.events.length > 0 && (
                <ol className="mt-2 space-y-1.5">
                    {state.events.map((event, index) => {
                        const status = describeStatus(event.toStatus ?? event.status);
                        return (
                            <li key={event.id || `${event.toStatus ?? event.status}-${index}`} className="flex items-start justify-between gap-3 border-b border-white/[0.04] pb-1.5 last:border-b-0">
                                <span className="font-chakra text-[11px] text-zinc-300">
                                    {status.label}
                                    {event.eventType ? <span className="text-zinc-500"> · {event.eventType}</span> : null}
                                </span>
                                <span className="shrink-0 font-chakra text-[10px] text-zinc-600">
                                    {formatUserTime(event.occurredAt || event.createdAt)}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
