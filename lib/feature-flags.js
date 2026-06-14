function flag(name, defaultEnabled = true) {
    const val = process.env[name];
    if (val === undefined || val === "") return defaultEnabled;
    return val === "1" || val.toLowerCase() === "true";
}

export const ADAPTIVE_GATE = {
    snapshotLogging: flag("ADAPTIVE_GATE_SNAPSHOT_LOGGING_ENABLED"),
    outcomeEvaluator: flag("ADAPTIVE_GATE_OUTCOME_EVALUATOR_ENABLED"),
    manualMode: flag("ADAPTIVE_GATE_MANUAL_MODE_ENABLED"),
    evidence: flag("ADAPTIVE_GATE_EVIDENCE_ENABLED"),
    userHistory: flag("ADAPTIVE_GATE_USER_HISTORY_ENABLED"),
    admin: flag("ADAPTIVE_GATE_ADMIN_ENABLED"),
};
