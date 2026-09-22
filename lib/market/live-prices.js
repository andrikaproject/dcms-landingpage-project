"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { LIVE_PRICE_POLL_INTERVAL_MS, livePricesBySymbol, symbolsForLivePrices } from "./live-prices-core";

export async function loadLivePrices(symbols, { signal } = {}) {
    if (!symbols.length) return { asOf: null, items: [] };

    return apiRequest("/market/live-prices", {
        cache: "no-store",
        query: { symbols: symbols.join(",") },
        signal,
    });
}

export function useLivePrices(pairs, { enabled = false } = {}) {
    const symbolsKey = useMemo(() => symbolsForLivePrices(pairs).join(","), [pairs]);
    const [state, setState] = useState({ key: "", prices: {}, status: "idle", asOf: null });

    useEffect(() => {
        if (!enabled || !symbolsKey) return undefined;

        const symbols = symbolsKey.split(",");
        let isActive = true;
        let activeController = null;

        async function refresh() {
            if (activeController) return;
            const controller = new AbortController();
            activeController = controller;

            try {
                const payload = await loadLivePrices(symbols, { signal: controller.signal });
                if (!isActive || controller.signal.aborted) return;
                setState({
                    key: symbolsKey,
                    prices: livePricesBySymbol(payload?.items),
                    status: "ready",
                    asOf: payload?.asOf || null,
                });
            } catch {
                if (!isActive || controller.signal.aborted) return;
                setState({ key: symbolsKey, prices: {}, status: "error", asOf: null });
            } finally {
                if (activeController === controller) activeController = null;
            }
        }

        refresh();
        const interval = window.setInterval(refresh, LIVE_PRICE_POLL_INTERVAL_MS);

        return () => {
            isActive = false;
            activeController?.abort();
            window.clearInterval(interval);
        };
    }, [enabled, symbolsKey]);

    if (!enabled || !symbolsKey) return { prices: {}, status: "idle", asOf: null };
    if (state.key !== symbolsKey) return { prices: {}, status: "loading", asOf: null };
    return state;
}
