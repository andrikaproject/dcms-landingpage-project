"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthProvider";
import { apiRequest } from "@/lib/api/client";

const TIMEFRAMES = ["", "1m", "15m", "1h", "4h", "1d"];
const SOURCES = ["", "BITUNIX", "BYBIT"];
const number = (value) => Number(value || 0).toLocaleString("id-ID");

export default function AdaptiveGateObservabilityPage() {
    const [filters, setFilters] = useState({ timeframe: "", source: "" });
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setError("");
        try { setData(await apiRequest("/admin/adaptive-gate", { query: filters })); }
        catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Data observability gagal dimuat."); }
    }, [filters]);

    useEffect(() => {
        let active = true;

        Promise.resolve().then(async () => {
            try {
                const result = await apiRequest("/admin/adaptive-gate", { query: filters });
                if (active) {
                    setData(result);
                    setError("");
                }
            } catch (loadError) {
                if (active) {
                    setError(loadError instanceof Error ? loadError.message : "Data observability gagal dimuat.");
                }
            }
        });

        return () => { active = false; };
    }, [filters]);
    const snapshot = data?.snapSummary || {};
    const gates = data?.gateLogSummary || {};

    return <AuthGuard admin>
        <main className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-start">
                    <div>
                        <Link href="/dashboard/admin/users" className="text-sm text-blue-400 hover:underline">← Kembali ke Management User</Link>
                        <h1 className="mt-3 font-nebulica text-3xl font-bold">Adaptive Gate Observability</h1>
                        <p className="mt-1 text-sm text-zinc-500">Audit kesehatan learning system dan performa gate.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select value={filters.timeframe} onChange={(event) => setFilters((current) => ({ ...current, timeframe: event.target.value }))} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs">
                            {TIMEFRAMES.map((value) => <option key={value} value={value}>{value ? value.toUpperCase() : "All timeframe"}</option>)}
                        </select>
                        <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs">
                            {SOURCES.map((value) => <option key={value} value={value}>{value || "All source"}</option>)}
                        </select>
                    </div>
                </header>

                {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error} <button type="button" onClick={load} className="underline">Coba lagi</button></div>}
                {!data && !error && <p className="py-16 text-center text-zinc-500">Memuat observability…</p>}
                {data && <>
                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Metric label="Total Snapshots" value={number(snapshot.total)} accent />
                        <Metric label="Open" value={number(snapshot.open)} />
                        <Metric label="Resolved" value={number(snapshot.resolved)} />
                        <Metric label="Total Evaluations" value={number(gates.total)} />
                    </section>
                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Metric label="Exposure" value={number(data.exposureSummary?.total)} />
                        <Metric label="Unique Users" value={number(data.exposureSummary?.uniqueUsers)} />
                        <Metric label="Search" value={number(data.exposureSummary?.searchCount)} />
                        <Metric label="Re-analyze" value={number(data.exposureSummary?.reanalyzeCount)} />
                    </section>
                    <section className="grid gap-5 lg:grid-cols-2">
                        <Panel title="Gate Result"><Breakdown rows={[["LONG_VALID", gates.longValid], ["SHORT_VALID", gates.shortValid], ["NOT_READY", gates.notReady]]} /></Panel>
                        <Panel title="Snapshot Outcome"><Breakdown rows={[["WIN", snapshot.win], ["LOSS", snapshot.loss], ["LOSS_SOFT", snapshot.softLoss], ["AMBIGUOUS", snapshot.ambiguous]]} /></Panel>
                        <Panel title="Top Failed Gates"><Rows rows={data.topFailedGates} label="failedGate" /></Panel>
                        <Panel title="Top Rejection Reasons"><Rows rows={data.topReasons} label="reason" /></Panel>
                    </section>
                    <section className="grid gap-5 lg:grid-cols-2">
                        <Panel title="Breakdown Timeframe"><Rows rows={data.tfBreakdown} label="timeframe" /></Panel>
                        <Panel title="Breakdown Source"><Rows rows={data.srcBreakdown} label="source" /></Panel>
                    </section>
                </>}
            </div>
        </main>
    </AuthGuard>;
}

function Metric({ label, value, accent = false }) { return <article className={`rounded-xl border p-4 ${accent ? "border-[#B7FB5B]/30 bg-[#B7FB5B]/10" : "border-zinc-800 bg-zinc-900/60"}`}><p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p><p className={`mt-1 text-2xl font-bold ${accent ? "text-[#B7FB5B]" : "text-white"}`}>{value}</p></article>; }
function Panel({ title, children }) { return <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"><h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-400">{title}</h2>{children}</section>; }
function Breakdown({ rows }) { return <div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between border-b border-zinc-800/70 pb-2 text-sm"><span className="text-zinc-400">{label}</span><strong>{number(value)}</strong></div>)}</div>; }
function Rows({ rows = [], label }) { return rows.length ? <div className="space-y-2">{rows.map((row, index) => <div key={`${row[label]}-${index}`} className="flex justify-between border-b border-zinc-800/70 pb-2 text-sm"><span className="text-zinc-400">{row[label] || "-"}</span><strong>{number(row.count)}</strong></div>)}</div> : <p className="text-sm text-zinc-600">Tidak ada data.</p>; }
