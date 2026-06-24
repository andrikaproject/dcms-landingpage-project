"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const COOLDOWN_MS = 30_000;

export default function LockedSignalRefreshButton() {
    const router = useRouter();
    const [cooldownEnds, setCooldownEnds] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (cooldownEnds <= Date.now()) {
            setRemaining(0);
            return;
        }
        const tick = () => {
            const r = Math.max(0, cooldownEnds - Date.now());
            setRemaining(r);
            if (r <= 0) clearInterval(id);
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [cooldownEnds]);

    function handleRefresh() {
        if (remaining > 0 || isRefreshing) return;
        setIsRefreshing(true);
        setCooldownEnds(Date.now() + COOLDOWN_MS);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1500);
    }

    const onCooldown = remaining > 0;
    const sec = Math.ceil(remaining / 1000);

    return (
        <button
            type="button"
            onClick={handleRefresh}
            disabled={onCooldown || isRefreshing}
            title={onCooldown ? `Tunggu ${sec}s sebelum refresh lagi` : "Refresh harga sekarang"}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-chakra text-[11px] font-bold transition ${
                onCooldown || isRefreshing
                    ? "cursor-not-allowed border-zinc-700/50 text-zinc-600"
                    : "border-zinc-600 text-zinc-400 hover:border-[#B7FB5B]/40 hover:text-[#B7FB5B]"
            }`}
        >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className={isRefreshing ? "animate-spin" : ""}>
                <path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.05-3.35L10 7h5V2l-1.35.35Z" fill="currentColor" />
            </svg>
            {isRefreshing ? "Memperbarui…" : onCooldown ? `Tunggu ${sec}s` : "Refresh Harga"}
        </button>
    );
}
