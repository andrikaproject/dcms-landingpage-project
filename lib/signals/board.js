export function clearSignalBoardState({
    signals = [],
    initialSignals = [],
    removedSymbols = [],
} = {}) {
    const initialSymbols = new Set(
        initialSignals.map((signal) => signal?.symbol).filter(Boolean)
    );
    const clearedInitialSymbols = signals
        .map((signal) => signal?.symbol)
        .filter((symbol) => symbol && initialSymbols.has(symbol));

    return {
        signals: [],
        persistedSignals: [],
        removedSymbols: [...new Set([...removedSymbols, ...clearedInitialSymbols])],
    };
}

// Kartu hasil pencarian user berada di depan kartu bawaan dashboard. Urutan itu
// dipertahankan saat data baru datang.
export function mergeSignals(primarySignals, fallbackSignals) {
    return (Array.isArray(fallbackSignals) ? fallbackSignals : []).reduce(
        (mergedSignals, signal) => (
            mergedSignals.some((currentSignal) => currentSignal.symbol === signal.symbol)
                ? mergedSignals
                : [...mergedSignals, signal]
        ),
        Array.isArray(primarySignals) ? primarySignals : []
    );
}

export function withoutRemovedSignals(signals, removedSymbols) {
    const removedSet = new Set(removedSymbols || []);
    return (Array.isArray(signals) ? signals : []).filter((signal) => !removedSet.has(signal.symbol));
}

// Dipakai saat timeframe berganti. Board disusun ulang dari cache timeframe baru
// ditambah data server, persis seperti saat komponen baru dipasang. Menggantikan
// pemasangan ulang komponen lewat `key`, yang ikut menghapus state yang tidak
// ada hubungannya dengan timeframe.
export function rebuildBoardSignals({ persistedSignals = [], initialSignals = [], removedSymbols = [] } = {}) {
    return withoutRemovedSignals(mergeSignals(persistedSignals, initialSignals), removedSymbols);
}

// Dipakai saat data timeframe yang sama datang lagi. Nilai kartu bawaan diganti
// di tempat supaya posisinya tidak melompat, dan kartu hasil pencarian user tetap.
export function refreshBoardSignals({ signals = [], initialSignals = [], removedSymbols = [] } = {}) {
    const fresh = new Map((Array.isArray(initialSignals) ? initialSignals : []).map((signal) => [signal.symbol, signal]));
    const updated = (Array.isArray(signals) ? signals : []).map((signal) => fresh.get(signal.symbol) || signal);
    const known = new Set(updated.map((signal) => signal.symbol));

    return withoutRemovedSignals(
        [...updated, ...[...fresh.values()].filter((signal) => !known.has(signal.symbol))],
        removedSymbols
    );
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function percentBetween(from, to) {
    if (from === null || to === null || from === 0) return null;
    return ((to - from) / Math.abs(from)) * 100;
}

// Badge zona entry di board memakai kosakatanya sendiri, bukan status lifecycle.
function entryZoneStatus(status) {
    if (status === "PENDING_ENTRY" || status === "ACTIVE") return "valid";
    if (status === "EXPIRED" || status === "TIME_EXIT") return "expired";
    if (status === "INVALIDATED") return "missed";
    return "invalid";
}

// Rencana pending dan kartu Signal Board memakai bentuk data yang berbeda.
// Adapter ini memetakan rencana ke kartu board supaya tombol "Tambah ke Signal
// Board" tidak perlu memanggil ulang backend. Indikator (RSI, EMA, Stoch) tidak
// ada di rencana, jadi dibiarkan kosong dan kartu menampilkannya sebagai "-".
export function planToBoardSignal(plan) {
    if (!plan || !plan.symbol) return null;

    const zoneLow = numberOrNull(plan.entry?.zoneLow);
    const zoneHigh = numberOrNull(plan.entry?.zoneHigh);
    const entry = numberOrNull(plan.entry?.price)
        ?? (zoneLow !== null && zoneHigh !== null ? (zoneLow + zoneHigh) / 2 : null);
    const stopLoss = numberOrNull(plan.stopLoss);
    const targets = (plan.takeProfits || []).map((item) => numberOrNull(item.price)).filter((price) => price !== null);
    const tp1 = targets[0] ?? null;
    const tp2 = targets.length > 1 ? targets[targets.length - 1] : null;
    const observed = numberOrNull(plan.tracking?.observedPrice);
    const price = observed ?? entry;
    const isShort = plan.side === "SHORT";
    const isDex = plan.marketType === "DEX" || plan.source === "DEXSCREENER";
    const sinceEntry = percentBetween(entry, price);

    return {
        symbol: plan.symbol,
        base: plan.base,
        timeframe: plan.timeframe,
        source: plan.source,
        marketType: plan.marketType || (isDex ? "DEX" : null),
        indicatorAvailable: !isDex,
        bias: plan.side === "LONG" ? "long" : isShort ? "short" : "neutral",
        signalId: plan.signalId ?? null,
        lifecycleStatus: plan.status,
        entry,
        sl: stopLoss,
        tp1,
        tp2,
        tp: tp2 ?? tp1,
        price,
        riskReward: numberOrNull(plan.grossRewardRisk),
        sinceEntryPercent: sinceEntry === null ? null : isShort ? -sinceEntry : sinceEntry,
        riskPercent: Math.abs(percentBetween(entry, stopLoss) ?? 0),
        rewardPercent: Math.abs(percentBetween(entry, tp2 ?? tp1) ?? 0),
        entryZone: plan.entry?.isZone ? { low: zoneLow, high: zoneHigh, status: entryZoneStatus(plan.status) } : null,
        partialTpPlan: null,
        conservativeGate: null,
        fromPlan: true,
    };
}
