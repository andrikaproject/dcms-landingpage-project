import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiDownload, apiRequest } from "@/lib/api/client";
import { getAppReporter } from "@/lib/monitoring/app-reporter";
import DashboardToast from "@/app/dashboard/DashboardToast";
import DayList from "./DayList";
import LogEntries from "./LogEntries";
import LogIssues from "./LogIssues";
import { exportFilename, formatDay, triggerBrowserDownload } from "./format";

const EMPTY_FILTERS = { kind: "", level: "", source: "", type: "", fingerprint: "", user: "", q: "" };
const LIMIT = 50;
const button = "min-h-11 rounded-lg border border-zinc-700 px-4 text-sm font-bold hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#B7FB5B] disabled:cursor-not-allowed disabled:opacity-40";
const messageFor = (error) => error instanceof Error ? error.message : "Data monitoring gagal dimuat.";

export default function MonitoringWorkspace() {
    const { user } = useAuth();
    const [days, setDays] = useState([]);
    const [daysLoading, setDaysLoading] = useState(true);
    const [daysError, setDaysError] = useState("");
    const [selection, setSelection] = useState({ date: null, filters: EMPTY_FILTERS, page: 1 });
    const { date: selectedDate, filters, page } = selection;
    const [tab, setTab] = useState("entries");
    const [textFilters, setTextFilters] = useState({ user: "", q: "" });
    const textPending = textFilters.user !== filters.user || textFilters.q !== filters.q;
    const [entries, setEntries] = useState([]);
    const [total, setTotal] = useState(0);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [entriesError, setEntriesError] = useState("");
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [issuesError, setIssuesError] = useState("");
    const [busy, setBusy] = useState({ export: null, delete: false });
    const [daysVersion, setDaysVersion] = useState(0);
    const [contentVersion, setContentVersion] = useState(0);
    const [toasts, setToasts] = useState([]);
    const mutationBusy = useRef(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const notify = useCallback((message, type = "success") => {
        if (mounted.current) setToasts((current) => [...current, { id: crypto.randomUUID(), message, type }]);
    }, []);
    const dismissToast = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

    useEffect(() => {
        let active = true;
        const timer = setTimeout(() => {
            if (active) setTextFilters((current) => current.user === filters.user && current.q === filters.q ? current : { user: filters.user, q: filters.q });
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [filters.user, filters.q]);

    useEffect(() => {
        let active = true;
        Promise.resolve().then(async () => {
            if (!active) return;
            setDaysLoading(true);
            setDaysError("");
            try {
                const data = await apiRequest("/admin/logs/days");
                if (!active) return;
                const nextDays = data.days || [];
                setDays(nextDays);
                setSelection((current) => nextDays.some((day) => day.date === current.date) ? current : { ...current, date: nextDays[0]?.date || null, page: 1 });
            } catch (error) {
                if (active) setDaysError(messageFor(error));
            } finally {
                if (active) {
                    setDaysLoading(false);
                    // Refresh the visible tab after the day list has settled.
                    setContentVersion((value) => value + 1);
                }
            }
        });
        return () => { active = false; };
    }, [daysVersion]);

    useEffect(() => {
        let active = true;
        if (!selectedDate || tab !== "entries" || textPending) return () => { active = false; };
        Promise.resolve().then(async () => {
            if (!active) return;
            setEntriesLoading(true);
            setEntriesError("");
            try {
                const data = await apiRequest("/admin/logs", { query: { date: selectedDate, ...filters, ...textFilters, page, limit: LIMIT } });
                if (!active) return;
                const lastPage = Math.max(1, Math.ceil(data.total / LIMIT));
                if (page > lastPage) {
                    setSelection((current) => ({ ...current, page: lastPage }));
                    return;
                }
                setEntries(data.items || []);
                setTotal(data.total || 0);
            } catch (error) {
                if (active) setEntriesError(messageFor(error));
            } finally {
                if (active) setEntriesLoading(false);
            }
        });
        return () => { active = false; };
    }, [selectedDate, filters, textFilters, textPending, page, tab, contentVersion]);

    useEffect(() => {
        let active = true;
        if (!selectedDate || tab !== "issues") return () => { active = false; };
        Promise.resolve().then(async () => {
            if (!active) return;
            setIssuesLoading(true);
            setIssuesError("");
            try {
                const data = await apiRequest("/admin/logs/issues", { query: { date: selectedDate } });
                if (active) setIssues(data.issues || []);
            } catch (error) {
                if (active) setIssuesError(messageFor(error));
            } finally {
                if (active) setIssuesLoading(false);
            }
        });
        return () => { active = false; };
    }, [selectedDate, tab, contentVersion]);

    function selectDate(date) {
        setSelection((current) => ({ ...current, date, page: 1 }));
    }
    function changeFilter(key, value) {
        setSelection((current) => ({ ...current, filters: { ...current.filters, [key]: value }, page: 1 }));
    }
    function resetFilters() {
        setSelection((current) => ({ ...current, filters: EMPTY_FILTERS, page: 1 }));
    }
    function selectIssue(issue) {
        // Opening a group must show all its entries, even after unrelated filters.
        setSelection((current) => ({ ...current, filters: { ...EMPTY_FILTERS, fingerprint: issue.fingerprint, kind: "ERROR" }, page: 1 }));
        setTab("entries");
    }
    function handleRefresh() {
        setDaysVersion((value) => value + 1);
    }

    async function handleExport(format, date = selectedDate) {
        if (!date || mutationBusy.current) return;
        mutationBusy.current = true;
        setBusy({ export: format, exportDate: date, delete: false });
        const kind = filters.kind || undefined;
        try {
            const { blob, filename } = await apiDownload("/admin/logs/export", { query: { date, format, kind } });
            if (!mounted.current) return;
            triggerBrowserDownload(blob, filename && filename !== "download" ? filename : exportFilename(date, format, kind));
            notify(`Log ${formatDay(date)} berhasil diunduh sebagai ${format.toUpperCase()}.`);
        } catch (error) {
            notify(messageFor(error), "error");
        } finally {
            mutationBusy.current = false;
            if (mounted.current) setBusy({ export: null, delete: false });
        }
    }

    async function handleDelete(day) {
        if (!day.deletable || mutationBusy.current) return;
        if (!window.confirm(`Hapus semua log tanggal ${formatDay(day.date)} (${day.total} entri)? Tindakan ini tidak bisa dibatalkan.`)) return;
        mutationBusy.current = true;
        setBusy({ export: null, delete: true, deleteDate: day.date });
        try {
            const data = await apiRequest(`/admin/logs/days/${day.date}`, { method: "DELETE" });
            if (!mounted.current) return;
            notify(`${Number(data.deleted).toLocaleString("id-ID")} entri dihapus`);
            setSelection((current) => current.date === day.date ? { ...current, date: null, page: 1 } : current);
            setDays((current) => current.filter((item) => item.date !== day.date));
            handleRefresh();
        } catch (error) {
            notify(messageFor(error), "error");
        } finally {
            mutationBusy.current = false;
            if (mounted.current) setBusy({ export: null, delete: false });
        }
    }

    function handleTestError() {
        const accepted = getAppReporter().report({ type: "CLIENT_UNCAUGHT_ERROR", message: `Uji manual dari halaman monitoring oleh ${user.email}`, details: { manualTest: true } }, { bypassDedupe: true, force: true });
        notify(accepted ? "Laporan uji terkirim. Tekan Refresh untuk melihatnya." : "Laporan uji belum dikirim. Batas laporan mungkin tercapai; coba lagi sebentar.", accepted ? "success" : "error");
    }

    return <>
        <DashboardToast toasts={toasts} onDismiss={dismissToast} />
        <section aria-labelledby="days-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 id="days-heading" className="text-lg font-bold">Daftar hari</h2><p className="text-xs text-zinc-400">Tanggal UTC · Waktu entri lokal · Ekspor: {filters.kind === "ERROR" ? "Error" : filters.kind === "ACTIVITY" ? "Aktivitas" : "Semua log"}</p></div>
                <div className="flex flex-wrap gap-2"><button type="button" className={`${button} border-red-400/25 text-red-300`} onClick={handleTestError}>Kirim error uji</button><button type="button" className={button} onClick={handleRefresh} disabled={daysLoading}>{daysLoading ? "Memuat…" : "Refresh"}</button></div>
            </div>
            {daysError && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-200">{daysError} <button type="button" onClick={handleRefresh} className="min-h-11 px-2 underline">Coba lagi</button></div>}
            {daysLoading && <p role="status" className="py-4 text-zinc-400">Memuat daftar hari…</p>}
            {(!daysLoading && !daysError || days.length > 0) && <DayList days={days} selectedDate={selectedDate} onSelect={selectDate} onExport={handleExport} onDelete={handleDelete} busy={busy} />}
        </section>
        {selectedDate && <section aria-labelledby="detail-heading" className="min-w-0 space-y-4 border-t border-zinc-800 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="detail-heading" className="text-lg font-bold">Detail hari: {formatDay(selectedDate)}</h2>
                <div role="group" aria-label="Tampilan log" className="flex gap-2">{[["entries", "Entri"], ["issues", "Masalah"]].map(([value, label]) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)} className={`${button} ${tab === value ? "border-[#B7FB5B]/50 bg-[#B7FB5B]/10 text-[#B7FB5B]" : "text-zinc-400"}`}>{label}</button>)}</div>
            </div>
            {tab === "entries" ? <LogEntries entries={entries} total={total} page={page} limit={LIMIT} loading={entriesLoading || textPending} error={entriesError} filters={filters} onFilterChange={changeFilter} onResetFilters={resetFilters} onPageChange={(next) => setSelection((current) => ({ ...current, page: next }))} onRetry={() => setContentVersion((value) => value + 1)} /> : <LogIssues issues={issues} loading={issuesLoading} error={issuesError} onSelect={selectIssue} onRetry={() => setContentVersion((value) => value + 1)} />}
        </section>}
    </>;
}
