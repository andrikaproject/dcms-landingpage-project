"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runPine } from "@/lib/pine/client";

// Indikator dihitung ulang hanya saat set candle berganti (dimuat ulang tiap
// menit atau ganti timeframe) atau saat script/input berubah, bukan pada
// setiap tick harga live, karena script berat bisa makan ratusan milidetik.
export function toEngineBars(candles, volume) {
    const volumes = new Map((volume || []).map((bar) => [bar.time, bar.value]));
    return (candles || []).map((candle) => ({
        time: candle.time * 1000,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: volumes.get(candle.time) ?? 0,
    }));
}

function runKey(entry, barsKey) {
    return `${entry.uid}|${barsKey}|${entry.source.length}|${hash(entry.source)}|${JSON.stringify(entry.inputs || {})}`;
}

function hash(text) {
    let value = 0;
    for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) | 0;
    return value;
}

export function useIndicatorRuns({ entries, candles, volume, timeframe, symbol, mintick }) {
    const [results, setResults] = useState({});
    const lastKeysRef = useRef({});
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    const bars = useMemo(() => toEngineBars(candles, volume), [candles, volume]);
    const barsKey = bars.length ? `${bars[0].time}-${bars.at(-1).time}-${bars.length}` : "";

    useEffect(() => {
        if (!bars.length) return;
        const liveUids = new Set(entries.map((entry) => entry.uid));
        for (const uid of Object.keys(lastKeysRef.current)) {
            if (!liveUids.has(uid)) delete lastKeysRef.current[uid];
        }
        for (const entry of entries) {
            if (!entry.source) continue;
            const key = runKey(entry, barsKey);
            if (lastKeysRef.current[entry.uid] === key) continue;
            lastKeysRef.current[entry.uid] = key;
            runPine(entry.source, { bars, inputs: entry.inputs || {}, timeframe, symbol, mintick }).then((result) => {
                // Hasil yang sudah digantikan perubahan script/input/candle dibuang.
                if (!mountedRef.current || lastKeysRef.current[entry.uid] !== key) return;
                setResults((current) => ({ ...current, [entry.uid]: { result, key } }));
            });
        }
    }, [entries, bars, barsKey, timeframe, symbol, mintick]);

    // Status diturunkan saat render: hasil yang kuncinya belum cocok dengan
    // script/input/candle terbaru berarti masih dihitung ulang.
    return useMemo(() => Object.fromEntries(entries.map((entry) => {
        const stored = results[entry.uid];
        const expected = entry.source && barsKey ? runKey(entry, barsKey) : null;
        const fresh = stored && stored.key === expected;
        const status = !entry.source ? "idle" : fresh ? (stored.result.ok ? "ready" : "error") : "running";
        return [entry.uid, { status, result: stored?.result ?? null }];
    })), [entries, results, barsKey]);
}
