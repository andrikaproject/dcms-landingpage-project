import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adaptiveGateLogs } from "@/db/schema";
import { GATE_CONFIG, getMaxRiskPercent } from "@/lib/adaptive-gate/gate-config";
import { buildStatusLabel, GATE_NAMES, REASONS, WARNINGS } from "@/lib/adaptive-gate/gate-reasons";

function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

// ─── Direction Gate ──────────────────────────────────────────────────────────

function checkDirectionGate(signal) {
    const failed = [];
    const price = num(signal.price);
    const emaFast = num(signal.emaFast);
    const emaSlow = num(signal.emaSlow);
    const stochK = num(signal.stochK);
    const stochD = num(signal.stochD);
    const trendline = String(signal.trendline || "").toUpperCase();

    if (signal.bias === "long") {
        if (price !== null && emaFast !== null && emaFast > 0) {
            if (price < emaFast * GATE_CONFIG.priceBelowEmaFastToleranceMultiplier) {
                failed.push(REASONS.LONG_PRICE_BELOW_EMA_FAST);
            }
        }

        if (emaFast !== null && emaSlow !== null && emaSlow > 0) {
            if (emaFast < emaSlow * GATE_CONFIG.emaBearishToleranceMultiplier) {
                failed.push(REASONS.LONG_EMA_BEARISH);
            }
        }

        if (stochK !== null && stochD !== null) {
            if (stochK >= 80 && stochD >= 80 && stochK < stochD) {
                failed.push(REASONS.LONG_STOCH_OVERBOUGHT_DECLINING);
            }
        }

        if (trendline === "BEARISH") {
            failed.push(REASONS.LONG_TRENDLINE_BEARISH);
        }
    }

    if (signal.bias === "short") {
        if (price !== null && emaFast !== null && emaFast > 0) {
            if (price > emaFast * GATE_CONFIG.priceAboveEmaFastToleranceMultiplier) {
                failed.push(REASONS.SHORT_PRICE_ABOVE_EMA_FAST);
            }
        }

        if (emaFast !== null && emaSlow !== null && emaSlow > 0) {
            if (emaFast > emaSlow * (2 - GATE_CONFIG.emaBearishToleranceMultiplier)) {
                failed.push(REASONS.SHORT_EMA_BULLISH);
            }
        }

        if (stochK !== null && stochD !== null) {
            if (stochK <= 20 && stochD <= 20 && stochK > stochD) {
                failed.push(REASONS.SHORT_STOCH_OVERSOLD_RECOVERING);
            }
        }

        if (trendline === "BULLISH") {
            failed.push(REASONS.SHORT_TRENDLINE_BULLISH);
        }
    }

    return { name: GATE_NAMES.DIRECTION, failed };
}

// ─── Entry Safety Gate ───────────────────────────────────────────────────────

function checkEntrySafetyGate(signal) {
    const failed = [];
    const price = num(signal.price);
    const entry = num(signal.entry);
    const tp1 = num(signal.tp1);
    const sl = num(signal.sl);
    const atr = num(signal.atr);
    const resistance = num(signal.resistance);
    const support = num(signal.support);

    if (price === null || entry === null) return { name: GATE_NAMES.ENTRY_SAFETY, failed };

    // Distance from entry
    const rawDistance = Math.abs(price - entry);
    if (atr !== null && atr > 0) {
        if (rawDistance > atr * GATE_CONFIG.maxDistanceFromEntryAtrMultiplier) {
            failed.push(REASONS.ENTRY_TOO_FAR);
        }
    } else if (entry > 0) {
        const distancePercent = rawDistance / entry * 100;
        if (distancePercent > GATE_CONFIG.maxDistanceFromEntryPercent) {
            failed.push(REASONS.ENTRY_TOO_FAR);
        }
    }

    // Progress toward TP1
    if (tp1 !== null) {
        const totalRange = Math.abs(tp1 - entry);
        if (totalRange > 0) {
            let progress = 0;
            if (signal.bias === "long") {
                progress = (price - entry) / totalRange * 100;
            } else if (signal.bias === "short") {
                progress = (entry - price) / totalRange * 100;
            }
            if (progress > GATE_CONFIG.maxLateEntryProgressToTp1Percent) {
                failed.push(REASONS.ENTRY_PROGRESS_TOO_HIGH);
            }
        }
    }

    // Not too close to SL
    if (sl !== null && atr !== null && atr > 0) {
        const slBuffer = Math.abs(price - sl);
        if (slBuffer < atr * GATE_CONFIG.minSlBufferAtrMultiplier) {
            failed.push(REASONS.PRICE_TOO_CLOSE_TO_SL);
        }
    }

    // Resistance / support proximity check
    if (signal.bias === "long" && tp1 !== null && resistance !== null && resistance > price) {
        const targetRange = Math.abs(tp1 - price);
        const resistanceDistance = Math.abs(resistance - price);
        if (targetRange > 0 && resistanceDistance < targetRange * GATE_CONFIG.resistanceSupportProximityRatio) {
            failed.push(REASONS.LONG_RESISTANCE_TOO_CLOSE);
        }
    }

    if (signal.bias === "short" && tp1 !== null && support !== null && support < price) {
        const targetRange = Math.abs(price - tp1);
        const supportDistance = Math.abs(price - support);
        if (targetRange > 0 && supportDistance < targetRange * GATE_CONFIG.resistanceSupportProximityRatio) {
            failed.push(REASONS.SHORT_SUPPORT_TOO_CLOSE);
        }
    }

    return { name: GATE_NAMES.ENTRY_SAFETY, failed };
}

// ─── Risk Gate ───────────────────────────────────────────────────────────────

