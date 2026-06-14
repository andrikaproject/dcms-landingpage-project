import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    getSnapshotSummary,
    getTimeframeBreakdown,
    getSourceBreakdown,
    getEngineVersionBreakdown,
    getGateLogSummary,
    getTopFailedGates,
    getTopRejectionReasons,
    getTopPatterns,
    getExposureSummary,
} from "@/lib/admin/adaptive-gate-analytics";
import { ADAPTIVE_GATE } from "@/lib/feature-flags";

export const metadata = { title: "Adaptive Gate Observability — Admin" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n, total) {
    if (!total) return "0%";
    return `${Math.round((n / total) * 100)}%`;
}

function fmt(n) {
    return Number(n || 0).toLocaleString("id-ID");
}

const GATE_LABELS = {
    direction: "Direction",
    entry_safety: "Entry Safety",
    risk: "Risk",
    market_context: "Market Context",
    adaptive_evidence: "Adaptive Evidence",
    pre_check: "Pre-Check",
};

const TIMEFRAME_ORDER = { "1m": 0, "15m": 1, "1h": 2, "4h": 3, "1d": 4 };

// ─── UI Components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent = false }) {
    return (
        <div className={`rounded-lg border p-4 ${accent ? "border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.04]" : "border-zinc-800 bg-zinc-900/60"}`}>
            <p className="font-chakra text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
            <p className={`mt-1 font-chakra text-2xl font-bold ${accent ? "text-[#B7FB5B]" : "text-white"}`}>{value}</p>
            {sub && <p className="mt-0.5 font-chakra text-xs text-zinc-600">{sub}</p>}
        </div>
    );
}

function SectionTitle({ children }) {
    return (
        <h2 className="mb-4 font-chakra text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
            {children}
        </h2>
    );
}

