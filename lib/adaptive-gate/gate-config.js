export const EVIDENCE_CONFIG = {
    minimumSampleSize: 20,
    supportiveWeightedWinRate: 0.52,
    dangerWeightedBadRate: 0.50,
    recentWindowDays: 30,
    evidenceQueryLimit: 200,
};

export const GATE_CONFIG = {
    // Risk Gate
    minTp1RiskReward: 1.0,
    maxRiskPercentByTimeframe: {
        "1m": 1.5,
        "15m": 3.0,
        "1h": 4.0,
        "4h": 6.0,
        "1d": 8.0,
    },
    maxRiskPercentDefault: 3.0,
    maxAtrPercent: 5.0,

    // Entry Safety Gate
    maxLateEntryProgressToTp1Percent: 70,
    maxDistanceFromEntryAtrMultiplier: 0.5,
    maxDistanceFromEntryPercent: 1.5,
    minSlBufferAtrMultiplier: 0.3,

    // Direction Gate
    emaBearishToleranceMultiplier: 0.99,
    priceBelowEmaFastToleranceMultiplier: 0.99,
    priceAboveEmaFastToleranceMultiplier: 1.01,

    // Market Context Gate
    resistanceSupportProximityRatio: 0.3,

    // Gate version
    gateVersion: "manual-v1",
    mode: "CONSERVATIVE",
};

export function getMaxRiskPercent(timeframe) {
    return GATE_CONFIG.maxRiskPercentByTimeframe[timeframe] ?? GATE_CONFIG.maxRiskPercentDefault;
}