function checkRiskGate(signal) {
    const failed = [];
    const entry = num(signal.entry);
    const tp1 = num(signal.tp1);
    const sl = num(signal.sl);
    const tp1RiskReward = num(signal.tp1RiskReward);
    const riskPercent = num(signal.riskPercent);
    const atr = num(signal.atr);
    const price = num(signal.price);

    // SL and TP1 valid for direction
    if (entry !== null && tp1 !== null && sl !== null) {
        if (signal.bias === "long" && !(sl < entry && entry <= tp1)) {
            failed.push(REASONS.SL_TP1_INVALID_LONG);
        }
        if (signal.bias === "short" && !(sl > entry && entry >= tp1)) {
            failed.push(REASONS.SL_TP1_INVALID_SHORT);
        }
    }

    // TP1 Risk/Reward
    if (tp1RiskReward !== null && tp1RiskReward < GATE_CONFIG.minTp1RiskReward) {
        failed.push(REASONS.TP1_RR_TOO_LOW);
    }

    // Risk percent
    const maxRisk = getMaxRiskPercent(signal.timeframe);
    if (riskPercent !== null && riskPercent > maxRisk) {
        failed.push(REASONS.RISK_PERCENT_TOO_HIGH);
    }

    // ATR not extreme
    if (atr !== null && price !== null && price > 0) {
        const atrPercent = atr / price * 100;
        if (atrPercent > GATE_CONFIG.maxAtrPercent) {
            failed.push(REASONS.ATR_EXTREME);
        }
    }

    return { name: GATE_NAMES.RISK, failed };
}

// ─── Market Context Gate ─────────────────────────────────────────────────────

function checkMarketContextGate(signal) {
    const failed = [];
    const warnings = [];
    const usdtLabel = String(signal.usdtDominanceLabel || "UNAVAILABLE").toUpperCase();
    const price = num(signal.price);
    const poc = num(signal.poc);

    if (signal.bias === "long") {
        if (usdtLabel === "OVERBOUGHT") {
            failed.push(REASONS.USDT_DOM_OVERBOUGHT_LONG);
        } else if (usdtLabel === "RISING") {
            warnings.push(WARNINGS.USDT_DOM_RISING_LONG);
        }

        if (price !== null && poc !== null && poc > 0 && price < poc * 0.99) {
            failed.push(REASONS.LONG_PRICE_BELOW_POC);
        }
    }

    if (signal.bias === "short") {
        if (usdtLabel === "OVERSOLD") {
            failed.push(REASONS.USDT_DOM_OVERSOLD_SHORT);
        } else if (usdtLabel === "FALLING") {
            warnings.push(WARNINGS.USDT_DOM_FALLING_SHORT);
        }

        if (price !== null && poc !== null && poc > 0 && price > poc * 1.01) {
            failed.push(REASONS.SHORT_PRICE_ABOVE_POC);
        }
    }

    return { name: GATE_NAMES.MARKET_CONTEXT, failed, warnings };
}

// ─── Main Evaluator ──────────────────────────────────────────────────────────

export function evaluateManualConservativeGate(signal) {
    if (signal?.bias === "neutral") {
        return {
            result: "NOT_READY",
            statusLabel: buildStatusLabel("NOT_READY"),
            passedGates: [],
            failedGates: ["pre_check"],
            reasons: [REASONS.NEUTRAL_BIAS],
            warnings: [],
        };
    }

    if (signal?.indicatorAvailable === false) {
        return {
            result: "NOT_READY",
            statusLabel: buildStatusLabel("NOT_READY"),
            passedGates: [],
            failedGates: ["pre_check"],
            reasons: [REASONS.INDICATORS_UNAVAILABLE],
            warnings: [],
        };
    }

    const gates = [
        checkDirectionGate(signal),
        checkEntrySafetyGate(signal),
        checkRiskGate(signal),
        checkMarketContextGate(signal),
    ];

    const allReasons = [];
    const allWarnings = [];
    const passedGates = [];
    const failedGates = [];

    for (const gate of gates) {
        const failures = gate.failed ?? [];
        const gateWarnings = gate.warnings ?? [];

        allWarnings.push(...gateWarnings);

        if (failures.length > 0) {
            failedGates.push(gate.name);
            allReasons.push(...failures);
        } else {
            passedGates.push(gate.name);
        }
    }

    if (!signal.isClosedCandle) {
        allWarnings.push(WARNINGS.OPEN_CANDLE);
    }

    const hasFailed = failedGates.length > 0;
    let result;

    if (hasFailed) {
        result = "NOT_READY";
    } else if (signal.bias === "long") {
        result = "LONG_VALID";
    } else {
        result = "SHORT_VALID";
    }

    return {
        result,
        statusLabel: buildStatusLabel(result),
        passedGates,
        failedGates,
        reasons: allReasons,
        warnings: allWarnings,
    };
}

// ─── Gate Log ────────────────────────────────────────────────────────────────

export async function saveGateLog({ snapshotId, userEmail, signal, gateResult }) {
    if (!snapshotId) return;

    try {
        await db.insert(adaptiveGateLogs).values({
            snapshotId,
            userEmail: userEmail || null,
            engineVersion: signal?.engineVersion || "unknown",
            gateVersion: GATE_CONFIG.gateVersion,
            mode: GATE_CONFIG.mode,
            result: gateResult.result,
            failedGate: gateResult.failedGates[0] || null,
            reasonsJson: JSON.stringify(gateResult.reasons),
            evidenceJson: JSON.stringify({
                passedGates: gateResult.passedGates,
                failedGates: gateResult.failedGates,
                warnings: gateResult.warnings,
                manualResult: gateResult.manualGate?.result ?? gateResult.result,
                evidenceActive: gateResult.evidenceActive ?? false,
                evidence: gateResult.evidence ?? null,
            }),
        });
    } catch (error) {
        console.error("Gate log save failed:", error);
    }
}
