"use client";

import { useEffect, useRef, useState } from "react";
import { DotsThree, Eye, EyeSlash, GearSix, Trash } from "@phosphor-icons/react";
import { formatPrice } from "../../overview/ui";

function inputSummary(indicator) {
    const inputs = indicator.output?.inputs || [];
    return inputs
        .filter((input) => input.kind === "int" || input.kind === "float")
        .slice(0, 4)
        .map((input) => indicator.inputs?.[input.key] ?? input.defval)
        .join(" ");
}

function plotValues(indicator, index) {
    const plots = indicator.output?.plots || [];
    return plots
        .filter((plot) => indicator.style?.plots?.[plot.id]?.visible !== false && plot.values.some((value) => value !== null))
        .slice(0, 4)
        .map((plot) => {
            const at = index === null || index === undefined ? plot.values.length - 1 : index - (plot.offset || 0);
            const value = plot.values[at];
            return { id: plot.id, value, color: indicator.style?.plots?.[plot.id]?.color || plot.colors[at] || plot.color };
        });
}

function IconButton({ label, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="pointer-events-auto grid size-5 place-items-center rounded text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]"
        >
            {children}
        </button>
    );
}

function PaneMenu({ indicator, onAction }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => {
            if (!ref.current?.contains(event.target)) setOpen(false);
        };
        const escape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", close);
        document.addEventListener("keydown", escape);
        return () => {
            document.removeEventListener("pointerdown", close);
            document.removeEventListener("keydown", escape);
        };
    }, [open]);

    const item = "block w-full rounded px-3 py-1.5 text-left font-chakra text-xs text-[#f8fafc] hover:bg-white/[0.06]";
    const run = (action) => {
        setOpen(false);
        onAction(indicator.uid, action);
    };
    return (
        <div ref={ref} className="pointer-events-auto relative">
            <IconButton label={`Menu panel ${indicator.title}`} onClick={() => setOpen((value) => !value)}>
                <DotsThree size={14} weight="bold" aria-hidden />
            </IconButton>
            {open && (
                <div role="menu" className="tactile-pop absolute left-0 origin-top-left top-full z-40 mt-1 w-44 rounded-lg bg-[#161a1e] p-1 shadow-[var(--shadow-menu)]">
                    <button type="button" role="menuitem" className={item} onClick={() => run("settings")}>Pengaturan</button>
                    <button type="button" role="menuitem" className={item} onClick={() => run("move-up")}>Pindah ke atas</button>
                    <button type="button" role="menuitem" className={item} onClick={() => run("maximize")}>{indicator.pane?.maximized ? "Kembalikan ukuran" : "Maksimalkan panel"}</button>
                    <button type="button" role="menuitem" className={item} onClick={() => run("collapse")}>{indicator.pane?.collapsed ? "Bentangkan panel" : "Ciutkan panel"}</button>
                    <div className="my-1 h-px bg-[#232a30]" />
                    <button type="button" role="menuitem" className={`${item} text-[#f87171]`} onClick={() => run("remove")}>Hapus dari chart</button>
                </div>
            )}
        </div>
    );
}

export default function IndicatorLegend({ indicator, index, isPane, isNew, onAction }) {
    const values = plotValues(indicator, index);
    const status = indicator.status === "running" && !indicator.output
        ? "menghitung…"
        : indicator.status === "error" ? "error · buka editor untuk detail" : "";

    return (
        <div className={`pointer-events-none flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-0.5 font-mono text-[11px] leading-[16px] ${indicator.visible ? "border-[#334155] bg-[#0b0d0f]/70" : "border-[#232a30] bg-[#0b0d0f]/50 opacity-60"}`}>
            <span className="font-chakra font-semibold text-[#f8fafc]">{indicator.title}</span>
            {inputSummary(indicator) && <span className="text-[#94a3b8]">{inputSummary(indicator)}</span>}
            {status && <span className={indicator.status === "error" ? "text-[#f87171]" : "text-[#b8fb5c]"}>{status}</span>}
            {indicator.visible && values.map((entry) => (
                <span key={entry.id} style={{ color: entry.color || "#cbd5e1" }}>
                    {entry.value === null || entry.value === undefined ? "–" : formatPrice(entry.value)}
                </span>
            ))}
            {isNew && <span className="rounded bg-[#b8fb5c]/15 px-1.5 font-mono text-[9px] font-semibold tracking-[0.08em] text-[#b8fb5c]">PANEL BARU</span>}
            <span className="flex items-center gap-0.5">
                <IconButton label={indicator.visible ? `Sembunyikan ${indicator.title}` : `Tampilkan ${indicator.title}`} onClick={() => onAction(indicator.uid, "toggle-visible")}>
                    {indicator.visible ? <Eye size={13} aria-hidden /> : <EyeSlash size={13} aria-hidden />}
                </IconButton>
                <IconButton label={`Pengaturan ${indicator.title}`} onClick={() => onAction(indicator.uid, "settings")}>
                    <GearSix size={13} aria-hidden />
                </IconButton>
                {isPane ? (
                    <PaneMenu indicator={indicator} onAction={onAction} />
                ) : (
                    <IconButton label={`Hapus ${indicator.title} dari chart`} onClick={() => onAction(indicator.uid, "remove")}>
                        <Trash size={13} aria-hidden />
                    </IconButton>
                )}
            </span>
        </div>
    );
}
