"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthProvider";
import { fetchMlComparison, fetchMlModels, fetchMlOverview } from "@/lib/signals/api";
import { describeStatus } from "@/lib/signals/lifecycle";
import { formatRealizedR, formatUserTime } from "@/lib/signals/format";
import { shouldFallbackToLegacy } from "@/lib/signals/request";

// Kontrak backend hanya melayani dua timeframe ini.
const TIMEFRAMES = ["", "15m", "1h"];

const FLAG_LABELS = {
    recording: "Recording",
    collector: "Collector",
    evaluator: "Evaluator",
    // `publication` sengaja tidak ditampilkan: flag itu tidak mengendalikan jalur
    // penerbitan apa pun di backend, jadi menampilkannya menyesatkan.
    shadowScoring: "Shadow scoring",
    activeScoring: "Active scoring",
};

const METRIC_LABELS = {
    coverage: ["Coverage", "Analisis yang menghasilkan rencana terbit"],
    entryFillRate: ["Entry fill rate", "Rencana yang harganya menyentuh entry"],
    hit2RBeforeSL: ["Hit 2R sebelum SL", "Dari rencana yang pernah entry"],
    expiryRate: ["Expired tanpa entry", "Bukan kekalahan trading"],
    invalidationRate: ["Invalidated", "Target tersentuh sebelum entry"],
    ambiguityRate: ["Ambigu", "Urutan peristiwa tidak dapat ditentukan"],
};

const METRIC_DEFINITIONS = [
    ["Hit rate final TP", "Signal yang mencapai target final dibagi signal yang pernah entry (TP_HIT + SL_HIT + TIME_EXIT). Pending tidak masuk denominator."],
    ["Expired tanpa entry", "Rencana yang kedaluwarsa sebelum harga menyentuh pemicu entry. Bukan kekalahan trading."],
    ["Ambigu", "Urutan entry dan exit tidak dapat ditentukan dari data yang tersedia."],
    ["Net realized R", "Hasil setelah asumsi biaya yang disimpan bersama outcome."],
    ["Counterfactual", "Kandidat yang tidak terpilih, tetap dievaluasi dengan aturan yang sama sebagai pembanding."],
];

function percent(value) {
    if (value === null || value === undefined) return "Belum ada data";
    return `${(Number(value) * 100).toFixed(1)}%`;
}

function count(value) {
    if (value === null || value === undefined) return "—";
    return Number(value).toLocaleString("id-ID");
}

function Metric({ label, value, hint = null, accent = false, warn = false }) {
    const tone = warn ? "text-yellow-300" : accent ? "text-[#B7FB5B]" : "text-white";
    const border = warn ? "border-yellow-400/25 bg-yellow-500/[0.06]" : accent ? "border-[#B7FB5B]/25 bg-[#B7FB5B]/[0.06]" : "border-zinc-800 bg-zinc-950/70";

    return (
        <div className={`rounded-xl border p-4 ${border}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
            <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
            {hint && <p className="mt-1 text-[11px] leading-4 text-zinc-500">{hint}</p>}
        </div>
    );
}

function Panel({ title, description = null, children }) {
    return (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
            <h2 className="font-nebulica text-lg font-bold text-white">{title}</h2>
            {description && <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function Rows({ rows, empty = "Data belum tersedia." }) {
    if (!rows.length) return <p className="text-sm text-zinc-500">{empty}</p>;

    return (
        <div className="space-y-1.5">
            {rows.map(([label, value, hint]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-white/[0.04] pb-1.5 last:border-b-0">
                    <span className="text-xs text-zinc-500">
                        {label}
                        {hint && <span className="ml-2 text-[10px] text-zinc-600">{hint}</span>}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-zinc-200">{value}</span>
                </div>
            ))}
        </div>
    );
}

function FlagChip({ name, enabled }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${enabled
            ? "border-[#B7FB5B]/30 bg-[#B7FB5B]/10 text-[#B7FB5B]"
            : "border-zinc-700 bg-black/20 text-zinc-500"}`}
        >
            <span className={`size-1.5 rounded-full ${enabled ? "bg-[#B7FB5B]" : "bg-zinc-600"}`} />
            {FLAG_LABELS[name] || name} {enabled ? "hidup" : "mati"}
        </span>
    );
}

function planRows(plans) {
    return Object.entries(plans || {}).map(([status, total]) => [describeStatus(status).label, count(total)]);
}

