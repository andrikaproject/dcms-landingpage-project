"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

const SCAM_PUMP_ANALYZE_COOLDOWN_SECONDS = 120;

function formatCompactUsd(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    if (number >= 1_000_000_000) return `$${(number / 1_000_000_000).toFixed(1)}B`;
    if (number >= 1_000_000) return `$${(number / 1_000_000).toFixed(1)}M`;
    if (number >= 1_000) return `$${(number / 1_000).toFixed(1)}K`;
    if (number >= 1) return `$${number.toFixed(2)}`;
    return `$${number.toFixed(6)}`;
}

function formatSignedPercent(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}%`;
}

function ScamPumpCard({ recommendation }) {
    const isPump = recommendation.isPump;

    return (
        <article className="rounded-xl border border-[#232a30] bg-[#161a1e] p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className={`rounded-md px-2 py-1 font-chakra text-[10px] font-bold uppercase tracking-[0.18em] ${isPump
                        ? "bg-red-500/20 text-red-200"
                        : "bg-[#B7FB5B]/15 text-[#D9FF9A]"
                        }`}
                    >
                        {recommendation.status}
                    </span>
                    <h3 className="mt-2 truncate font-nebulica text-xl font-bold text-white">
                        {recommendation.base}/USDT
                    </h3>
                    <p className="font-chakra text-xs text-zinc-400">
                        Score {Number(recommendation.score || 0).toFixed(1)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-chakra text-xs font-bold text-zinc-400">Price</p>
                    <p className="font-chakra text-sm font-bold text-white">{formatCompactUsd(recommendation.price)}</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">1m Move</p>
                    <p className={`mt-1 font-chakra text-sm font-bold ${recommendation.change1m >= 0 ? "text-[#B7FB5B]" : "text-red-300"}`}>
                        {formatSignedPercent(recommendation.change1m)}
                    </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Volume Spike</p>
                    <p className="mt-1 font-chakra text-sm font-bold text-white">
                        {recommendation.volumeRatioLabel || `${Number(recommendation.volumeRatio || 0).toFixed(1)}x`}
                    </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">24h Move</p>
                    <p className={`mt-1 font-chakra text-sm font-bold ${recommendation.change24h >= 0 ? "text-[#B7FB5B]" : "text-red-300"}`}>
                        {formatSignedPercent(recommendation.change24h)}
                    </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">24h Volume</p>
                    <p className="mt-1 font-chakra text-sm font-bold text-white">
                        {formatCompactUsd(recommendation.volume24h)}
                    </p>
                </div>
            </div>

            <p className="mt-4 rounded-lg border border-white/[0.06] bg-black/15 p-3 font-chakra text-xs leading-5 text-zinc-300">
                {recommendation.reason}
            </p>
        </article>
    );
}

function ScamPumpBoard({
    recommendations,
    isAnalyzing,
    cooldownRemaining,
    error,
    updatedAt,
    inspectedCount,
    onAnalyze,
}) {
    const hasResults = recommendations.length > 0;
    const isCoolingDown = cooldownRemaining > 0;
    const isAnalyzeDisabled = isAnalyzing || isCoolingDown;

    return (
        <section className="rounded-2xl border border-[#232a30] bg-[#111417] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">Scam Pump Board</p>
                    <h2 className="mt-1 font-nebulica text-[clamp(1.25rem,1.1rem+0.75vw,1.5rem)] font-bold text-white">
                        1m Pump Scanner
                    </h2>
                    <p className="mt-1 font-chakra text-xs text-zinc-400">
                        Scan pair USDT aktif berdasarkan spike volume dan candle 1 menit.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={isAnalyzeDisabled}
                    aria-busy={isAnalyzing || isCoolingDown}
                    className="min-h-11 rounded-lg border-2 border-white/10 bg-[#B7FB5B] px-5 font-chakra text-sm font-bold text-black transition hover:bg-[#a8ec4c] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isAnalyzing
                        ? "Analyzing..."
                        : isCoolingDown
                            ? `Analyze lagi ${cooldownRemaining}s`
                            : "Analyze"}
                </button>
            </div>

            {updatedAt && (
                <p className="mt-3 font-chakra text-xs text-zinc-400">
                    Updated {new Date(updatedAt).toLocaleTimeString("id-ID")} · Inspected {inspectedCount} pairs
                </p>
            )}

            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 font-chakra text-sm text-red-200">
                    {error}
                </div>
            )}

            {isAnalyzing && (
                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
                    {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="h-64 motion-safe:animate-pulse rounded-xl bg-white/[0.06]" />
                    ))}
                </div>
            )}

            {!isAnalyzing && hasResults && (
                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
                    {recommendations.map((recommendation) => (
                        <ScamPumpCard key={recommendation.symbol} recommendation={recommendation} />
                    ))}
                </div>
            )}

            {!isAnalyzing && !hasResults && !error && (
                <div className="mt-5 rounded-xl border border-dashed border-zinc-800 bg-black/20 p-5 font-chakra text-sm text-zinc-400">
                    Klik Analyze untuk menjalankan scan scam pump terbaru.
                </div>
            )}
        </section>
    );
}

export default function ScamPumpSection({ onToast }) {
    const [scamPumpRecommendations, setScamPumpRecommendations] = useState([]);
    const [isAnalyzingScamPump, setIsAnalyzingScamPump] = useState(false);
    const [scamPumpError, setScamPumpError] = useState("");
    const [scamPumpUpdatedAt, setScamPumpUpdatedAt] = useState("");
    const [scamPumpInspectedCount, setScamPumpInspectedCount] = useState(0);
    const [scamPumpCooldownUntil, setScamPumpCooldownUntil] = useState(0);
    const [scamPumpNow, setScamPumpNow] = useState(Date.now());
    const scamPumpCooldownRemaining = Math.max(0, Math.ceil((scamPumpCooldownUntil - scamPumpNow) / 1000));
    const showToast = onToast;

    useEffect(() => {
        if (scamPumpCooldownUntil <= Date.now()) return undefined;

        const timer = window.setInterval(() => {
            const nextNow = Date.now();
            setScamPumpNow(nextNow);

            if (scamPumpCooldownUntil <= nextNow) {
                window.clearInterval(timer);
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [scamPumpCooldownUntil]);

    async function handleScamPumpAnalyze() {
        const remaining = Math.max(0, Math.ceil((scamPumpCooldownUntil - Date.now()) / 1000));

        if (remaining > 0) {
            setScamPumpNow(Date.now());
            return;
        }

        const nextCooldownUntil = Date.now() + SCAM_PUMP_ANALYZE_COOLDOWN_SECONDS * 1000;
        setScamPumpCooldownUntil(nextCooldownUntil);
        setScamPumpNow(Date.now());
        setIsAnalyzingScamPump(true);
        setScamPumpError("");

        try {
            const payload = await apiRequest("/market/scam-pump-board", { cache: "no-store" });

            const recommendations = Array.isArray(payload.recommendations)
                ? payload.recommendations
                : [];

            setScamPumpRecommendations(recommendations);
            setScamPumpUpdatedAt(payload.updatedAt || new Date().toISOString());
            setScamPumpInspectedCount(Number(payload.inspectedCount || 0));
            showToast("success", recommendations.length > 0
                ? "Scam Pump Board selesai dianalisis."
                : "Analisis selesai, belum ada kandidat kuat.");
        } catch (error) {
            const message = error.message || "Analisis Scam Pump Board gagal.";
            setScamPumpError(message);
            showToast("error", message);
        } finally {
            setIsAnalyzingScamPump(false);
        }
    }

    return (
        <ScamPumpBoard
            recommendations={scamPumpRecommendations}
            isAnalyzing={isAnalyzingScamPump}
            cooldownRemaining={scamPumpCooldownRemaining}
            error={scamPumpError}
            updatedAt={scamPumpUpdatedAt}
            inspectedCount={scamPumpInspectedCount}
            onAnalyze={handleScamPumpAnalyze}
        />
    );
}
