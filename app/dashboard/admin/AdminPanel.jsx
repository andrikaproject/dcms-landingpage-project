"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { BookOpenText, CaretRight, ChartLineUp, FileCode, Funnel, MagnifyingGlass, Pulse, X } from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api/client";
import { fetchAdminEbooks } from "@/lib/ebooks/api";
import { isAbortError } from "@/lib/signals/request";
import {
    describeEbooks,
    describeLogDay,
    filterMembers,
    formatJoined,
    formatUsdt,
    latestLogDay,
    memberStatus,
    normalizeMembers,
    pageOf,
    summarizeEbooks,
} from "@/lib/admin/panel";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]";
const SURFACE = "rounded-2xl bg-[#111417] shadow-[var(--shadow-card)]";
const BUTTON_SECONDARY = `inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1a1f24] px-3 font-chakra text-sm font-semibold tracking-[-0.01em] text-[#f8fafc] shadow-[var(--shadow-button)] hover:bg-[#1e252b] disabled:opacity-60 ${FOCUS_RING}`;
const STATUS_DOT = { ok: "bg-[#4ade80]", danger: "bg-[#f87171]", warn: "bg-[#fbbf24]", neutral: "bg-[#64748b]" };

// Status per alat dimuat terpisah: satu endpoint gagal tidak mengosongkan yang lain.
function useToolStatus(load) {
    const [state, setState] = useState({ status: "loading", value: null });

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal)
            .then((value) => {
                if (!controller.signal.aborted) setState({ status: "ready", value });
            })
            .catch((error) => {
                if (!isAbortError(error, controller.signal)) setState({ status: "error", value: null });
            });
        return () => controller.abort();
    }, [load]);

    return state;
}

const loadEbookStatus = async (signal) => {
    const summary = summarizeEbooks(await fetchAdminEbooks({ signal }));
    return { text: describeEbooks(summary), tone: "neutral" };
};

const loadLogStatus = async (signal) => {
    const data = await apiRequest("/admin/logs/days", { cache: "no-store", signal });
    const day = latestLogDay(data?.days);
    return { text: describeLogDay(day), tone: day?.errors ? "danger" : day?.warnings ? "warn" : "ok" };
};

function ToolStatus({ state }) {
    if (state.status === "loading") return <span className="text-[#64748b]">Memuat…</span>;
    if (state.status === "error") return <span className="text-[#94a3b8]">Status gagal dimuat</span>;
    return (
        <span className="inline-flex items-center gap-1.5 text-[#cbd5e1]">
            <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[state.value.tone]}`} aria-hidden />
            {state.value.text}
        </span>
    );
}

function ToolRow({ href, Icon, title, description, status }) {
    return (
        <li>
            <Link
                href={href}
                data-press="surface"
                className={`group flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-white/[0.025] sm:px-5 ${FOCUS_RING} focus-visible:-outline-offset-2`}
            >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1a1f24] text-[#cbd5e1] shadow-[var(--shadow-button)]">
                    <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block font-chakra text-sm font-semibold leading-5 text-[#f8fafc]">{title}</span>
                    <span className="block font-chakra text-[13px] leading-5 text-[#94a3b8]">{description}</span>
                    {status && <span className="mt-0.5 block font-chakra text-xs leading-4 sm:hidden"><ToolStatus state={status} /></span>}
                </span>
                {status && <span className="hidden shrink-0 font-chakra text-xs leading-4 sm:block"><ToolStatus state={status} /></span>}
                <CaretRight size={16} className="shrink-0 text-[#475569] group-hover:text-[#94a3b8]" aria-hidden />
            </Link>
        </li>
    );
}

function ToolList() {
    const ebooks = useToolStatus(loadEbookStatus);
    const logs = useToolStatus(loadLogStatus);

    return (
        <section aria-labelledby="admin-tools-title">
            <h2 id="admin-tools-title" className="font-chakra text-base font-semibold leading-6 text-[#f8fafc]">Alat admin</h2>
            <ul className={`mt-3 divide-y-[0.5px] divide-[#232a30] overflow-hidden ${SURFACE}`}>
                <ToolRow href="/dashboard/admin/ebooks" Icon={BookOpenText} title="CMS Ebook" description="Tulis, susun, dan terbitkan ebook beserta progres pembacanya." status={ebooks} />
                <ToolRow href="/dashboard/admin/monitoring" Icon={Pulse} title="Monitoring dan log" description="Error website dan aktivitas user per hari." status={logs} />
                <ToolRow href="/dashboard/admin/ml" Icon={ChartLineUp} title="ML dan pending signal" description="Metrik rencana signal, model, dan perbandingan shadow." />
                <ToolRow href="/dashboard/admin/adaptive-gate" Icon={Funnel} title="Adaptive gate" description="Kandidat signal yang lolos atau ditahan gate." />
                <ToolRow href="/dashboard/admin/api-docs" Icon={FileCode} title="Dokumentasi API" description="Kontrak endpoint yang disajikan backend." />
            </ul>
        </section>
    );
}

