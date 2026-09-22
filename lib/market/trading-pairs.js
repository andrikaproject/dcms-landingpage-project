"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { readCachedPairs, writeCachedPairs } from "./trading-pairs-core";

export async function loadTradingPairs({ force = false, signal } = {}) {
    if (!force) {
        const cached = readCachedPairs();
        if (cached) return cached.items;
    }

    const data = await apiRequest("/market/trading-pairs", { query: { quote: "USDT" }, signal });
    const items = Array.isArray(data?.items) ? data.items : [];
    writeCachedPairs(items);
    return items;
}

// Daftar coin hanya pelengkap pencarian. Kalau gagal dimuat, kotak pencarian
// tetap berfungsi seperti sebelumnya.
export function useTradingPairs() {
    const [state, setState] = useState({ pairs: [], status: "loading" });

    useEffect(() => {
        const controller = new AbortController();

        loadTradingPairs({ signal: controller.signal })
            .then((pairs) => {
                if (!controller.signal.aborted) setState({ pairs, status: "ready" });
            })
            .catch(() => {
                if (!controller.signal.aborted) setState({ pairs: [], status: "error" });
            });

        return () => controller.abort();
    }, []);

    return state;
}
