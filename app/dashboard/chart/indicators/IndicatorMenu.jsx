"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Code, DotsThree, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { BUILTIN_INDICATORS } from "@/lib/pine/builtin-indicators";
import { EDGE_MASK_Y_STYLE, useEdgeMask } from "../../overview/ScrollRail";

export function countInputs(source) {
    return (String(source || "").match(/\binput(?:\.\w+)?\s*\(/g) || []).length;
}

const MENU_WIDTH = 380;
const VIEWPORT_GAP = 16;
// Di bawah tinggi ini menu dibuka ke atas bila ruang di atas lebih lega.
const MIN_COMFORT_HEIGHT = 360;
const SAVED_ACTIONS_HEIGHT = 120;
// "Indikator saya" menggulir sendiri setelah 4 baris (baris ±53px), dan di layar
// pendek dibatasi 32% tinggi layar supaya bagian lain menu tetap terlihat.
const SAVED_LIST_MAX = "max-h-[min(214px,32dvh)]";
// Di HP kontrol baris tampil 36px dengan area sentuh 44px tak terlihat.
const HIT = "relative max-md:after:absolute max-md:after:-inset-1";

// Menutup saat klik di luar atau Escape. Klik pada pemicu diabaikan supaya
// tombol pemicu yang men-toggle tidak membuka ulang menu yang baru ditutup.
function useDismiss(ref, open, onClose, ignoreRef) {
    useEffect(() => {
        if (!open) return undefined;
        const pointer = (event) => {
            if (ref.current?.contains(event.target) || ignoreRef?.current?.contains(event.target)) return;
            onClose();
        };
        const key = (event) => {
            if (event.key !== "Escape") return;
            // Submenu yang terbuka di dalamnya menutup lebih dulu; Escape berikutnya menutup ini.
            if (ref.current?.querySelector('[role="menu"]') && !ref.current.matches('[data-submenu-owner]')) return;
            onClose();
        };
        document.addEventListener("pointerdown", pointer);
        document.addEventListener("keydown", key);
        return () => {
            document.removeEventListener("pointerdown", pointer);
            document.removeEventListener("keydown", key);
        };
    }, [ref, open, onClose, ignoreRef]);
}

// Posisi fixed dari pemicu: lolos dari kartu chart yang overflow-hidden dan
// tingginya dibatasi ruang layar yang tersisa, dihitung ulang saat scroll/resize.
function useAnchoredPosition(anchorRef) {
    const [position, setPosition] = useState(null);
    useLayoutEffect(() => {
        let frame = 0;
        const measure = () => {
            const anchor = anchorRef.current?.getBoundingClientRect();
            if (!anchor) return;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const width = Math.min(MENU_WIDTH, viewportWidth - VIEWPORT_GAP * 2);
            const left = Math.min(Math.max(VIEWPORT_GAP, anchor.left), viewportWidth - width - VIEWPORT_GAP);
            const below = viewportHeight - anchor.bottom - 8 - VIEWPORT_GAP;
            const above = anchor.top - 8 - VIEWPORT_GAP;
            const openAbove = below < MIN_COMFORT_HEIGHT && above > below;
            setPosition(openAbove
                ? { left, width, bottom: viewportHeight - anchor.top + 8, maxHeight: above, above: true }
                : { left, width, top: anchor.bottom + 8, maxHeight: below, above: false });
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        measure();
        window.addEventListener("resize", schedule);
        window.addEventListener("scroll", schedule, true);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", schedule);
            window.removeEventListener("scroll", schedule, true);
        };
    }, [anchorRef]);
    return position;
}

function SavedActions({ saved, onDuplicate, onCopySource, onDelete }) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const ref = useRef(null);
    useDismiss(ref, open, () => setOpen(false));
    const item = "block w-full rounded px-3 py-1.5 text-left font-chakra text-xs text-[#f8fafc] hover:bg-white/[0.06]";
    return (
        <div ref={ref} data-submenu-owner className="relative">
            <button
                type="button"
                onClick={(event) => {
                    // Daftar digulir di dalam menu; baris bawah membuka aksinya ke atas.
                    const area = event.currentTarget.closest("[data-scroll-area]")?.getBoundingClientRect();
                    const trigger = event.currentTarget.getBoundingClientRect();
                    setDropUp(Boolean(area) && area.bottom - trigger.bottom < SAVED_ACTIONS_HEIGHT && trigger.top - area.top > area.bottom - trigger.bottom);
                    setOpen((value) => !value);
                }}
                aria-label={`Menu ${saved.name}`}
                aria-haspopup="menu"
                aria-expanded={open}
                className={`${HIT} grid size-9 place-items-center rounded text-[#94a3b8] hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c] md:size-7`}
            >
                <DotsThree size={16} weight="bold" aria-hidden />
            </button>
            {open && (
                <div role="menu" className={`tactile-pop absolute right-0 z-50 w-40 rounded-lg bg-[#1a1f24] p-1 shadow-[var(--shadow-menu)] ${dropUp ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"}`}>
                    <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onDuplicate(saved); }}>Duplikat</button>
                    <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onCopySource(saved); }}>Salin kode</button>
                    <div className="my-1 h-px bg-[#232a30]" />
                    <button type="button" role="menuitem" className={`${item} text-[#f87171]`} onClick={() => { setOpen(false); onDelete(saved); }}>Hapus</button>
                </div>
            )}
        </div>
    );
}