function MemberState({ title, detail, action }) {
    return (
        <div className={`flex min-h-[220px] flex-col items-center justify-center gap-1 px-6 py-10 text-center ${SURFACE}`}>
            <p className="font-chakra text-sm font-semibold text-[#cbd5e1]">{title}</p>
            {detail && <p className="max-w-sm font-chakra text-[13px] leading-5 text-[#94a3b8]">{detail}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

function StatusCell({ status }) {
    const { label, tone } = memberStatus(status);
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[tone]}`} aria-hidden />
            {label}
        </span>
    );
}

function MemberTable({ members }) {
    return (
        <div className={`overflow-hidden ${SURFACE}`}>
            <table className="hidden w-full table-fixed border-collapse text-left font-chakra text-[13px] leading-5 md:table">
                <caption className="sr-only">Daftar member Bitunix</caption>
                <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[26%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[12%]" />
                    <col className="w-[14%]" />
                </colgroup>
                <thead>
                    <tr className="h-10 text-xs font-medium text-[#94a3b8]">
                        <th scope="col" className="px-4 font-medium">Nama</th>
                        <th scope="col" className="px-4 font-medium">Email</th>
                        <th scope="col" className="px-4 font-medium">UUID Bitunix</th>
                        <th scope="col" className="px-4 font-medium">Status</th>
                        <th scope="col" className="px-4 font-medium">Deposit USDT</th>
                        <th scope="col" className="px-4 font-medium">Terdaftar</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map((member) => (
                        <tr key={member.id} className="h-12 border-t-[0.5px] border-[#232a30] text-[#cbd5e1] hover:bg-white/[0.02]">
                            <th scope="row" className="truncate px-4 font-semibold text-[#f8fafc]" title={member.name || undefined}>{member.name || "–"}</th>
                            <td className="truncate px-4" title={member.email}>{member.email || "–"}</td>
                            <td className="truncate px-4 font-mono text-xs">{member.uuidBitunix || "–"}</td>
                            <td className="px-4"><StatusCell status={member.status} /></td>
                            <td className="px-4 tabular-nums">{formatUsdt(member.depositUsdt)}</td>
                            <td className="px-4 tabular-nums">{formatJoined(member.createdAt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <ul className="divide-y-[0.5px] divide-[#232a30] font-chakra md:hidden">
                {members.map((member) => (
                    <li key={member.id} className="flex flex-col gap-1 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-[15px] font-semibold leading-6 text-[#f8fafc]">{member.name || "–"}</span>
                            <span className="shrink-0 text-sm text-[#cbd5e1]"><StatusCell status={member.status} /></span>
                        </div>
                        <span className="truncate text-sm text-[#cbd5e1]">{member.email || "–"}</span>
                        <span className="text-sm text-[#94a3b8]">
                            <span className="font-mono text-xs">{member.uuidBitunix || "–"}</span> · Deposit {formatUsdt(member.depositUsdt)} USDT · {formatJoined(member.createdAt)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function MemberSection() {
    const searchId = useId();
    const [state, setState] = useState({ status: "loading", members: [], error: "" });
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        apiRequest("/admin/bitunix-users", { cache: "no-store", signal: controller.signal })
            .then((data) => {
                if (!controller.signal.aborted) setState({ status: "ready", members: normalizeMembers(data), error: "" });
            })
            .catch((error) => {
                if (isAbortError(error, controller.signal)) return;
                setState({ status: "error", members: [], error: error instanceof Error ? error.message : "Daftar member gagal dimuat." });
            });
        return () => controller.abort();
    }, [attempt]);

    const retry = useCallback(() => {
        setState((current) => ({ ...current, status: "loading" }));
        setAttempt((value) => value + 1);
    }, []);

    const filtered = filterMembers(state.members, query);
    const view = pageOf(filtered, page);
    const ready = state.status === "ready";

    return (
        <section aria-labelledby="admin-members-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 id="admin-members-title" className="font-chakra text-base font-semibold leading-6 text-[#f8fafc]">
                        Member Bitunix
                        {ready && <span className="ml-2 font-normal tabular-nums text-[#64748b]">{state.members.length}</span>}
                    </h2>
                    <p className="font-chakra text-[13px] leading-5 text-[#94a3b8]">Akun yang masuk ke DCMS lewat Bitunix.</p>
                </div>
                {ready && state.members.length > 0 && (
                    <div className="relative w-full sm:w-72">
                        <label htmlFor={searchId} className="sr-only">Cari member</label>
                        <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" aria-hidden />
                        <input
                            id={searchId}
                            type="search"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Nama, email, atau UUID"
                            autoComplete="off"
                            spellCheck={false}
                            className={`h-11 w-full rounded-lg bg-[#14181c] pl-9 pr-3 font-chakra text-base text-[#f8fafc] shadow-[inset_0_0_0_0.5px_#232a30] placeholder:text-[#64748b] focus:bg-[#171c21] sm:h-9 sm:text-[13px] ${FOCUS_RING}`}
                        />
                    </div>
                )}
            </div>

            <div className="mt-3">
                {state.status === "loading" && <MemberState title="Memuat member…" />}
                {state.status === "error" && (
                    <MemberState
                        title="Daftar member gagal dimuat."
                        detail={state.error}
                        action={<button type="button" onClick={retry} className={BUTTON_SECONDARY}>Coba lagi</button>}
                    />
                )}
                {ready && state.members.length === 0 && (
                    <MemberState title="Belum ada member Bitunix." detail="Member muncul di sini setelah masuk ke DCMS dengan akun Bitunix." />
                )}
                {ready && state.members.length > 0 && filtered.length === 0 && (
                    <MemberState
                        title={`Tidak ada member yang cocok dengan "${query.trim()}".`}
                        action={
                            <button type="button" onClick={() => setQuery("")} className={BUTTON_SECONDARY}>
                                <X size={14} aria-hidden />
                                Hapus pencarian
                            </button>
                        }
                    />
                )}
                {ready && filtered.length > 0 && <MemberTable members={view.items} />}
            </div>

            {ready && view.pages > 1 && (
                <nav aria-label="Halaman member" className="mt-3 flex items-center justify-between gap-3 font-chakra text-[13px] text-[#94a3b8]">
                    <span className="tabular-nums" aria-live="polite">Halaman {view.page} dari {view.pages}</span>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPage(view.page - 1)} disabled={view.page <= 1} className={BUTTON_SECONDARY}>Sebelumnya</button>
                        <button type="button" onClick={() => setPage(view.page + 1)} disabled={view.page >= view.pages} className={BUTTON_SECONDARY}>Berikutnya</button>
                    </div>
                </nav>
            )}
        </section>
    );
}

export default function AdminPanel() {
    return (
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:pt-7">
            <header>
                <h1 className="font-chakra text-[22px] font-bold leading-7 text-[#f8fafc]">Panel admin</h1>
                <p className="mt-1 font-chakra text-sm leading-5 text-[#94a3b8]">Alat pengelolaan DCMS dan daftar member.</p>
            </header>
            <ToolList />
            <MemberSection />
        </div>
    );
}
