"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Code, X } from "@phosphor-icons/react";
import { compileScript } from "@/lib/pine/index";
import { catalogEntries, FUNCTIONS, signatureOf } from "@/lib/pine/registry";
import { EDGE_MASK_STYLE, scrollBehavior, useEdgeMask } from "../../overview/ScrollRail";
import CodeEditor from "./CodeEditor";

const FEATURED = ["ta.ema", "ta.sma", "ta.rsi", "ta.crossover", "input.int", "plot"];
const FEATURED_DOCS = {
    "ta.ema": "Rata-rata eksponensial",
    "ta.sma": "Rata-rata sederhana",
    "ta.rsi": "Relative Strength Index",
    "ta.crossover": "true saat a memotong ke atas b",
    "input.int": "Angka yang bisa diatur user",
    plot: "Gambar garis di chart",
};
const CHECK_DELAY_MS = 400;
// Area sentuh 44px tak terlihat di HP untuk kontrol yang tampil 36px.
const HIT = "relative max-md:after:absolute max-md:after:-inset-1";

function shortMessage(error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("tidak dikenal")) return lower.includes("fungsi") ? "fungsi tidak dikenal" : "nama tidak dikenal";
    return error.message.replace(/\.$/, "");
}

function Console({ tab, compileErrors, attempted, run, cursor }) {
    const [expanded, setExpanded] = useState(false);
    const output = run?.result?.ok ? run.result.output : null;
    const runErrors = run?.result && !run.result.ok ? run.result.errors : [];
    let tone = "text-[#94a3b8]";
    let dot = "bg-[#64748b]";
    let message = "Belum dijalankan · tekan Tambah ke chart untuk mencoba";

    if (compileErrors.length) {
        const first = compileErrors[0];
        tone = "text-[#f87171]";
        dot = "bg-[#f87171]";
        message = `${compileErrors.length} error · Baris ${first.line}: ${shortMessage(first)}.${attempted ? " Indikator belum ditambahkan ke chart." : ""}`;
    } else if (tab.chartUid && run?.status === "running") {
        tone = "text-[#b8fb5c]";
        dot = "bg-[#b8fb5c] motion-safe:animate-pulse";
        message = "Menjalankan script…";
    } else if (tab.chartUid && runErrors.length) {
        const first = runErrors[0];
        tone = "text-[#f87171]";
        dot = "bg-[#f87171]";
        message = `${first.kind === "timeout" ? "Batas waktu" : "Error runtime"}${first.line ? ` · Baris ${first.line}` : ""}: ${first.message}`;
    } else if (tab.chartUid && output) {
        tone = "text-[#4ade80]";
        dot = "bg-[#4ade80]";
        const placement = output.meta.overlay ? "tampil di chart" : "tampil di panel baru di bawah chart (overlay=false)";
        message = `Berhasil · ${output.meta.title} ${placement} · ${output.stats.bars} bar · ${output.stats.ms} ms · 0 error${output.warnings.length ? ` · ${output.warnings.length} peringatan` : ""}`;
    } else if (!compileErrors.length && tab.checked) {
        tone = "text-[#94a3b8]";
        dot = "bg-[#4ade80]";
        message = "Sintaks OK · tekan Tambah ke chart untuk mencoba";
    }

    const extra = output ? [...output.warnings.map((text) => ({ level: "warning", message: text })), ...output.logs] : [];

    return (
        <div className="border-t border-[#232a30] bg-[#111417]">
            {expanded && extra.length > 0 && (
                <ul className="max-h-[140px] overflow-auto border-b border-[#232a30] px-4 py-2 font-mono text-[11px]">
                    {extra.map((entry, index) => (
                        <li key={index} className={entry.level === "warning" ? "text-[#fbbf24]" : entry.level === "error" ? "text-[#f87171]" : "text-[#94a3b8]"}>
                            {entry.bar !== undefined ? `[bar ${entry.bar}] ` : ""}{entry.message}
                        </li>
                    ))}
                    {output?.droppedLogs > 0 && <li className="text-[#64748b]">{output.droppedLogs} log lain disembunyikan.</li>}
                </ul>
            )}
            <div className="flex items-center gap-3 px-4 py-2 font-mono text-[11px]" role="status">
                <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
                <span className={`min-w-0 flex-1 truncate ${tone}`} title={message}>{message}</span>
                {extra.length > 0 && (
                    <button type="button" onClick={() => setExpanded((value) => !value)} className="shrink-0 text-[#a3e635] hover:underline">
                        {expanded ? "Tutup log" : `Log (${extra.length})`}
                    </button>
                )}
                <span className="shrink-0 text-[#64748b]">Baris {cursor.line}, Kolom {cursor.column}</span>
            </div>
        </div>
    );
}