const SECTION_LABEL = "sticky top-0 z-10 bg-[#161a1e] px-2.5 pb-1 pt-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#94a3b8]";
const ROW = "flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-white/[0.03]";
const ADD_BUTTON = "relative max-md:after:absolute max-md:after:-inset-1 shrink-0 rounded-md px-2 py-1 max-md:h-9 font-chakra text-xs text-[#cbd5e1] hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]";
const ACTIVE_BUTTON = "relative max-md:after:absolute max-md:after:-inset-x-1 max-md:after:-inset-y-3 shrink-0 rounded-full bg-[#b8fb5c]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#b8fb5c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]";

export default function IndicatorMenu({
    anchorRef, onClose, toggles, activeKeys, saved, syncMode,
    onToggleEma, onAddBuiltin, onRemoveActive, onAddSaved, onEditSaved, onDuplicateSaved, onCopySource, onDeleteSaved, onCreate,
}) {
    const ref = useRef(null);
    const bodyRef = useRef(null);
    const savedListRef = useRef(null);
    const [query, setQuery] = useState("");
    const position = useAnchoredPosition(anchorRef);
    useDismiss(ref, true, onClose, anchorRef);
    useEdgeMask(bodyRef);
    useEdgeMask(savedListRef);
    const needle = query.trim().toLowerCase();
    const matches = (text) => !needle || text.toLowerCase().includes(needle);
    const emaCount = (toggles.ema21 ? 1 : 0) + (toggles.ema50 ? 1 : 0);
    const syncLabel = syncMode === "local" ? "tersimpan di browser ini" : "tersinkron ke akun";
    const builtins = BUILTIN_INDICATORS.filter((indicator) => matches(`${indicator.name} ${indicator.description}`));
    const savedMatches = saved.filter((item) => matches(item.name));

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="Indikator"
            className={`tactile-pop fixed z-50 flex flex-col overflow-hidden rounded-xl bg-[#161a1e] shadow-[var(--shadow-menu)] ${position?.above ? "origin-bottom-left" : "origin-top-left"}`}
            style={position
                ? { left: position.left, width: position.width, maxHeight: position.maxHeight, ...(position.above ? { bottom: position.bottom } : { top: position.top }) }
                : { visibility: "hidden" }}
        >
            <div className="shrink-0 p-3 pb-1">
                <label className="flex h-9 items-center gap-2 rounded-lg bg-[#0b0d0f] px-3 shadow-[inset_0_0_0_0.5px_#334155] focus-within:shadow-[inset_0_0_0_1px_#b8fb5c]">
                    <MagnifyingGlass size={14} className="text-[#94a3b8]" aria-hidden />
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari indikator"
                        aria-label="Cari indikator"
                        className="min-w-0 flex-1 bg-transparent font-chakra text-sm text-[#f8fafc] placeholder:text-[#94a3b8] focus:outline-none"
                    />
                </label>
            </div>

            {/* Satu area gulir untuk kedua daftar; judul section menempel di atas. */}
            <div ref={bodyRef} data-scroll-area style={EDGE_MASK_Y_STYLE} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-2">
                <section aria-label="Indikator bawaan">
                    <p className={SECTION_LABEL}>Bawaan</p>
                    {builtins.length === 0 ? (
                        <p className="px-2.5 pb-2 font-chakra text-xs text-[#94a3b8]">Tidak ada indikator bawaan yang cocok.</p>
                    ) : (
                        <ul>
                            {builtins.map((indicator) => {
                                const isEma = indicator.id === "ema";
                                const activeUid = activeKeys[`builtin:${indicator.id}`];
                                return (
                                    <li key={indicator.id} className={ROW}>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-chakra text-sm font-semibold text-[#f8fafc]">{indicator.name}</p>
                                            <p className="truncate font-chakra text-[11px] text-[#94a3b8]">{indicator.description}</p>
                                        </div>
                                        {isEma ? (
                                            <button type="button" onClick={onToggleEma} className={emaCount ? ACTIVE_BUTTON : "shrink-0 rounded-full bg-[#334155] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#cbd5e1]"}>
                                                {emaCount ? `${emaCount} aktif` : "nonaktif"}
                                            </button>
                                        ) : activeUid ? (
                                            <button type="button" onClick={() => onRemoveActive(activeUid)} className={ACTIVE_BUTTON} title="Klik untuk melepas dari chart">aktif</button>
                                        ) : (
                                            <button type="button" onClick={() => onAddBuiltin(indicator.id)} className={ADD_BUTTON}>+ Tambah</button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section aria-label="Indikator saya" className="mt-1">
                    <p className={SECTION_LABEL}>Indikator saya{saved.length > 0 ? ` · ${saved.length}` : ""}</p>
                    <div ref={savedListRef} data-scroll-area style={EDGE_MASK_Y_STYLE} className={`${SAVED_LIST_MAX} overflow-y-auto overscroll-contain`}>
                        {syncMode === "loading" ? (
                            <p className="px-2.5 pb-2 font-chakra text-xs text-[#94a3b8]">Memuat indikator tersimpan…</p>
                        ) : saved.length === 0 ? (
                            <p className="px-2.5 pb-2 font-chakra text-xs text-[#94a3b8]">Belum ada. Buat sendiri dengan script editor di bawah.</p>
                        ) : savedMatches.length === 0 ? (
                            <p className="px-2.5 pb-2 font-chakra text-xs text-[#94a3b8]">Tidak ada indikator tersimpan yang cocok.</p>
                        ) : (
                            <ul>
                                {savedMatches.map((item) => {
                                    const activeUid = activeKeys[`saved:${item.id}`];
                                    return (
                                        <li key={item.id} className={ROW}>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-chakra text-sm font-semibold text-[#f8fafc]" title={item.name}>{item.name}</p>
                                                <p className="truncate font-chakra text-[11px] text-[#94a3b8]">Buatanmu · {syncLabel} · {countInputs(item.source)} input</p>
                                            </div>
                                            {activeUid ? (
                                                <button type="button" onClick={() => onRemoveActive(activeUid)} className={ACTIVE_BUTTON} title="Klik untuk melepas dari chart">aktif</button>
                                            ) : (
                                                <button type="button" onClick={() => onAddSaved(item)} className={ADD_BUTTON}>+ Tambah</button>
                                            )}
                                            <button type="button" onClick={() => onEditSaved(item)} aria-label={`Edit ${item.name}`} className={`${HIT} grid size-9 shrink-0 place-items-center rounded text-[#94a3b8] hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c] md:size-7`}>
                                                <PencilSimple size={14} aria-hidden />
                                            </button>
                                            <SavedActions saved={item} onDuplicate={onDuplicateSaved} onCopySource={onCopySource} onDelete={onDeleteSaved} />
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </section>
            </div>

            <div className="shrink-0 border-t border-[#232a30] p-3">
                <button type="button" onClick={onCreate} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#b8fb5c]/50 bg-[#b8fb5c]/10 font-chakra text-sm font-semibold text-[#b8fb5c] hover:bg-[#b8fb5c]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]">
                    <Code size={16} aria-hidden /> Buat indikator dengan script
                </button>
            </div>
        </div>
    );
}
