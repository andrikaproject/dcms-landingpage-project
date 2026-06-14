export function isResolvable(snapshot) {
    const tp1 = Number(snapshot.tp1);
    const sl = Number(snapshot.sl);
    return Number.isFinite(tp1) && Number.isFinite(sl) && tp1 > 0 && sl > 0;
}

export function checkCandleOutcome(candle, tp1, sl, bias) {
    const high = Number(candle.high);
    const low = Number(candle.low);

    if (bias === "long") {
        const hitsTP1 = high >= tp1;
        const hitsSL = low <= sl;
        if (hitsTP1 && hitsSL) return "AMBIGUOUS";
        if (hitsTP1) return "WIN";
        if (hitsSL) return "LOSS";
    } else if (bias === "short") {
        const hitsTP1 = low <= tp1;
        const hitsSL = high >= sl;
        if (hitsTP1 && hitsSL) return "AMBIGUOUS";
        if (hitsTP1) return "WIN";
        if (hitsSL) return "LOSS";
    }

    return null;
}
