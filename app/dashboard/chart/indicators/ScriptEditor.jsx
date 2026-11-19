"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Code, X } from "@phosphor-icons/react";
import { compileScript } from "@/lib/pine/index";
import { catalogEntries, FUNCTIONS, signatureOf } from "@/lib/pine/registry";
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

    // Cek sintaks otomatis setelah user berhenti mengetik.
    const tabId = tab?.id;
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
            <header className="flex flex-wrap items-center gap-2 border-b border-[#232a30] px-4 py-2.5">
                <span className="flex items-center gap-1.5 font-chakra text-sm font-semibold text-[#f8fafc]">
                    <Code size={16} className="text-[#b8fb5c]" aria-hidden /> Script Editor
                </span>
                <span className="mx-1 h-5 w-px bg-[#232a30]" aria-hidden />
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Script terbuka">
                    {tabs.map((item) => {
                        const active = item.id === tab.id;
                        return (
                            <span key={item.id} className={`flex shrink-0 items-center rounded-md border ${active ? "border-[#334155] bg-[#161a1e]" : "border-transparent"}`}>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => onSelectTab(item.id)}
                                    className={`flex h-7 items-center gap-2 px-2.5 font-mono text-xs ${active ? "text-[#f8fafc]" : "text-[#94a3b8] hover:text-white"}`}
                                >
                                    {item.title || "Indikator tanpa judul"}
                                    <span className={`size-1.5 rounded-full ${item.dirty ? "bg-[#fbbf24]" : "bg-[#4ade80]"}`} title={item.dirty ? "Belum disimpan" : "Tersimpan"} aria-label={item.dirty ? "belum disimpan" : "tersimpan"} />
                                </button>
                                {tabs.length > 1 && (
                                    <button type="button" onClick={() => onCloseTab(item.id)} aria-label={`Tutup ${item.title || "script"}`} className="mr-1 grid size-5 place-items-center rounded text-[#64748b] hover:text-white">
                                        <X size={10} aria-hidden />
                                    </button>
                                )}
                            </span>
                        );
                    })}
                    <button type="button" onClick={onNewTab} className="shrink-0 px-2 font-chakra text-xs text-[#94a3b8] hover:text-white">+ Baru</button>
                </div>
                <span className="hidden rounded-full border border-[#334155] px-2.5 py-0.5 font-mono text-[10px] text-[#94a3b8] lg:inline" title="Sintaks mengikuti Pine Script v5/v6 untuk fungsi di daftar yang didukung">
                    Sintaks Pine v5 (sebagian)
                </span>
                <button type="button" onClick={() => onSave(tab)} disabled={saving} className="h-8 rounded-lg border border-[#334155] px-3 font-chakra text-sm font-medium text-[#f8fafc] hover:border-[#475569] disabled:opacity-50">
                    {saving ? "Menyimpan…" : "Simpan"}
                </button>
                <button type="button" onClick={handleAdd} className="h-8 rounded-lg bg-[#b8fb5c] px-3 font-chakra text-sm font-semibold text-black hover:bg-[#a8ec4c]">
                    {tab.chartUid ? "Perbarui di chart" : "Tambah ke chart"}
                </button>
                <button type="button" onClick={onClose} aria-label="Tutup editor" className="grid size-8 place-items-center rounded-md text-[#94a3b8] hover:bg-white/[0.06] hover:text-white">
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
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b]">Referensi fungsi</p>
                    <ul className="mt-2 flex flex-col gap-1">
                        {FEATURED.map((name) => (
                            <li key={name} className={`rounded-md px-2 py-1.5 ${highlighted === name ? "bg-[#b8fb5c]/[0.08] ring-1 ring-[#b8fb5c]/30" : ""}`}>
                                <p className="font-mono text-xs text-[#e2e8f0]">
                                    <span className="text-[#60a5fa]">{name}</span>({FUNCTIONS[name].params.slice(0, 2).join(", ")})
                                </p>
                                <p className="font-chakra text-[11px] text-[#64748b]">{FEATURED_DOCS[name] || signatureOf(name)}</p>
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
