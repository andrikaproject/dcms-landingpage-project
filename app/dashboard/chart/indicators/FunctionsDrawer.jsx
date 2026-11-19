"use client";

import { useId, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { MAX_BARS } from "@/lib/pine/index";
import { CATEGORY_ORDER, catalogEntries } from "@/lib/pine/registry";
import { useDialog } from "../../overview/useDialog";

const NOT_SUPPORTED = [
    { name: "request.security (timeframe lain)", note: "memakai data timeframe chart" },
    { name: "request.security_lower_tf", note: "memakai bar chart sendiri" },
    { name: "alertcondition", note: "diterima, notifikasi belum aktif" },
    { name: "table.*", note: "belum didukung" },
    { name: "strategy.*", note: "belum didukung" },
    { name: "matrix.*", note: "belum didukung" },
    { name: "import library", note: "belum didukung" },
];

export default function FunctionsDrawer({ onClose }) {
    const titleId = useId();
    const panelRef = useRef(null);
    const [query, setQuery] = useState("");
    useDialog(panelRef, onClose);

    const groups = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const entries = catalogEntries().filter((entry) => entry.kind !== "konstanta" && entry.kind !== "kata kunci" && entry.kind !== "warna");
        const keywords = ["if", "? :", "var", "varip", "for … to … by", "for … in", "while", "switch", "type", "method", "na"].map((name) => ({ name, doc: "Sintaks", category: CATEGORY_ORDER[4] }));
        return CATEGORY_ORDER.map((category) => {
            const items = [...entries, ...keywords]
                .filter((entry) => entry.category === category)
                .filter((entry) => !needle || entry.name.toLowerCase().includes(needle) || entry.doc.toLowerCase().includes(needle));
            return { category, items };
        }).filter((group) => group.items.length);
    }, [query]);

    return (
        <div className="tactile-backdrop fixed inset-0 z-50 flex justify-end bg-black/50" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex h-full w-full max-w-[440px] tactile-sheet flex-col bg-[#161a1e] shadow-[var(--shadow-modal)] focus:outline-none">
                <div className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div>
                        <h2 id={titleId} className="flex items-center gap-2 font-chakra text-lg font-bold text-[#f8fafc]">
                            Fungsi yang didukung
                            <span className="rounded-full bg-[#b8fb5c]/15 px-2 py-0.5 font-mono text-[10px] text-[#b8fb5c]">VERSI 1</span>
                        </h2>
                        <p className="mt-1 font-chakra text-xs text-[#94a3b8]">Sintaks kompatibel Pine v5/v6. Fungsi di luar daftar ini memunculkan error saat dikompilasi.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-8 place-items-center rounded-md text-[#94a3b8] hover:bg-white/[0.06] hover:text-white"><X size={16} aria-hidden /></button>
                </div>
                <label className="mx-5 mt-4 flex h-9 items-center gap-2 rounded-lg border border-[#334155] bg-[#0b0d0f] px-3">
                    <MagnifyingGlass size={14} className="text-[#64748b]" aria-hidden />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari fungsi, contoh: ta.rsi" aria-label="Cari fungsi" className="min-w-0 flex-1 bg-transparent font-chakra text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none" />
                </label>
                <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                    {groups.map((group) => (
                        <section key={group.category} className="mb-5">
                            <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#64748b]">
                                {group.category}
                                <span className="rounded bg-[#1e293b] px-1.5 text-[#94a3b8]">{group.items.length}</span>
                            </p>
                            <ul className="flex flex-wrap gap-1.5">
                                {group.items.map((item) => (
                                    <li key={item.name} title={item.doc} className="rounded-md border border-[#232a30] bg-[#161a1e] px-2 py-1 font-mono text-[11px] text-[#cbd5e1]">
                                        {item.name}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                    <section className="rounded-xl border border-dashed border-[#fbbf24]/40 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#fbbf24]">Belum didukung penuh · rencana versi 2</p>
                        <ul className="mt-2 flex flex-col gap-1">
                            {NOT_SUPPORTED.map((item) => (
                                <li key={item.name} className="flex justify-between gap-3 font-mono text-[11px]">
                                    <span className="text-[#cbd5e1]">{item.name}</span>
                                    <span className="text-[#64748b]">{item.note}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2 font-chakra text-[11px] text-[#64748b]">Fungsi input.* otomatis jadi field di modal Pengaturan indikator.</p>
                    </section>
                    <p className="mt-3 font-mono text-[11px] text-[#64748b]">Batas eksekusi: {MAX_BARS.toLocaleString("id-ID")} bar · 10 detik per script</p>
                </div>
            </aside>
        </div>
    );
}
