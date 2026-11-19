"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { normalizeQuery } from "@/lib/market/trading-pairs-core";
import { ANALYSIS_TIMEFRAMES, DEFAULT_ANALYSIS_TIMEFRAME } from "../overview/analysis-timeframes";
import ChartWorkspace from "./ChartWorkspace";

function ChartRoute() {
    const params = useSearchParams();
    const raw = normalizeQuery(params.get("symbol"));
    const symbol = raw ? (raw.endsWith("USDT") ? raw : `${raw}USDT`) : "";
    const requested = String(params.get("timeframe") || "").toLowerCase();
    const timeframe = ANALYSIS_TIMEFRAMES.includes(requested) ? requested : DEFAULT_ANALYSIS_TIMEFRAME;
    const lockedId = params.get("locked") || "";

    if (!symbol) {
        return (
            <div className="grid min-h-[60vh] place-items-center px-4 text-center">
                <div>
                    <p className="font-chakra text-base font-semibold text-[#f8fafc]">Koin belum dipilih</p>
                    <p className="mt-1 font-chakra text-sm text-[#94a3b8]">Buka chart lewat tombol Lihat chart di hasil analisis.</p>
                    <Link href="/dashboard" className="mt-4 inline-block font-chakra text-sm font-semibold text-[#a3e635] hover:underline">Kembali ke Dashboard</Link>
                </div>
            </div>
        );
    }

    // `key` mengembalikan timeframe chart, toggle level, dan zoom ke awal saat
    // koin, timeframe analisis, atau mode pantauan berganti.
    return <ChartWorkspace key={`${symbol}|${timeframe}|${lockedId}`} symbol={symbol} analysisTimeframe={timeframe} lockedId={lockedId} />;
}

export default function ChartPage() {
    return (
        <DashboardShell>
            <Suspense fallback={<div className="min-h-[60vh]" />}>
                <ChartRoute />
            </Suspense>
        </DashboardShell>
    );
}