export default function ScriptEditor({
    tabs,
    activeTabId,
    runs,
    saving,
    onSelectTab,
    onNewTab,
    onCloseTab,
    onChangeSource,
    onMarkChecked,
    onSave,
    onAddToChart,
    onClose,
    onOpenReference,
}) {
    const tab = tabs.find((item) => item.id === activeTabId) || tabs[0];
    const [compileErrors, setCompileErrors] = useState([]);
    const [attempted, setAttempted] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [cursor, setCursor] = useState({ line: 1, column: 1, word: "" });
    const catalog = useMemo(() => catalogEntries(), []);
    const run = tab?.chartUid ? runs[tab.chartUid] : null;
    const tabStripRef = useRef(null);
    useEdgeMask(tabStripRef, { axis: "x" });

    // Cek sintaks otomatis setelah user berhenti mengetik.
    const tabId = tab?.id;

    // Tab aktif (termasuk tab baru di ujung) digeser masuk penuh, melewati tepi pudar.
    useEffect(() => {
        const strip = tabStripRef.current;
        const chip = tabId ? strip?.querySelector(`[data-tab-id="${CSS.escape(String(tabId))}"]`) : null;
        if (!strip || !chip) return;
        const view = strip.getBoundingClientRect();
        const box = chip.getBoundingClientRect();
        const edge = 32;
        const delta = box.left < view.left + edge ? box.left - view.left - edge : box.right > view.right - edge ? box.right - view.right + edge : 0;
        if (delta) strip.scrollBy({ left: delta, behavior: scrollBehavior() });
    }, [tabId, tabs.length]);
    const tabSource = tab?.source;
    useEffect(() => {
        if (tabId === undefined) return undefined;
        const timer = window.setTimeout(() => {
            const result = compileScript(tabSource);
            setCompileErrors(result.ok ? [] : result.errors);
            onMarkChecked(tabId, result.meta?.title || null);
        }, CHECK_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [tabId, tabSource, onMarkChecked]);

    const handleCursor = useCallback((next) => setCursor(next), []);

    if (!tab) return null;

    function handleAdd() {
        const result = compileScript(tab.source);
        setAttempted(true);
        if (!result.ok) {
            setCompileErrors(result.errors);
            setShowTooltip(true);
            return;
        }
        setCompileErrors([]);
        setShowTooltip(false);
        onAddToChart(tab, result.meta);
    }

    function applyFix(error) {
        const lines = tab.source.split("\n");
        const line = lines[error.line - 1] ?? "";
        const start = error.column - 1;
        lines[error.line - 1] = line.slice(0, start) + error.fix.replacement + line.slice(start + error.length);
        onChangeSource(tab.id, lines.join("\n"));
        setShowTooltip(false);
    }

    const focusWord = cursor.word || "";
    const highlighted = FEATURED.find((name) => focusWord && (name === focusWord || (focusWord.length >= 4 && name.startsWith(focusWord))));

    return (
        <section aria-label="Script Editor" className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-[#232a30] bg-[#111417]">
            {/* HP (<768px): baris 1 judul + aksi + tutup, baris 2 tab + Baru + referensi.
                Kontrol tampil ringkas 36px; HIT memberi area sentuh 44px tak terlihat.
                md ke atas: satu baris. Urutan HP diatur dengan order. */}
            <header className="flex flex-wrap items-center gap-x-2 gap-y-2.5 border-b border-[#232a30] px-4 py-3 md:flex-nowrap md:py-2.5">
                <span className="order-1 flex min-w-0 flex-1 items-center gap-1.5 font-chakra text-[15px] font-semibold text-[#f8fafc] md:order-none md:flex-none md:text-sm">
                    <Code size={16} className="shrink-0 text-[#b8fb5c]" aria-hidden />
                    <span className="truncate max-[399px]:sr-only">Script Editor</span>
                </span>
                <span className="mx-1 hidden h-5 w-px bg-[#232a30] md:block" aria-hidden />
                <div className="order-4 flex w-full min-w-0 items-center gap-1.5 md:order-none md:w-auto md:flex-1">
                    <div ref={tabStripRef} style={EDGE_MASK_STYLE} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain max-md:-my-1 max-md:py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Script terbuka">
                        {tabs.map((item) => {
                            const active = item.id === tab.id;
                            return (
                                <span key={item.id} data-tab-id={item.id} className={`flex shrink-0 items-center rounded-md border ${active ? "border-[#334155] bg-[#161a1e]" : "border-transparent"}`}>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => onSelectTab(item.id)}
                                        className={`${HIT} flex h-9 items-center gap-2 px-2.5 font-mono text-[13px] md:h-7 md:text-xs ${active ? "text-[#f8fafc]" : "text-[#94a3b8] hover:text-white"}`}
                                    >
                                        <span className="max-w-[140px] truncate md:max-w-[160px]" title={item.title || "Indikator tanpa judul"}>{item.title || "Indikator tanpa judul"}</span>
                                        <span className={`size-1.5 shrink-0 rounded-full ${item.dirty ? "bg-[#fbbf24]" : "bg-[#4ade80]"}`} title={item.dirty ? "Belum disimpan" : "Tersimpan"} aria-label={item.dirty ? "belum disimpan" : "tersimpan"} />
                                    </button>
                                    {tabs.length > 1 && (
                                        <button type="button" onClick={() => onCloseTab(item.id)} aria-label={`Tutup ${item.title || "script"}`} className="relative mr-1 grid size-7 place-items-center rounded text-[#94a3b8] hover:text-white max-md:after:absolute max-md:after:-inset-2 md:size-5">
                                            <X size={11} aria-hidden />
                                        </button>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                    <button type="button" onClick={onNewTab} className={`${HIT} h-9 shrink-0 rounded-md px-2.5 font-chakra text-sm text-[#cbd5e1] hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c] md:h-7 md:px-2 md:text-xs`}>+ Baru</button>
                    {/* Panel referensi disembunyikan di HP; tombol ini membuka daftar lengkapnya. */}
                    <button type="button" onClick={onOpenReference} aria-label="Referensi fungsi" title="Referensi fungsi" className={`${HIT} grid size-9 shrink-0 place-items-center rounded-md text-[#94a3b8] hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c] md:hidden`}>
                        <BookOpen size={17} aria-hidden />
                    </button>
                </div>
                <span className="hidden rounded-full border border-[#334155] px-2.5 py-0.5 font-mono text-[10px] text-[#94a3b8] lg:inline" title="Sintaks mengikuti Pine Script v5/v6 untuk fungsi di daftar yang didukung">
                    Sintaks Pine v5 (sebagian)
                </span>
                <div className="order-2 flex shrink-0 items-center gap-2 md:order-none">
                    <button type="button" onClick={() => onSave(tab)} disabled={saving} className={`${HIT} h-9 rounded-lg bg-[#1a1f24] px-3 font-chakra text-sm font-medium text-[#f8fafc] shadow-[var(--shadow-button)] hover:bg-[#1e252b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:opacity-60 md:h-8`}>
                        {saving ? "Menyimpan…" : "Simpan"}
                    </button>
                    <button type="button" onClick={handleAdd} className={`${HIT} h-9 whitespace-nowrap rounded-lg bg-[#b8fb5c] px-3 font-chakra text-sm font-semibold text-black shadow-[var(--shadow-primary)] hover:bg-[#a8ec4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] md:h-8`}>
                        {tab.chartUid ? "Perbarui di chart" : "Tambah ke chart"}
                    </button>
                </div>
                <button type="button" onClick={onClose} aria-label="Tutup editor" className={`${HIT} order-3 grid size-9 shrink-0 place-items-center rounded-md text-[#94a3b8] hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c] md:order-none md:size-8`}>
                    <X size={16} aria-hidden />
                </button>
            </header>

            <div className="flex min-h-0 flex-1">
                <div className="h-[300px] min-w-0 flex-1 lg:h-[340px]">
                    <CodeEditor
                        value={tab.source}
                        onChange={(next) => {
                            onChangeSource(tab.id, next);
                            setShowTooltip(false);
                        }}
                        errors={compileErrors}
                        showErrorTooltip={showTooltip}
                        onApplyFix={applyFix}
                        onDismissError={() => setShowTooltip(false)}
                        onCursor={handleCursor}
                        catalog={catalog}
                    />
                </div>
                <aside className="hidden w-[270px] shrink-0 overflow-auto border-l border-[#232a30] px-4 py-3 md:block" aria-label="Referensi fungsi">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#94a3b8]">Referensi fungsi</p>
                    <ul className="mt-2 flex flex-col gap-1">
                        {FEATURED.map((name) => (
                            <li key={name} className={`rounded-md px-2 py-1.5 ${highlighted === name ? "bg-[#b8fb5c]/[0.08] ring-1 ring-[#b8fb5c]/30" : ""}`}>
                                <p className="font-mono text-xs text-[#e2e8f0]">
                                    <span className="text-[#60a5fa]">{name}</span>({FUNCTIONS[name].params.slice(0, 2).join(", ")})
                                </p>
                                <p className="font-chakra text-[11px] text-[#94a3b8]">{FEATURED_DOCS[name] || signatureOf(name)}</p>
                            </li>
                        ))}
                    </ul>
                    <button type="button" onClick={onOpenReference} className="mt-2 font-chakra text-xs font-semibold text-[#a3e635] hover:underline">
                        Lihat semua fungsi yang didukung
                    </button>
                </aside>
            </div>

            <Console tab={tab} compileErrors={compileErrors} attempted={attempted} run={run} cursor={cursor} />
        </section>
    );
}
