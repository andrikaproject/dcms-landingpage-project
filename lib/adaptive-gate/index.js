import { evaluateManualConservativeGate } from "@/lib/adaptive-gate/manual-gate";
import { getAdaptiveEvidence } from "@/lib/adaptive-gate/adaptive-evidence";
import { EVIDENCE_CONFIG } from "@/lib/adaptive-gate/gate-config";
import { buildStatusLabel } from "@/lib/adaptive-gate/gate-reasons";

function combineResults(manualGate, evidence) {
    // Manual gate failed: evidence is informational only, final stays NOT_READY
    if (manualGate.result === "NOT_READY") {
        return {
            result: "NOT_READY",
            statusLabel: buildStatusLabel("NOT_READY"),
            passedGates: manualGate.passedGates,
            failedGates: manualGate.failedGates,
            reasons: manualGate.reasons,
            warnings: manualGate.warnings,
            evidenceActive: false,
            manualGate,
            evidence,
        };
    }

    // Manual gate passed — check evidence availability
    if (!evidence || evidence.sampleSize < EVIDENCE_CONFIG.minimumSampleSize) {
        const sampleNote = evidence
            ? `Histori setup serupa baru ${evidence.sampleSize} sample (butuh minimal ${EVIDENCE_CONFIG.minimumSampleSize}) — menggunakan manual gate`
            : "Belum ada histori setup serupa — menggunakan manual gate";

        return {
            result: manualGate.result,
            statusLabel: buildStatusLabel(manualGate.result),
            passedGates: manualGate.passedGates,
            failedGates: manualGate.failedGates,
            reasons: manualGate.reasons,
            warnings: [...manualGate.warnings, sampleNote],
            evidenceActive: false,
            manualGate,
            evidence,
        };
    }

    // Evidence has enough sample — apply decision rules
    const evidenceDangerous = evidence.weightedBadRate >= EVIDENCE_CONFIG.dangerWeightedBadRate;
    const evidenceGoodEnough = evidence.weightedWinRate >= EVIDENCE_CONFIG.supportiveWeightedWinRate;

    if (evidenceDangerous) {
        const badPercent = Math.round(evidence.weightedBadRate * 100);
        return {
            result: "NOT_READY",
            statusLabel: buildStatusLabel("NOT_READY"),
            passedGates: manualGate.passedGates,
            failedGates: [...manualGate.failedGates, "adaptive_evidence"],
            reasons: [
                ...manualGate.reasons,
                `Setup serupa terlalu sering gagal — ${badPercent}% bad rate dari ${evidence.sampleSize} histori (${evidence.queryType === "broad" ? "lintas symbol" : "symbol sama"})`,
            ],
            warnings: manualGate.warnings,
            evidenceActive: true,
            manualGate,
            evidence,
        };
    }

    // Evidence neutral or supportive — trust manual gate result
    const extraWarnings = [...manualGate.warnings];
    if (!evidenceGoodEnough) {
        const winPercent = Math.round(evidence.weightedWinRate * 100);
        const threshold = Math.round(EVIDENCE_CONFIG.supportiveWeightedWinRate * 100);
        extraWarnings.push(
            `Win rate histori ${winPercent}% — di bawah threshold ideal ${threshold}% (${evidence.sampleSize} sample)`
        );
    }

    return {
        result: manualGate.result,
        statusLabel: buildStatusLabel(manualGate.result),
        passedGates: [...manualGate.passedGates, "adaptive_evidence"],
        failedGates: manualGate.failedGates,
        reasons: manualGate.reasons,
        warnings: extraWarnings,
        evidenceActive: true,
        manualGate,
        evidence,
    };
}

export async function evaluateConservativeGate(signal, { featureFingerprint = null } = {}) {
    const manualGate = evaluateManualConservativeGate(signal);

    const evidence = featureFingerprint
        ? await getAdaptiveEvidence(featureFingerprint).catch(() => null)
        : null;

    return combineResults(manualGate, evidence);
}
