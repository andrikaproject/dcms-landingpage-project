"use client";

import { useEffect, useId, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import AdminEbookFrame, { InlineError, SECONDARY_BUTTON, TEXT_INPUT } from "./AdminEbookFrame";
import UserProgressDetail, { ACCOUNT_TYPE_LABELS } from "./UserProgressDetail";
import { progressCountLabel } from "@/components/ebooks/ProgressSummary";
import { fetchAdminEbook, fetchProgressReport } from "@/lib/ebooks/api";
import { PROGRESS_STATUS_LABELS, describeEbookError } from "@/lib/ebooks/payload";
import { formatUserTime } from "@/lib/signals/format";
import { isAbortError } from "@/lib/signals/request";

const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;

function statusLabel(progress) {
    return PROGRESS_STATUS_LABELS[progress?.status] || "Tidak diketahui";
}

function percentLabel(progress) {
    return progress?.percent === null || progress?.percent === undefined ? "Tidak tersedia" : `${progress.percent}%`;
}

function lastLessonLabel(row) {
    if (!row.lastLesson) return "Belum ada";
    return row.lastLesson.title || `Subbab ${row.lastLesson.id}`;
}

function DetailButton({ row, onSelect }) {
    return (
        <button type="button" onClick={() => onSelect(row)} className={`${SECONDARY_BUTTON} whitespace-nowrap`}>
            Lihat detail<span className="sr-only"> progres {row.name || row.email}</span>
        </button>
    );
}

function UserCell({ row }) {
    return (
        <div className="min-w-0">
            <p className="break-words font-semibold text-white">{row.name || "Tanpa nama"}</p>
            <p className="break-all text-xs text-zinc-400">{row.email || "Email tidak tersedia"}</p>
            <p className="text-xs text-zinc-400">{ACCOUNT_TYPE_LABELS[row.accountType] || row.accountType}</p>
        </div>
    );
}

export default function ProgressReport({ ebookId }) {
    const searchId = useId();
    const [ebook, setEbook] = useState(null);
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        fetchAdminEbook(ebookId, { signal: controller.signal }).then(setEbook).catch(() => {});
        return () => controller.abort();
    }, [ebookId]);

    // Kata pencarian dikirim setelah jeda ketik; halaman kembali ke 1 bersamaan.
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed === search) return undefined;
        const timer = setTimeout(() => {
            setLoading(true);
            setSearch(trimmed);
            setPage(1);
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [query, search]);

    // Pencarian dan pagination diproses BE. Request lama dibatalkan saat parameter berubah.
    useEffect(() => {
        const controller = new AbortController();
        fetchProgressReport(ebookId, { q: search, page, limit: PAGE_SIZE, signal: controller.signal })
            .then((result) => {
                setReport(result);
                setError("");
                setLoading(false);
            })
            .catch((loadError) => {
                if (isAbortError(loadError, controller.signal)) return;
                setError(describeEbookError(loadError, "Laporan progres gagal dimuat."));
                setLoading(false);
            });
        return () => controller.abort();
    }, [ebookId, search, page, reloadKey]);

    function goTo(nextPage) {
        setLoading(true);
        setPage(nextPage);
    }

    const items = report?.items ?? [];
    const pageLabel = report?.totalPages ? `Halaman ${report.page} dari ${report.totalPages}` : `Halaman ${page}`;

    return (
        <AdminEbookFrame
            title={ebook ? `Progres pembaca: ${ebook.title || "Tanpa judul"}` : "Progres pembaca"}
            description="Semua pengguna aktif ditampilkan, termasuk yang belum mulai. Persentase dihitung server dari subbab terbit yang ditandai selesai, bukan ukuran lama membaca atau pemahaman."
            backHref={`/dashboard/admin/ebooks/${encodeURIComponent(ebookId)}`}
            backLabel="Kembali ke ebook"
            width="max-w-6xl"
        >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full max-w-md">
                    <label htmlFor={searchId} className="text-sm font-semibold text-zinc-200">Cari nama atau email</label>
                    <div className="relative mt-1.5">
                        <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden />
                        <input
                            id={searchId}
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Contoh: rina atau rina@contoh.id"
                            className={`${TEXT_INPUT} border-white/15 pl-9`}
                        />
                    </div>
                </div>
                <p role="status" aria-live="polite" className="text-sm text-zinc-400">
                    {loading ? "Memuat laporan…" : report?.total !== null && report?.total !== undefined ? `${report.total} pengguna${search ? ` cocok dengan "${search}"` : ""}` : ""}
                </p>
            </div>

            {error && <div className="mb-4"><InlineError message={error} onRetry={() => { setError(""); setLoading(true); setReloadKey((key) => key + 1); }} /></div>}

            {!report && loading && !error && <p className="py-16 text-center text-zinc-400">Memuat laporan…</p>}

            {report && items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-300">
                    {search ? `Tidak ada pengguna yang cocok dengan "${search}".` : "Belum ada pengguna aktif."}
                </div>
            )}

            {report && items.length > 0 && (
                <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
                    <div className="hidden overflow-hidden rounded-2xl shadow-[0_0_0_0.5px_rgb(255_255_255/0.1),var(--shadow-table)] lg:block">
                        <table className="w-full table-fixed border-collapse text-left text-sm">
                            <caption className="sr-only">Progres membaca per pengguna</caption>
                            <thead className="bg-white/[0.03] text-xs text-zinc-400">
                                <tr>
                                    <th scope="col" className="w-[26%] px-4 py-3 font-semibold">Pengguna</th>
                                    <th scope="col" className="w-[14%] px-4 py-3 font-semibold">Subbab selesai</th>
                                    <th scope="col" className="w-[8%] px-4 py-3 font-semibold">Persen</th>
                                    <th scope="col" className="w-[12%] px-4 py-3 font-semibold">Status</th>
                                    <th scope="col" className="w-[16%] px-4 py-3 font-semibold">Terakhir dibuka</th>
                                    <th scope="col" className="w-[12%] px-4 py-3 font-semibold">Aktivitas terakhir</th>
                                    <th scope="col" className="w-[12%] px-4 py-3 font-semibold"><span className="sr-only">Aksi</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.06]">
                                {items.map((row) => (
                                    <tr key={row.key} className="align-top">
                                        <td className="px-4 py-3"><UserCell row={row} /></td>
                                        <td className="px-4 py-3 text-zinc-200">{row.progress ? `${row.progress.completedLessons}/${row.progress.totalLessons}` : "Tidak tersedia"}</td>
                                        <td className="px-4 py-3 font-bold tabular-nums text-white">{percentLabel(row.progress)}</td>
                                        <td className="px-4 py-3 text-zinc-200">{statusLabel(row.progress)}</td>
                                        <td className="break-words px-4 py-3 text-zinc-200">{lastLessonLabel(row)}</td>
                                        <td className="px-4 py-3 text-zinc-300">{formatUserTime(row.lastActivityAt, { placeholder: "Belum ada" })}</td>
                                        <td className="px-4 py-3 text-right"><DetailButton row={row} onSelect={setSelected} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <ul className="space-y-3 lg:hidden">
                        {items.map((row) => (
                            <li key={row.key} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                                <UserCell row={row} />
                                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div><dt className="text-xs text-zinc-400">Subbab selesai</dt><dd className="text-zinc-100">{progressCountLabel(row.progress)}</dd></div>
                                    <div><dt className="text-xs text-zinc-400">Persen</dt><dd className="font-bold text-white">{percentLabel(row.progress)}</dd></div>
                                    <div><dt className="text-xs text-zinc-400">Status</dt><dd className="text-zinc-100">{statusLabel(row.progress)}</dd></div>
                                    <div><dt className="text-xs text-zinc-400">Aktivitas terakhir</dt><dd className="text-zinc-100">{formatUserTime(row.lastActivityAt, { placeholder: "Belum ada" })}</dd></div>
                                    <div className="col-span-2"><dt className="text-xs text-zinc-400">Terakhir dibuka</dt><dd className="break-words text-zinc-100">{lastLessonLabel(row)}</dd></div>
                                </dl>
                                <div className="mt-3"><DetailButton row={row} onSelect={setSelected} /></div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {report && (report.page > 1 || report.hasMore) && (
                <nav aria-label="Halaman laporan" className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1 || loading} className={SECONDARY_BUTTON}>Sebelumnya</button>
                    <span className="text-sm text-zinc-300">{pageLabel}</span>
                    <button type="button" onClick={() => goTo(page + 1)} disabled={!report.hasMore || loading} className={SECONDARY_BUTTON}>Berikutnya</button>
                </nav>
            )}

            {selected && <UserProgressDetail key={selected.key} ebookId={ebookId} row={selected} onClose={() => setSelected(null)} />}
        </AdminEbookFrame>
    );
}
