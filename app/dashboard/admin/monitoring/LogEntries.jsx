import { Fragment, useId, useRef, useState } from "react";
import { KNOWN_TYPES, formatTime, impactClass, labelForType, levelClass, summarizeEntry } from "./format";

const control = "min-h-11 min-w-0 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-base text-white focus-visible:outline-2 focus-visible:outline-[#B7FB5B] sm:text-sm";
const button = "min-h-11 rounded-lg border border-zinc-700 px-3 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#B7FB5B] disabled:cursor-not-allowed disabled:opacity-40";
const cell = "block min-w-0 p-2 align-top md:table-cell md:p-3";

export default function LogEntries({ entries, total, page, limit, loading, error, filters, onFilterChange, onResetFilters, onPageChange, onRetry }) {
    const typesId = useId();
    const hasFilters = Object.values(filters).some(Boolean);
    const pages = Math.max(1, Math.ceil(total / limit));
    return <div className="space-y-4">
        <div role="group" aria-label="Jenis log" className="flex flex-wrap gap-2">
            {[["", "Semua"], ["ERROR", "Error"], ["ACTIVITY", "Aktivitas"]].map(([value, label]) => <button key={value} type="button" onClick={() => onFilterChange("kind", value)} aria-pressed={filters.kind === value} className={`${button} ${filters.kind === value ? "border-[#B7FB5B]/50 bg-[#B7FB5B]/10 text-[#B7FB5B]" : "text-zinc-400"}`}>{label}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <label className="min-w-0 space-y-1 text-xs text-zinc-400"><span>Level</span><select className={control} value={filters.level} onChange={(e) => onFilterChange("level", e.target.value)}><option value="">Semua level</option>{["ERROR", "WARN", "INFO"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="min-w-0 space-y-1 text-xs text-zinc-400"><span>Sumber</span><select className={control} value={filters.source} onChange={(e) => onFilterChange("source", e.target.value)}><option value="">Semua sumber</option>{["FRONTEND", "BACKEND"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="min-w-0 space-y-1 text-xs text-zinc-400"><span>Tipe</span><input className={control} list={typesId} maxLength={64} value={filters.type} placeholder="Semua tipe" onChange={(e) => onFilterChange("type", e.target.value)} /></label>
            <datalist id={typesId}>{KNOWN_TYPES.map((type) => <option key={type} value={type}>{labelForType(type)}</option>)}</datalist>
            <label className="min-w-0 space-y-1 text-xs text-zinc-400"><span>Email user</span><input className={control} value={filters.user} maxLength={255} placeholder="Cari email…" onChange={(e) => onFilterChange("user", e.target.value)} /></label>
            <label className="col-span-2 min-w-0 space-y-1 text-xs text-zinc-400 lg:col-span-1"><span>Cari pesan</span><input className={control} value={filters.q} maxLength={200} placeholder="Cari pesan…" onChange={(e) => onFilterChange("q", e.target.value)} /></label>
        </div>
        {hasFilters && <div className="flex min-w-0 flex-wrap gap-2">
            {filters.fingerprint && <button type="button" title={filters.fingerprint} onClick={() => onFilterChange("fingerprint", "")} className={`${button} max-w-full break-all text-[#B7FB5B]`} aria-label="Hapus filter fingerprint">fingerprint: {filters.fingerprint.slice(0, 12)}… ✕</button>}
            <button type="button" onClick={onResetFilters} className={`${button} text-zinc-400`}>Reset filter</button>
        </div>}
        {loading ? <p role="status" className="py-10 text-center text-zinc-400">Memuat entri…</p> : error ? <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error} <button type="button" onClick={onRetry} className="min-h-11 px-2 underline">Coba lagi</button></div> : !entries.length ? <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400"><p>{hasFilters ? "Tidak ada entri yang cocok" : "Tidak ada entri pada hari ini."}</p>{hasFilters && <button type="button" onClick={onResetFilters} className="mt-2 min-h-11 px-3 text-[#B7FB5B] underline">Reset filter</button>}</div> : <div className="min-w-0 md:overflow-x-auto">
            <table className="block w-full text-left text-sm md:table md:table-fixed">
                <caption className="sr-only">Entri log, waktu mengikuti zona lokal browser</caption>
                <thead className="hidden border-b border-zinc-800 text-xs text-zinc-400 md:table-header-group"><tr>{["Waktu", "Level", "Dampak", "Tipe", "User", "Ringkasan", "Status", "Detail"].map((label) => <th key={label} scope="col" className={`p-3 font-medium ${label === "Ringkasan" ? "w-1/4" : ""}`}>{label}</th>)}</tr></thead>
                <tbody className="block md:table-row-group">{entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)}</tbody>
            </table>
        </div>}
        {!error && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
            <span>total {Number(total).toLocaleString("id-ID")} entri</span>
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={button} disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>‹ Sebelumnya</button>
                <span aria-live="polite">halaman {page} dari {pages}</span>
                <button type="button" className={button} disabled={loading || page >= pages} onClick={() => onPageChange(page + 1)}>Berikutnya ›</button>
            </div>
        </div>}
    </div>;
}

function EntryRow({ entry }) {
    const [expanded, setExpanded] = useState(false);
    const detailId = useId();
    return <Fragment>
        <tr className="mb-3 grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-900/30 p-2 md:mb-0 md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:p-0">
            <td className={cell}><span className="mr-2 text-xs text-zinc-500 md:hidden">Waktu</span><time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time></td>
            <td className={cell}><span className={`inline-block rounded-full border px-2 py-1 text-xs ${levelClass(entry.level)}`}>{entry.level}</span></td>
            <td className={cell}>{entry.kind === "ERROR" ? <span className={`inline-block rounded-full border px-2 py-1 text-xs ${impactClass(entry.impact)}`}>{entry.impact || entry.severity || "—"}</span> : <span className="text-zinc-500">—</span>}</td>
            <td className={`${cell} break-words`} title={entry.type}>{labelForType(entry.type)}</td>
            <td className={`${cell} col-span-2 break-all text-zinc-400`}>{entry.userEmail || "anonim"}</td>
            <td className={`${cell} col-span-2 break-words text-zinc-300`}>{summarizeEntry(entry)}</td>
            <td className={cell}><span className="mr-2 text-xs text-zinc-500 md:hidden">Status</span>{entry.statusCode ?? "—"}</td>
            <td className={cell}><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls={detailId} aria-label={`${expanded ? "Tutup" : "Buka"} detail ${labelForType(entry.type)}`} className="min-h-11 px-2 text-xs text-[#B7FB5B] hover:underline">{expanded ? "Tutup ▴" : "Detail ▾"}</button></td>
        </tr>
        {expanded && <tr className="mb-4 block md:table-row"><td colSpan={8} className="block min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-4 md:table-cell"><EntryDetails entry={entry} id={detailId} /></td></tr>}
    </Fragment>;
}

function EntryDetails({ entry, id }) {
    const requestRef = useRef(null);
    const [copyStatus, setCopyStatus] = useState("");
    async function copyRequestId() {
        try {
            await navigator.clipboard.writeText(entry.requestId);
            setCopyStatus("Request ID disalin");
        } catch {
            const range = document.createRange();
            range.selectNodeContents(requestRef.current);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            setCopyStatus("Pilih Salin pada teks Request ID yang diseleksi.");
        }
    }
    return <div id={id} className="min-w-0 space-y-3 text-xs">
        <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div><dt className="text-zinc-500">Request ID</dt><dd className="break-all"><code ref={requestRef}>{entry.requestId || "—"}</code>{entry.requestId && <button type="button" onClick={copyRequestId} className="ml-2 min-h-11 px-2 text-[#B7FB5B] underline">Salin</button>}<span role="status" className="block text-zinc-400">{copyStatus}</span></dd></div>
            {[["IP", entry.ip], ["User agent", entry.userAgent], ["Fingerprint", entry.fingerprint], ["Pesan", entry.message]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-zinc-500">{label}</dt><dd className="break-words font-mono">{value || "—"}</dd></div>)}
        </dl>
        <div><p className="mb-1 text-zinc-500">Details</p><pre className="max-h-64 overflow-auto rounded-lg bg-black p-3 font-mono text-xs text-zinc-300">{JSON.stringify(entry.details, null, 2) || "null"}</pre></div>
        {entry.details?.stack && <div><p className="mb-1 text-zinc-500">Stack</p><pre className="max-h-64 overflow-auto rounded-lg bg-black p-3 font-mono text-xs text-zinc-300">{entry.details.stack}</pre></div>}
    </div>;
}
