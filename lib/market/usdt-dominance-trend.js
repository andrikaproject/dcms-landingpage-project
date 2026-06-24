const TIMEFRAMES = ["4h", "1h", "15m"];
const DEFAULT_UNAVAILABLE_REASON = "USDT.D trend data unavailable";

function normalizeChangePct(input, timeframe) {
    const rawValue = input?.[timeframe]?.changePct;
    if (rawValue === null || rawValue === undefined || rawValue === "") return null;
    const changePct = Number(rawValue);
    return Number.isFinite(changePct) ? changePct : null;
}

function score4h(changePct) {
    if (changePct <= -1.0) return 2;
    if (changePct <= -0.4) return 1;
    if (changePct >= 1.0) return -2;
    if (changePct >= 0.4) return -1;
    return 0;
}

function score1h(changePct) {
    if (changePct <= -0.4) return 0.5;
    if (changePct >= 0.4) return -0.5;
    return 0;
}

function score15m(changePct, higherTimeframeScore) {
    if (higherTimeframeScore > 0 && changePct <= -0.2) return 0.5;
    if (higherTimeframeScore < 0 && changePct >= 0.2) return -0.5;
    return 0;
}

function buildRegime(score, hasAnyData) {
    if (!hasAnyData) return "UNKNOWN";
    if (score >= 1.5) return "RISK_ON";
    if (score <= -1.5) return "RISK_OFF";
    return "MIXED";
}

function buildAlignment(regime) {
    if (regime === "RISK_ON") return "BULLISH_CRYPTO";
    if (regime === "RISK_OFF") return "BEARISH_CRYPTO";
    return regime;
}

export function getNeutralUsdtDominanceTrendContext(reason = DEFAULT_UNAVAILABLE_REASON) {
    return {
        score: 0,
        regime: "UNKNOWN",
        alignment: "UNKNOWN",
        warnings: [reason],
        components: {
            "4h": { changePct: null, score: 0, reason: "unavailable" },
            "1h": { changePct: null, score: 0, reason: "unavailable" },
            "15m": { changePct: null, score: 0, reason: "unavailable" },
        },
    };
}

export function calculateUsdtDominanceTrendContext(input = {}) {
    const warnings = [];
    const components = {};
    const change4h = normalizeChangePct(input, "4h");
    const change1h = normalizeChangePct(input, "1h");
    const change15m = normalizeChangePct(input, "15m");
    const hasAnyData = [change4h, change1h, change15m].some((value) => value !== null);

    if (!hasAnyData) {
        return getNeutralUsdtDominanceTrendContext();
    }

    const score4hValue = change4h === null ? 0 : score4h(change4h);
    const score1hValue = change1h === null ? 0 : score1h(change1h);
    const higherTimeframeScore = score4hValue + score1hValue;
    const score15mValue = change15m === null ? 0 : score15m(change15m, higherTimeframeScore);

    components["4h"] = {
        changePct: change4h,
        score: score4hValue,
        reason: change4h === null ? "unavailable" : score4hValue === 0 ? "neutral" : "scored",
    };
    components["1h"] = {
        changePct: change1h,
        score: score1hValue,
        reason: change1h === null ? "unavailable" : score1hValue === 0 ? "neutral" : "scored",
    };
    components["15m"] = {
        changePct: change15m,
        score: score15mValue,
        reason: change15m === null ? "unavailable" : score15mValue === 0 ? "neutral" : "scored",
    };

    for (const timeframe of TIMEFRAMES) {
        if (components[timeframe].reason === "unavailable") {
            warnings.push(`USDT.D ${timeframe} trend data unavailable`);
        }
    }

    if (change15m !== null && higherTimeframeScore > 0 && change15m >= 0.2) {
        warnings.push("USDT.D 15m rising against risk-on higher timeframe context");
        components["15m"].reason = "15m ignored because against HTF";
    } else if (change15m !== null && higherTimeframeScore < 0 && change15m <= -0.2) {
        warnings.push("USDT.D 15m falling against risk-off higher timeframe context");
        components["15m"].reason = "15m ignored because against HTF";
    } else if (change15m !== null && higherTimeframeScore === 0 && Math.abs(change15m) >= 0.2) {
        components["15m"].reason = "15m ignored because HTF is mixed";
    }

    const totalScore = score4hValue + score1hValue + score15mValue;
    const regime = buildRegime(totalScore, hasAnyData);

    return {
        score: totalScore,
        regime,
        alignment: buildAlignment(regime),
        warnings,
        components,
    };
}
