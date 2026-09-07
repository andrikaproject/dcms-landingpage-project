import { formatDay } from "./format";

const buttonClass = "min-h-11 rounded-lg border border-zinc-700 px-3 text-xs font-bold transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#B7FB5B] disabled:cursor-not-allowed disabled:opacity-40";
const number = (value) => Number(value || 0).toLocaleString("id-ID");

export default function DayList({ days, selectedDate, onSelect, onExport, onDelete, busy }) {
    if (!days.length) return <p className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400">Belum ada log.</p>;
    return <div className="grid gap-3">
        {days.map((day) => <article key={day.date} aria-label={`Log ${formatDay(day.date)}`} className={`flex min-w-0 flex-col justify-between gap-4 rounded-xl border p-4 md:flex-row md:items-center ${selectedDate === day.date ? "border-[#B7FB5B]/70 bg-[#B7FB5B]/5" : "border-zinc-800 bg-zinc-900/40"}`}>
            <div>
                <h3 className="font-bold">{formatDay(day.date)} <span className="ml-2 text-xs font-normal text-zinc-500">{number(day.total)} entri</span></h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-red-400/10 px-2 py-1 text-red-300">{number(day.errors)} error</span>
                    <span className="rounded-full bg-amber-400/10 px-2 py-1 text-amber-300">{number(day.warnings)} warn</span>
                    <span className="rounded-full bg-blue-400/10 px-2 py-1 text-blue-300">{number(day.activities)} aktivitas</span>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onSelect(day.date)} aria-pressed={selectedDate === day.date} className={`${buttonClass} ${selectedDate === day.date ? "text-[#B7FB5B]" : ""}`}>Lihat</button>
                    {["csv", "json"].map((format) => <button key={format} type="button" disabled={Boolean(busy.export) || busy.delete} onClick={() => onExport(format, day.date)} className={buttonClass}>{busy.export === format && busy.exportDate === day.date ? "Mengunduh…" : format.toUpperCase()}</button>)}
                    <button type="button" disabled={!day.deletable || busy.delete || Boolean(busy.export)} title={!day.deletable ? `Bisa dihapus mulai ${formatDay(day.deletableAt)}` : `Hapus log ${formatDay(day.date)}`} onClick={() => onDelete(day)} className={`${buttonClass} border-red-900/50 text-red-300`}>{busy.delete && busy.deleteDate === day.date ? "Menghapus…" : "Hapus"}</button>
                </div>
                {!day.deletable && <p className="text-xs text-zinc-400">bisa dihapus mulai {formatDay(day.deletableAt)}</p>}
            </div>
        </article>)}
    </div>;
}
