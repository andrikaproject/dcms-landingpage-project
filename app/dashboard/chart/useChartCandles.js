"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { isAbortError } from "@/lib/signals/request";

// Harga di dalam candle bergerak lewat live price; set candle cukup dimuat
// ulang sekali per menit supaya candle baru ikut muncul. 1.000 bar memberi
// riwayat cukup untuk indikator panjang seperti EMA 233.
const CANDLE_REFRESH_MS = 60_000;
export const CHART_BAR_LIMIT = 1000;
const VOLUME_UP = "rgba(74, 222, 128, 0.35)";
const VOLUME_DOWN = "rgba(248, 113, 113, 0.35)";

function shapePayload(payload) {
    const candles = Array.isArray(payload?.candles) ? payload.candles : [];
    const direction = new Map(candles.map((candle) => [candle.time, candle.close >= candle.open]));
    return {
        candles,
        volume: (Array.isArray(payload?.volume) ? payload.volume : []).map((bar) => ({
            time: bar.time,
            value: bar.value,
            color: direction.get(bar.time) ? VOLUME_UP : VOLUME_DOWN,
        })),
        currentPrice: Number(payload?.currentPrice) || null,
        change24h: Number.isFinite(Number(payload?.change24h)) ? Number(payload.change24h) : null,
        keyLevels: payload?.levels ?? null,
    };
}

export function useChartCandles(symbol, interval) {
    const key = `${symbol}|${interval}`;
    const [state, setState] = useState({ key: "", data: null, error: "" });
    const [reloadToken, setReloadToken] = useState(0);
    const controllerRef = useRef(null);

    useEffect(() => {
        if (!symbol) return undefined;
        let active = true;

        async function load() {
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            try {
                const payload = await apiRequest("/market-analysis/key-levels", {
                    query: { symbol, interval, basis: "utc", limit: CHART_BAR_LIMIT },
                    signal: controller.signal,
                });
                if (!active || controller.signal.aborted) return;
                setState({ key, data: shapePayload(payload), error: "" });
            } catch (error) {
                if (!active || isAbortError(error, controller.signal)) return;
                // Gagal memuat ulang tidak menghapus chart yang sudah tampil.
                setState((current) => ({ ...current, key, error: error?.message || "Data chart gagal dimuat." }));
            }
        }

        load();
        const timer = window.setInterval(load, CANDLE_REFRESH_MS);
        return () => {
            active = false;
            window.clearInterval(timer);
            controllerRef.current?.abort();
        };
    }, [symbol, interval, key, reloadToken]);

    const retry = useCallback(() => setReloadToken((value) => value + 1), []);

    return {
        data: state.data,
        // Data timeframe lama tetap digambar sampai yang baru tiba.
        loading: state.key !== key || (!state.data && !state.error),
        error: state.key === key ? state.error : "",
        retry,
    };
}
