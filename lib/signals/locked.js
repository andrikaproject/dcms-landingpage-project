import { SIGNAL_STATUS } from "./lifecycle.js";

const LEGACY_STATUS_MAP = {
    ACTIVE: SIGNAL_STATUS.ACTIVE,
    HIT_TP: SIGNAL_STATUS.TP_HIT,
    HIT_SL: SIGNAL_STATUS.SL_HIT,
};

const RETURN_STATUSES = new Set([
    SIGNAL_STATUS.ACTIVE,
    SIGNAL_STATUS.TP_HIT,
    SIGNAL_STATUS.SL_HIT,
    SIGNAL_STATUS.TIME_EXIT,
]);

export function resolveLockedLifecycleStatus(signal) {
    const lifecycleStatus = String(signal?.lifecycleStatus || "").toUpperCase();
    if (lifecycleStatus) return lifecycleStatus;

    const lockedStatus = String(signal?.status || "").toUpperCase();
    return LEGACY_STATUS_MAP[lockedStatus] || lockedStatus || null;
}

export function describeLockedMovement(signal) {
    const entry = Number(signal?.entry);
    const currentPrice = Number(signal?.currentPrice ?? signal?.price);
    if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(currentPrice)) return { kind: "none" };

    const rawPercent = ((currentPrice - entry) / entry) * 100;
    const lifecycleStatus = resolveLockedLifecycleStatus(signal);

    if (lifecycleStatus === SIGNAL_STATUS.PENDING_ENTRY) {
        return {
            kind: "distance",
            percent: Math.abs(rawPercent),
            position: rawPercent > 0 ? "above" : rawPercent < 0 ? "below" : "at",
        };
    }

    if (!RETURN_STATUSES.has(lifecycleStatus)) return { kind: "none" };

    return {
        kind: "return",
        percent: String(signal?.bias || "").toLowerCase() === "short" ? -rawPercent : rawPercent,
    };
}
