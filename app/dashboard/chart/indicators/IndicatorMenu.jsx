"use client";

import { useEffect, useRef, useState } from "react";
import { Code, DotsThree, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { BUILTIN_INDICATORS } from "@/lib/pine/builtin-indicators";

export function countInputs(source) {
    return (String(source || "").match(/\binput(?:\.\w+)?\s*\(/g) || []).length;
}

function useDismiss(ref, open, onClose) {
    useEffect(() => {
        if (!open) return undefined;
        const pointer = (event) => {
            if (!ref.current?.contains(event.target)) onClose();
        };
        const key = (event) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("pointerdown", pointer);
        document.addEventListener("keydown", key);
        return () => {
            document.removeEventListener("pointerdown", pointer);
            document.removeEventListener("keydown", key);
        };
    }, [ref, open, onClose]);
}

function SavedActions({ saved, onDuplicate, onCopySource, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useDismiss(ref, open, () => setOpen(false));
    const item = "block w-full rounded px-3 py-1.5 text-left font-chakra text-xs text-[#f8fafc] hover:bg-white/[0.06]";
    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Menu ${saved.name}`} className="grid size-7 place-items-center rounded text-[#94a3b8] hover:bg-white/[0.06] hover:text-white">
                <DotsThree size={16} weight="bold" aria-hidden />
            </button>
            {open && (
                <div role="menu" className="tactile-pop absolute right-0 origin-top-right top-full z-50 mt-1 w-40 rounded-lg bg-[#161a1e] p-1 shadow-[var(--shadow-menu)]">
                    <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onDuplicate(saved); }}>Duplikat</button>
                    <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onCopySource(saved); }}>Salin kode</button>
                    <div className="my-1 h-px bg-[#232a30]" />
                    <button type="button" role="menuitem" className={`${item} text-[#f87171]`} onClick={() => { setOpen(false); onDelete(saved); }}>Hapus</button>
                </div>
            )}
        </div>
    );
}

export default function IndicatorMenu({
    onClose, toggles, activeKeys, saved, syncMode,
    onToggleEma, onAddBuiltin, onRemoveActive, onAddSaved, onEditSaved, onDuplicateSaved, onCopySource, onDeleteSaved, onCreate,
}) {
    const ref = useRef(null);
    const [query, setQuery] = useState("");
    useDismiss(ref, true, onClose);
    const needle = query.trim().toLowerCase();
    const matches = (text) => !needle || text.toLowerCase().includes(needle);
    const emaCount = (toggles.ema21 ? 1 : 0) + (toggles.ema50 ? 1 : 0);
    const syncLabel = syncMode === "local" ? "tersimpan di browser ini" : "tersinkron ke akun";

    return (
        <div ref={ref} role="dialog" aria-label="Indikator" className="tactile-pop absolute left-0 origin-top-left top-full z-40 mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl bg-[#161a1e] shadow-[var(--shadow-menu)]">
            <div className="p-3">
                <label className="flex h-9 items-center gap-2 rounded-lg border border-[#334155] bg-[#0b0d0f] px-3">
                    <MagnifyingGlass size={14} className="text-[#64748b]" aria-hidden />
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari indikator"
                        aria-label="Cari indikator"
                        className="min-w-0 flex-1 bg-transparent font-chakra text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none"
                    />
                </label>
            </div>

            <p className="px-4 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b]">Bawaan</p>
            <ul className="max-h-[260px] overflow-auto px-1.5">
                {BUILTIN_INDICATORS.filter((indicator) => matches(`${indicator.name} ${indicator.description}`)).map((indicator) => {
                    const isEma = indicator.id === "ema";
                    const activeUid = activeKeys[`builtin:${indicator.id}`];
                    return (
                        <li key={indicator.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-white/[0.03]">
                            <div className="min-w-0 flex-1">
                                <p className="font-chakra text-sm font-semibold text-[#f8fafc]">{indicator.name}</p>
                                <p className="truncate font-chakra text-[11px] text-[#64748b]">{indicator.description}</p>
                            </div>
                            {isEma ? (
                                <button type="button" onClick={onToggleEma} className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${emaCount ? "bg-[#b8fb5c]/15 text-[#b8fb5c]" : "bg-[#334155] text-[#94a3b8]"}`}>
                                    {emaCount ? `${emaCount} aktif` : "nonaktif"}
                                </button>
                            ) : activeUid ? (
                                <button type="button" onClick={() => onRemoveActive(activeUid)} className="rounded-full bg-[#b8fb5c]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#b8fb5c]" title="Klik untuk melepas dari chart">aktif</button>
                            ) : (
                                <button type="button" onClick={() => onAddBuiltin(indicator.id)} className="font-chakra text-xs text-[#cbd5e1] hover:text-white">+ Tambah</button>
                            )}
                        </li>
                    );
                })}
            </ul>

            <div className="mt-1 border-t border-[#232a30] px-1.5 pt-2">
                <p className="px-2.5 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b]">Indikator saya</p>
                {syncMode === "loading" ? (
                    <p className="px-2.5 pb-2 font-chakra text-xs text-[#64748b]">Memuat…</p>
                ) : saved.length === 0 ? (
                    <p className="px-2.5 pb-2 font-chakra text-xs text-[#64748b]">Belum ada. Buat sendiri dengan script editor.</p>
                ) : (
                    <ul className="max-h-[200px] overflow-auto">
                        {saved.filter((item) => matches(item.name)).map((item) => {
                            const activeUid = activeKeys[`saved:${item.id}`];
                            return (
                                <li key={item.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-white/[0.03]">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-chakra text-sm font-semibold text-[#f8fafc]">{item.name}</p>
                                        <p className="truncate font-chakra text-[11px] text-[#64748b]">Buatanmu · {syncLabel} · {countInputs(item.source)} input</p>
                                    </div>
                                    {activeUid ? (
                                        <button type="button" onClick={() => onRemoveActive(activeUid)} className="rounded-full bg-[#b8fb5c]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#b8fb5c]" title="Klik untuk melepas dari chart">aktif</button>
                                    ) : (
                                        <button type="button" onClick={() => onAddSaved(item)} className="font-chakra text-xs text-[#cbd5e1] hover:text-white">+ Tambah</button>
                                    )}
                                    <button type="button" onClick={() => onEditSaved(item)} aria-label={`Edit ${item.name}`} className="grid size-7 place-items-center rounded text-[#94a3b8] hover:bg-white/[0.06] hover:text-white">
                                        <PencilSimple size={14} aria-hidden />
                                    </button>
                                    <SavedActions saved={item} onDuplicate={onDuplicateSaved} onCopySource={onCopySource} onDelete={onDeleteSaved} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="border-t border-[#232a30] p-3">
                <button type="button" onClick={onCreate} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#b8fb5c]/50 bg-[#b8fb5c]/10 font-chakra text-sm font-semibold text-[#b8fb5c] hover:bg-[#b8fb5c]/15">
                    <Code size={16} aria-hidden /> Buat indikator dengan script
                </button>
                <p className="mt-2 font-chakra text-[11px] text-[#64748b]">Sintaks kompatibel Pine v5 (sebagian)</p>
            </div>
        </div>
    );
}