function OutcomeTable({ outcomes }) {
    if (!outcomes.length) {
        return (
            <p className="text-sm text-zinc-500">
                Belum ada outcome tercatat. Outcome baru muncul setelah evaluator menilai perjalanan harga.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                    <tr className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        <th className="pb-2 pr-3 font-bold">Status</th>
                        <th className="pb-2 pr-3 font-bold">Jumlah</th>
                        <th className="pb-2 pr-3 font-bold">Gross R</th>
                        <th className="pb-2 pr-3 font-bold">Net R</th>
                        <th className="pb-2 font-bold">Evaluator</th>
                    </tr>
                </thead>
                <tbody>
                    {outcomes.map((row) => (
                        <tr key={`${row.status}-${row.evaluatorVersion}`} className="border-t border-white/[0.04] text-xs text-zinc-300">
                            <td className="py-2 pr-3 font-bold text-white">{describeStatus(row.status).label}</td>
                            <td className="py-2 pr-3">{count(row.count)}</td>
                            <td className="py-2 pr-3">{formatRealizedR(row.meanGrossR)}</td>
                            <td className="py-2 pr-3">{formatRealizedR(row.meanNetR)}</td>
                            <td className="py-2 text-zinc-500">{row.evaluatorVersion || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ReadinessTable({ readiness, thresholds, experimentReady }) {
    return (
        <>
            <div className={`mb-4 rounded-lg border p-3 text-xs ${experimentReady
                ? "border-[#B7FB5B]/25 bg-[#B7FB5B]/[0.06] text-[#B7FB5B]"
                : "border-zinc-700 bg-black/20 text-zinc-400"}`}
            >
                {experimentReady
                    ? "Dataset sudah memenuhi seluruh ambang. Eksperimen model boleh dinilai."
                    : "Dataset belum memenuhi ambang. Angka model apa pun pada tahap ini adalah eksplorasi, bukan bukti."}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            <th className="pb-2 pr-3 font-bold">Timeframe</th>
                            <th className="pb-2 pr-3 font-bold">Selesai / {count(thresholds?.minActivatedPerTimeframe)}</th>
                            <th className="pb-2 pr-3 font-bold">Simbol / {count(thresholds?.minDistinctSymbols)}</th>
                            <th className="pb-2 font-bold">Minggu / {count(thresholds?.minCalendarWeeks)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(readiness || []).map((row) => (
                            <tr key={row.timeframe} className="border-t border-white/[0.04] text-xs text-zinc-300">
                                <td className="py-2 pr-3 font-bold text-white">{row.timeframe?.toUpperCase()}</td>
                                <td className={`py-2 pr-3 ${row.meetsSampleFloor ? "text-[#B7FB5B]" : "text-zinc-400"}`}>{count(row.resolved)}</td>
                                <td className={`py-2 pr-3 ${row.meetsSymbolFloor ? "text-[#B7FB5B]" : "text-zinc-400"}`}>{count(row.symbols)}</td>
                                <td className={`py-2 ${row.meetsCalendarFloor ? "text-[#B7FB5B]" : "text-zinc-400"}`}>{count(row.weeks)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function ModelTable({ models, activeModelVersion }) {
    if (!models.length) return <p className="text-sm text-zinc-500">Belum ada model terdaftar.</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                    <tr className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        <th className="pb-2 pr-3 font-bold">Versi</th>
                        <th className="pb-2 pr-3 font-bold">Label</th>
                        <th className="pb-2 pr-3 font-bold">Algoritma</th>
                        <th className="pb-2 pr-3 font-bold">Stage</th>
                        <th className="pb-2 pr-3 font-bold">Dataset</th>
                        <th className="pb-2 font-bold">Sampel</th>
                    </tr>
                </thead>
                <tbody>
                    {models.map((model) => (
                        <tr key={model.modelVersion} className="border-t border-white/[0.04] text-xs text-zinc-300">
                            <td className="py-2 pr-3 font-bold text-white">
                                {model.modelVersion}
                                {model.modelVersion === activeModelVersion && <span className="ml-2 text-[10px] text-[#B7FB5B]">aktif</span>}
                            </td>
                            <td className="py-2 pr-3">{model.label || "—"}</td>
                            <td className="py-2 pr-3">{model.algorithm || "—"}</td>
                            <td className="py-2 pr-3">{model.stage || "—"}</td>
                            <td className="py-2 pr-3 text-zinc-500">
                                {model.datasetFrom ? `${formatUserTime(model.datasetFrom)} – ${formatUserTime(model.datasetTo)}` : "—"}
                            </td>
                            <td className="py-2 text-zinc-500">
                                {count(model.trainCount)} / {count(model.validationCount)} / {count(model.testCount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function MlObservabilityPage() {
    const [timeframe, setTimeframe] = useState("");
    const [state, setState] = useState({ status: "loading", overview: null, models: [], activeModelVersion: null, comparison: null, message: "" });

    const load = useCallback(async (activeTimeframe) => {
        try {
            const [overview, models] = await Promise.all([
                fetchMlOverview({ timeframe: activeTimeframe }),
                fetchMlModels({ page: 1, limit: 20 }).catch(() => ({ items: [], activeModelVersion: null })),
            ]);

            const activeModelVersion = overview?.versions?.activeModelVersion ?? models?.activeModelVersion ?? null;
            // Perbandingan wajib menyebut modelVersion, jadi hanya diminta bila ada model aktif.
            const comparison = activeModelVersion
                ? await fetchMlComparison({ modelVersion: activeModelVersion }).catch(() => null)
                : null;

            setState({
                status: "ready",
                overview,
                models: Array.isArray(models?.items) ? models.items : [],
                activeModelVersion,
                comparison,
                message: "",
            });
        } catch (error) {
            setState({
                status: shouldFallbackToLegacy(error) ? "unavailable" : "error",
                overview: null, models: [], activeModelVersion: null, comparison: null,
                message: shouldFallbackToLegacy(error)
                    ? "Endpoint /admin/ml belum tersedia atau dimatikan di backend."
                    : error?.message || "Data observability gagal dimuat.",
            });
        }
    }, []);

    useEffect(() => {
        let active = true;
        Promise.resolve().then(() => { if (active) load(timeframe); });
        return () => { active = false; };
    }, [timeframe, load]);

    const overview = state.overview;
    const flags = overview?.flags || {};
    const dataset = overview?.dataset || {};
    const metrics = overview?.metrics || {};
    const evaluator = overview?.evaluator || {};
    const versions = overview?.versions || {};
    const evaluatorIdle = flags.evaluator === false && Number(evaluator.open || 0) > 0;

    return <AuthGuard admin>
        <main className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-start">
                    <div>
                        <Link href="/dashboard/admin/adaptive-gate" className="text-sm text-blue-400 hover:underline">← Adaptive Gate Observability</Link>
                        <h1 className="mt-3 font-nebulica text-3xl font-bold">ML dan Pending Signal</h1>
                        <p className="mt-1 text-sm text-zinc-500">
                            Monitoring read-only. Promosi dan rollback model dilakukan di luar halaman ini.
                        </p>
                    </div>
                    <select
                        value={timeframe}
                        onChange={(event) => setTimeframe(event.target.value)}
                        className="h-fit rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs"
                    >
                        {TIMEFRAMES.map((value) => <option key={value} value={value}>{value ? value.toUpperCase() : "Semua timeframe"}</option>)}
                    </select>
                </header>

                {state.status === "loading" && <p className="py-16 text-center text-zinc-500">Memuat observability…</p>}

                {state.status === "unavailable" && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
                        <p className="font-bold text-zinc-300">Data belum tersedia</p>
                        <p className="mt-2 text-sm text-zinc-500">{state.message}</p>
                    </div>
                )}

                {state.status === "error" && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
                        {state.message}{" "}
                        <button type="button" onClick={() => load(timeframe)} className="underline">Coba lagi</button>
                    </div>
                )}

                {state.status === "ready" && (
                    <>
                        <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
                            <h2 className="font-nebulica text-lg font-bold text-white">Status Pipeline</h2>
                            <p className="mt-1 text-xs text-zinc-500">
                                Bagian yang mati tidak menghasilkan data apa pun, sebaik apa pun bagian lainnya berjalan.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {Object.keys(FLAG_LABELS).map((name) => <FlagChip key={name} name={name} enabled={flags[name] === true} />)}
                            </div>
                            <p className="mt-3 text-[11px] text-zinc-600">
                                Engine {versions.engineVersion || "—"} · fitur {versions.featureSchemaVersion || "—"} · policy {versions.policyVersion || "—"} · evaluator {versions.evaluatorVersion || "—"} · model aktif {versions.activeModelVersion || "belum ada"}
                            </p>
                        </section>

                        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Metric label="Analisis Tercatat" value={count(dataset.analyses)} accent />
                            <Metric label="Menerbitkan Rencana" value={count(dataset.published)} hint={`Coverage ${percent(metrics.coverage)}`} />
                            <Metric label="NO_SETUP" value={count(dataset.noSetup)} hint="Keputusan analisis, bukan kegagalan" />
                            <Metric label="Simbol Berbeda" value={count(dataset.symbols)} />
                        </section>

                        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Metric label="Rencana Terbuka" value={count(evaluator.open)} />
                            <Metric
                                label="Belum Dievaluasi"
                                value={count(evaluator.stale)}
                                warn={evaluatorIdle}
                                hint={evaluatorIdle ? "Evaluator mati, tidak ada yang memantau" : "Menunggu giliran evaluator"}
                            />
                            <Metric label="Sedang Diproses" value={count(evaluator.leased)} />
                            <Metric label="Entry Fill Rate" value={percent(metrics.entryFillRate)} />
                        </section>

                        {evaluatorIdle && (
                            <p className="rounded-lg border border-yellow-400/25 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
                                {count(evaluator.open)} rencana terbuka tetapi worker evaluator mati. Status tidak akan pernah berpindah dari Menunggu Entry dan tidak ada outcome yang terbentuk.
                            </p>
                        )}

                        <div className="grid gap-5 lg:grid-cols-2">
                            <Panel title="Metrik Perjalanan" description="Dihitung backend dari rencana yang tercatat.">
                                <Rows rows={Object.entries(METRIC_LABELS).map(([key, [label, hint]]) => [label, percent(metrics[key]), hint])} />
                            </Panel>

                            <Panel title="Rencana per Status" description="Counterfactual adalah kandidat tidak terpilih yang tetap dievaluasi.">
                                <Rows rows={[
                                    ...planRows(dataset.publishedPlans).map(([label, value]) => [`Terbit · ${label}`, value]),
                                    ...planRows(dataset.counterfactualPlans).map(([label, value]) => [`Counterfactual · ${label}`, value]),
                                ]} />
                            </Panel>
                        </div>

                        <Panel title="Status Outcome" description="Pending tidak dihitung sebagai kalah; expired dan invalidated dipisahkan dari hasil trade.">
                            <OutcomeTable outcomes={overview?.outcomes || []} />
                        </Panel>

                        <Panel title="Alasan Kandidat Ditolak" description="Menunjukkan filter mana yang paling sering menggugurkan kandidat.">
                            <Rows
                                rows={(overview?.topRejectionReasons || []).map((row) => [row.reason, count(row.count)])}
                                empty="Belum ada kandidat yang ditolak."
                            />
                        </Panel>

                        <Panel title="Kesiapan Eksperimen" description="Ambang minimum sebelum hasil model boleh disebut bukti.">
                            <ReadinessTable
                                readiness={overview?.readiness}
                                thresholds={overview?.thresholds}
                                experimentReady={overview?.experimentReady === true}
                            />
                        </Panel>

                        <Panel title="Registry Model" description="Baseline, shadow, dan model aktif beserta rentang datanya.">
                            <ModelTable models={state.models} activeModelVersion={state.activeModelVersion} />
                        </Panel>

                        <Panel
                            title="Baseline vs Model"
                            description="Angka berasal dari perhitungan backend. Halaman ini tidak menghitung statistik sendiri."
                        >
                            {state.comparison ? (
                                <Rows rows={[
                                    ["Analisis berpasangan", count(state.comparison.pairedAnalyses)],
                                    ["Uplift net R", formatRealizedR(state.comparison.uplift?.meanNetR)],
                                    ["Dapat dipromosikan", state.comparison.promotable === true ? "Ya" : "Belum"],
                                ]} />
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    Belum ada model aktif untuk dibandingkan. Perbandingan memerlukan model yang sudah dinilai dalam shadow mode.
                                </p>
                            )}
                        </Panel>

                        <Panel title="Definisi Metrik">
                            <dl className="space-y-3">
                                {METRIC_DEFINITIONS.map(([term, definition]) => (
                                    <div key={term}>
                                        <dt className="text-xs font-bold text-zinc-300">{term}</dt>
                                        <dd className="mt-0.5 text-[11px] leading-5 text-zinc-500">{definition}</dd>
                                    </div>
                                ))}
                            </dl>
                        </Panel>

                        <p className="pb-6 text-center text-[11px] text-zinc-600">
                            Data per {overview?.generatedAt ? formatUserTime(overview.generatedAt) : "—"}
                        </p>
                    </>
                )}
            </div>
        </main>
    </AuthGuard>;
}
