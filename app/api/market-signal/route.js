import { NextResponse } from "next/server";
import { apiError, enforceRateLimit, requireApiSession } from "@/lib/api-gateway";
import { attachSignalMemory } from "@/lib/learning/signal-snapshots";
import { evaluateOpenSnapshotsForSymbolTimeframe } from "@/lib/learning/outcome-evaluator";
import { evaluateConservativeGate } from "@/lib/adaptive-gate/index";
import { saveGateLog } from "@/lib/adaptive-gate/manual-gate";
import { getFreshSignalSnapshot } from "@/lib/market-dashboard";
import { ADAPTIVE_GATE } from "@/lib/feature-flags";

function getActionType(value) {
    const actionType = String(value || "SEARCH").trim().toUpperCase();
    return actionType === "REANALYZE" ? "REANALYZE" : "SEARCH";
}

export async function GET(request) {
    const { session, response } = await requireApiSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "15m";
    const symbol = searchParams.get("symbol") || "";
    const actionType = getActionType(searchParams.get("action"));

    if (!symbol.trim()) {
        return apiError("Symbol wajib diisi.", 400);
    }

    const rateLimit = await enforceRateLimit(`api-market-signal:${session.user.email}`, {
        limit: 30,
        windowMs: 10 * 60 * 1000,
    });

    if (rateLimit.response) {
        const payload = await rateLimit.response.json();
        return NextResponse.json(
            {
                error: payload.error?.message || "Terlalu banyak percobaan.",
                retryAfter: payload.error?.retryAfter || 0,
            },
            { status: 429 }
        );
    }

    try {
        const signal = await getFreshSignalSnapshot({ symbol, timeframe });

        const memory = ADAPTIVE_GATE.snapshotLogging
            ? await attachSignalMemory({ signal, session, actionType, uiMode: "STANDARD" })
            : { signal, snapshotId: null, featureFingerprint: null };

        const conservativeGate = ADAPTIVE_GATE.manualMode
            ? await evaluateConservativeGate(signal, { featureFingerprint: memory.featureFingerprint })
            : null;

        if (signal.source && signal.marketType === "CEX") {
            if (ADAPTIVE_GATE.outcomeEvaluator) {
                evaluateOpenSnapshotsForSymbolTimeframe({
                    symbol: signal.symbol,
                    timeframe,
                    source: signal.source,
                    currentBias: signal.bias,
                }).catch((err) => console.error("Evaluator background error:", err));
            }

            if (memory.snapshotId && ADAPTIVE_GATE.manualMode) {
                saveGateLog({
                    snapshotId: memory.snapshotId,
                    userEmail: session.user.email,
                    signal,
                    gateResult: conservativeGate,
                }).catch((err) => console.error("Gate log error:", err));
            }
        }

        return NextResponse.json({
            signal: memory.signal,
            snapshotId: memory.snapshotId,
            conservativeGate,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Market Signal Error:", error);
        return NextResponse.json(
            { error: "Tidak bisa mengambil data coin yang dipilih." },
            { status: 502 }
        );
    }
}