function BreakdownTable({ rows, keyLabel, keyField, countField = "count", total }) {
    if (!rows || rows.length === 0) {
        return <p className="font-chakra text-xs text-zinc-600">Tidak ada data.</p>;
    }
    return (
        <table className="w-full font-chakra text-sm">
            <thead>
                <tr className="border-b border-zinc-800">
                    <th className="py-2 text-left text-xs font-bold text-zinc-500 uppercase">{keyLabel}</th>
                    <th className="py-2 text-right text-xs font-bold text-zinc-500 uppercase">Count</th>
                    {total > 0 && <th className="py-2 text-right text-xs font-bold text-zinc-500 uppercase">%</th>}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-2 text-zinc-300">{row[keyField] || "-"}</td>
                        <td className="py-2 text-right text-white font-bold">{fmt(row[countField])}</td>
                        {total > 0 && (
                            <td className="py-2 text-right text-zinc-500">{pct(row[countField], total)}</td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function PatternRow({ pattern, rank, type }) {
    const parts = (pattern.fingerprint || "").split("|");
    const symbol = parts[0] || "?";
    const timeframe = parts[1] || "?";
    const bias = parts[2] || "?";
    const source = parts[3] || "?";
    const shortFp = parts.slice(4).join("|");

    const winRatePct = Math.round(pattern.winRate * 100);
    const badRatePct = Math.round(pattern.badRate * 100);
    const accentClass = type === "best" ? "text-[#B7FB5B]" : "text-red-300";

    return (
        <tr className="border-b border-zinc-800/50 last:border-0">
            <td className="py-2 text-zinc-600 font-bold text-xs">{rank}</td>
            <td className="py-2">
                <p className="font-bold text-white text-xs">{symbol} · {timeframe?.toUpperCase()} · {bias}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5 truncate max-w-[280px]" title={shortFp}>{source} · {shortFp}</p>
            </td>
            <td className="py-2 text-right text-xs text-zinc-400">{fmt(pattern.total)}</td>
            <td className={`py-2 text-right text-xs font-bold ${accentClass}`}>
                {type === "best" ? winRatePct : badRatePct}%
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdaptiveGateObservabilityPage({ searchParams }) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") redirect("/dashboard");
    if (!ADAPTIVE_GATE.admin) redirect("/dashboard/admin/users");

    const params = await searchParams;
    const filterTimeframe = params?.timeframe || "";
    const filterSource = params?.source || "";

    const [
        snapSummary,
        tfBreakdown,
        srcBreakdown,
        engBreakdown,
        gateLogSummary,
        topFailedGates,
        topReasons,
        topPatterns,
        exposureSummary,
    ] = await Promise.all([
        getSnapshotSummary({ timeframe: filterTimeframe, source: filterSource }),
        getTimeframeBreakdown(),
        getSourceBreakdown(),
        getEngineVersionBreakdown(),
        getGateLogSummary(),
        getTopFailedGates(),
        getTopRejectionReasons(),
        getTopPatterns({ limit: 5 }),
        getExposureSummary(),
    ]);

    const resolvedTotal = snapSummary.win + snapSummary.loss + snapSummary.softLoss + snapSummary.ambiguous;
    const sortedTf = [...tfBreakdown].sort(
        (a, b) => (TIMEFRAME_ORDER[a.timeframe] ?? 99) - (TIMEFRAME_ORDER[b.timeframe] ?? 99)
    );

    const TIMEFRAMES = ["1m", "15m", "1h", "4h", "1d"];
    const SOURCES = ["BINANCE", "BYBIT"];

    return (
        <div className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-10">

                {/* Header */}
                <header className="border-b border-zinc-800 pb-5">
                    <Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 font-chakra text-sm text-blue-400 hover:underline">
                        ← Back to Dashboard
                    </Link>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="font-chakra text-2xl font-bold text-white">Adaptive Gate Observability</h1>
                            <p className="mt-1 font-chakra text-sm text-zinc-500">Audit kesehatan learning system dan gate performance.</p>
                        </div>

                        {/* Filters */}
                        <form method="GET" className="flex flex-wrap gap-2">
                            <div className="flex rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
                                <Link
                                    href="/dashboard/admin/adaptive-gate"
                                    className={`rounded px-3 py-1.5 font-chakra text-xs font-bold transition ${!filterTimeframe ? "bg-[#B7FB5B] text-black" : "text-zinc-500 hover:text-zinc-200"}`}
                                >
                                    All TF
                                </Link>
                                {TIMEFRAMES.map((tf) => (
                                    <Link
                                        key={tf}
                                        href={`/dashboard/admin/adaptive-gate?timeframe=${tf}${filterSource ? `&source=${filterSource}` : ""}`}
                                        className={`rounded px-3 py-1.5 font-chakra text-xs font-bold transition ${filterTimeframe === tf ? "bg-[#B7FB5B] text-black" : "text-zinc-500 hover:text-zinc-200"}`}
                                    >
                                        {tf.toUpperCase()}
                                    </Link>
                                ))}
                            </div>
                            <div className="flex rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
                                <Link
                                    href={`/dashboard/admin/adaptive-gate${filterTimeframe ? `?timeframe=${filterTimeframe}` : ""}`}
                                    className={`rounded px-3 py-1.5 font-chakra text-xs font-bold transition ${!filterSource ? "bg-[#B7FB5B] text-black" : "text-zinc-500 hover:text-zinc-200"}`}
                                >
                                    All Source
                                </Link>
                                {SOURCES.map((src) => (
                                    <Link
                                        key={src}
                                        href={`/dashboard/admin/adaptive-gate?source=${src}${filterTimeframe ? `&timeframe=${filterTimeframe}` : ""}`}
                                        className={`rounded px-3 py-1.5 font-chakra text-xs font-bold transition ${filterSource === src ? "bg-[#B7FB5B] text-black" : "text-zinc-500 hover:text-zinc-200"}`}
                                    >
                                        {src}
                                    </Link>
                                ))}
                            </div>
                        </form>
                    </div>
                </header>

                {/* Snapshot Summary */}
                <section>
                    <SectionTitle>Snapshot Summary</SectionTitle>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                        <MetricCard label="Total Snapshots" value={fmt(snapSummary.total)} accent />
                        <MetricCard label="Open" value={fmt(snapSummary.open)} sub={pct(snapSummary.open, snapSummary.total)} />
                        <MetricCard label="Resolved" value={fmt(snapSummary.resolved)} sub={pct(snapSummary.resolved, snapSummary.total)} />
                        <MetricCard label="Total Evaluations" value={fmt(gateLogSummary.total)} sub="gate logs" />
                    </div>
                </section>

                {/* User Exposure */}
                <section>
                    <SectionTitle>User Exposure</SectionTitle>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MetricCard label="Total Exposures" value={fmt(exposureSummary.total)} />
                        <MetricCard label="Unique Users" value={fmt(exposureSummary.uniqueUsers)} />
                        <MetricCard label="Search Actions" value={fmt(exposureSummary.searchCount)} />
                        <MetricCard label="Re-analyze Actions" value={fmt(exposureSummary.reanalyzeCount)} />
                    </div>
                </section>

                {/* Outcome + Gate Results */}
                <section>
                    <SectionTitle>Outcome & Gate Results</SectionTitle>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Outcome breakdown */}
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="mb-3 font-chakra text-xs font-bold text-zinc-400 uppercase">Outcome Breakdown (Resolved)</p>
                            {resolvedTotal === 0 ? (
                                <p className="font-chakra text-xs text-zinc-600">Belum ada resolved outcomes.</p>
                            ) : (
                                <div className="space-y-2">
                                    {[
                                        { label: "WIN", value: snapSummary.win, color: "bg-[#B7FB5B]" },
                                        { label: "LOSS", value: snapSummary.loss, color: "bg-red-500" },
                                        { label: "LOSS_SOFT", value: snapSummary.softLoss, color: "bg-orange-500" },
                                        { label: "AMBIGUOUS", value: snapSummary.ambiguous, color: "bg-yellow-500" },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <span className="w-24 font-chakra text-xs text-zinc-400">{label}</span>
                                            <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${color}`}
                                                    style={{ width: `${resolvedTotal > 0 ? (value / resolvedTotal * 100) : 0}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-right font-chakra text-xs font-bold text-white">{fmt(value)}</span>
                                            <span className="w-10 text-right font-chakra text-xs text-zinc-600">{pct(value, resolvedTotal)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Gate result breakdown */}
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="mb-3 font-chakra text-xs font-bold text-zinc-400 uppercase">Gate Result Breakdown</p>
                            {gateLogSummary.total === 0 ? (
                                <p className="font-chakra text-xs text-zinc-600">Belum ada gate evaluations.</p>
                            ) : (
                                <div className="space-y-2">
                                    {[
                                        { label: "LONG_VALID", value: gateLogSummary.longValid, color: "bg-[#B7FB5B]" },
                                        { label: "SHORT_VALID", value: gateLogSummary.shortValid, color: "bg-red-400" },
                                        { label: "NOT_READY", value: gateLogSummary.notReady, color: "bg-yellow-500" },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <span className="w-24 font-chakra text-xs text-zinc-400">{label}</span>
                                            <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${color}`}
                                                    style={{ width: `${gateLogSummary.total > 0 ? (value / gateLogSummary.total * 100) : 0}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-right font-chakra text-xs font-bold text-white">{fmt(value)}</span>
                                            <span className="w-10 text-right font-chakra text-xs text-zinc-600">{pct(value, gateLogSummary.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Failed Gates + Reasons */}
                <section>
                    <SectionTitle>Rejection Analysis</SectionTitle>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="mb-3 font-chakra text-xs font-bold text-zinc-400 uppercase">Top Failed Gates</p>
                            {topFailedGates.length === 0 ? (
                                <p className="font-chakra text-xs text-zinc-600">Belum ada data.</p>
                            ) : (
                                <table className="w-full font-chakra text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="py-2 text-left text-xs font-bold text-zinc-500 uppercase">Gate</th>
                                            <th className="py-2 text-right text-xs font-bold text-zinc-500 uppercase">Rejections</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topFailedGates.map((row) => (
                                            <tr key={row.failedGate} className="border-b border-zinc-800/50 last:border-0">
                                                <td className="py-2 text-zinc-300">{GATE_LABELS[row.failedGate] || row.failedGate}</td>
                                                <td className="py-2 text-right font-bold text-red-300">{fmt(row.count)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="mb-3 font-chakra text-xs font-bold text-zinc-400 uppercase">Top Rejection Reasons</p>
                            {topReasons.length === 0 ? (
                                <p className="font-chakra text-xs text-zinc-600">Belum ada data.</p>
                            ) : (
                                <div className="space-y-2">
                                    {topReasons.map(({ reason, count: c }, i) => (
                                        <div key={i} className="flex items-start justify-between gap-3 border-b border-zinc-800/50 pb-2 last:border-0">
                                            <p className="font-chakra text-xs leading-4 text-zinc-300 flex-1">{reason}</p>
                                            <span className="shrink-0 font-chakra text-xs font-bold text-yellow-300">{fmt(c)}×</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Breakdowns */}
                <section>
                    <SectionTitle>Distribution Breakdown</SectionTitle>
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="mb-3 font-chakra text-xs font-bold text-zinc-400 uppercase">By Timeframe</p>
                            <BreakdownTable rows={sortedTf} keyLabel="TF" keyField="timeframe" total={snapSummary.total} />
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="mb-3 font-chakra text-xs font-bold text-zinc-400 uppercase">By Source</p>
                            <BreakdownTable rows={srcBreakdown} keyLabel="Source" keyField="source" total={snapSummary.total} />
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="mb-3 font-chakra text-xs font-bold text-zinc-400 uppercase">By Engine Version</p>
                            <BreakdownTable rows={engBreakdown} keyLabel="Version" keyField="engineVersion" total={snapSummary.total} />
                        </div>
                    </div>
                </section>

                {/* Pattern Metrics */}
                <section>
                    <SectionTitle>Setup Pattern Performance</SectionTitle>
                    {topPatterns.best.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-10 text-center">
                            <p className="font-chakra text-sm text-zinc-600">
                                Belum cukup resolved signals untuk pattern analysis (butuh ≥5 resolved per setup).
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Best patterns */}
                            <div className="rounded-lg border border-[#B7FB5B]/15 bg-[#B7FB5B]/[0.03] p-4">
                                <p className="mb-3 font-chakra text-xs font-bold text-[#B7FB5B]/70 uppercase">Best Win Rate Patterns</p>
                                <table className="w-full font-chakra text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="py-2 text-left text-xs font-bold text-zinc-500 uppercase">#</th>
                                            <th className="py-2 text-left text-xs font-bold text-zinc-500 uppercase">Setup</th>
                                            <th className="py-2 text-right text-xs font-bold text-zinc-500 uppercase">n</th>
                                            <th className="py-2 text-right text-xs font-bold text-zinc-500 uppercase">Win%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topPatterns.best.map((p, i) => (
                                            <PatternRow key={p.fingerprint} pattern={p} rank={i + 1} type="best" />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Worst patterns */}
                            <div className="rounded-lg border border-red-400/15 bg-red-500/[0.03] p-4">
                                <p className="mb-3 font-chakra text-xs font-bold text-red-300/70 uppercase">Worst Bad Rate Patterns</p>
                                <table className="w-full font-chakra text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="py-2 text-left text-xs font-bold text-zinc-500 uppercase">#</th>
                                            <th className="py-2 text-left text-xs font-bold text-zinc-500 uppercase">Setup</th>
                                            <th className="py-2 text-right text-xs font-bold text-zinc-500 uppercase">n</th>
                                            <th className="py-2 text-right text-xs font-bold text-zinc-500 uppercase">Bad%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topPatterns.worst.map((p, i) => (
                                            <PatternRow key={p.fingerprint} pattern={p} rank={i + 1} type="worst" />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>

                {/* Footer note */}
                <footer className="border-t border-zinc-800 pt-4 pb-8">
                    <p className="font-chakra text-xs text-zinc-700">
                        Adaptive Gate v1 Observability · Data diambil real-time dari database.
                        Pattern analysis membutuhkan minimal 5 resolved outcomes per fingerprint.
                    </p>
                </footer>

            </div>
        </div>
    );
}
