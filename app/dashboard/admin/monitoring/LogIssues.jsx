import { formatTime, impactClass, labelForType } from "./format";

export default function LogIssues({ issues, loading, error, onSelect, onRetry }) {
    return <div className="space-y-4">
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm leading-relaxed text-zinc-400">HIGH: server error, crash render, atau jalur login/register/lock sinyal. Naik satu tingkat bila ≥ 5 user atau ≥ 50 kejadian; langsung HIGH bila ≥ 20 user atau ≥ 200 kejadian.</p>
        {loading ? <p role="status" className="py-8 text-center text-zinc-400">Memuat masalah…</p> : error ? <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error} <button type="button" onClick={onRetry} className="min-h-11 px-2 underline">Coba lagi</button></div> : !issues.length ? <p className="py-8 text-center text-zinc-400">Tidak ada error pada hari ini.</p> : <div className="grid gap-3">
            {issues.map((issue) => <button type="button" key={issue.fingerprint} onClick={() => onSelect(issue)} className="w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left transition hover:border-[#B7FB5B]/50 focus-visible:outline-2 focus-visible:outline-[#B7FB5B]">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-xs font-bold ${impactClass(issue.impact)}`}>{issue.impact}</span>
                    <span className="text-xs text-zinc-400">Keparahan dasar: {issue.severity}</span>
                    <strong title={issue.type} className="break-all text-sm">{labelForType(issue.type)}</strong>
                </div>
                <p className="mt-3 break-words text-sm text-zinc-300">{(issue.sampleMessage || "—").slice(0, 160)}{issue.sampleMessage?.length > 160 ? "…" : ""}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>{Number(issue.count).toLocaleString("id-ID")} kejadian</span>
                    <span>{Number(issue.uniqueUsers).toLocaleString("id-ID")} user</span>
                    <span>pertama {formatTime(issue.firstSeenAt)} · terakhir {formatTime(issue.lastSeenAt)}</span>
                    <span className="text-[#B7FB5B]">Lihat entri →</span>
                </div>
            </button>)}
        </div>}
    </div>;
}
