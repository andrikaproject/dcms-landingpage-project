"use client";

import { useEffect, useRef } from "react";
import { EyeSlash, Plus } from "@phosphor-icons/react";
import { Panel } from "../../overview/ui";

function Switch({ checked, onChange, label, disabled }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-40 ${checked ? "bg-[#2563eb]" : "bg-[#334155]"}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-[left] ${checked ? "left-[18px]" : "left-0.5"}`} />
        </button>
    );
}

const PARTS = [
    { key: "biasCard", title: "Kartu bias & keyakinan", detail: "Gauge LONG / NETRAL / SHORT di panel kanan" },
    { key: "levels", title: "Garis entry, SL, TP", detail: "Zona entry dan level dari rencana trade" },
    { key: "structure", title: "Anotasi struktur", detail: "Penanda seperti higher low" },
];

// B1: pengaturan lapisan analisis DCMS di chart.
export function DcmsLayerMenu({ layer, onChange, onClose }) {
    const ref = useRef(null);
    useEffect(() => {
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
    }, [onClose]);

    return (
        <div ref={ref} role="dialog" aria-label="Analisis DCMS di chart" className="tactile-pop absolute right-0 origin-top-right top-full z-40 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl bg-[#161a1e] p-4 shadow-[var(--shadow-menu)]">
            <p className="font-chakra text-sm font-bold text-[#f8fafc]">Analisis DCMS di chart</p>
            <p className="mt-0.5 font-chakra text-xs text-[#94a3b8]">Sembunyikan kalau mau membaca chart hanya dengan indikatormu.</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#161a1e] px-3 py-2.5">
                <span className="font-chakra text-sm font-semibold text-[#f8fafc]">Tampilkan analisis DCMS</span>
                <Switch checked={layer.visible} onChange={(visible) => onChange({ visible })} label="Tampilkan analisis DCMS" />
            </div>
            <ul className="mt-2 flex flex-col">
                {PARTS.map((part) => (
                    <li key={part.key} className="flex items-center justify-between gap-3 border-b border-[#232a30] py-2.5 last:border-b-0">
                        <div>
                            <p className={`font-chakra text-sm ${layer.visible ? "text-[#f8fafc]" : "text-[#64748b]"}`}>{part.title}</p>
                            <p className="font-chakra text-[11px] text-[#64748b]">{part.detail}</p>
                        </div>
                        <Switch checked={layer.visible && layer[part.key]} disabled={!layer.visible} onChange={(value) => onChange({ [part.key]: value })} label={part.title} />
                    </li>
                ))}
            </ul>
            <p className="mt-3 rounded-lg border border-[#334155] px-3 py-2 font-chakra text-[11px] text-[#94a3b8]">
                Indikator buatanmu tetap tampil. Bias DCMS dihitung terpisah dan tidak dipengaruhi indikatormu.
            </p>
            <label className="mt-3 flex items-center gap-2 font-chakra text-xs text-[#cbd5e1]">
                <input type="checkbox" checked={layer.remember} onChange={(event) => onChange({ remember: event.target.checked })} className="size-4 accent-[#b8fb5c]" />
                Ingat pilihan ini di semua koin (tersinkron ke akun)
            </label>
        </div>
    );
}

// B2: kartu pengganti panel kanan saat analisis DCMS disembunyikan.
export function DcmsHiddenCards({ onShow, activeIndicators, toggles, onToggleIndicator, onToggleVolume, onOpenMenu }) {
    return (
        <>
            <Panel className="px-5 py-5">
                <EyeSlash size={20} className="text-[#94a3b8]" aria-hidden />
                <p className="mt-2 font-chakra text-sm font-bold text-[#f8fafc]">Analisis DCMS disembunyikan</p>
                <p className="mt-1 font-chakra text-xs text-[#94a3b8]">Chart hanya menampilkan indikator pilihanmu. Bias DCMS tetap dihitung dan tampil di Dashboard.</p>
                <button type="button" onClick={onShow} className="mt-3 h-9 rounded-lg border border-[#334155] px-3 font-chakra text-sm text-[#f8fafc] hover:border-[#475569]">Tampilkan lagi</button>
            </Panel>
            <Panel className="px-5 pb-2 pt-5">
                <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b]">Indikator aktif</p>
                    <button type="button" onClick={onOpenMenu} className="flex items-center gap-1 font-chakra text-xs font-semibold text-[#a3e635] hover:underline"><Plus size={12} aria-hidden /> Indikator</button>
                </div>
                <ul className="mt-2">
                    {activeIndicators.map((indicator) => (
                        <li key={indicator.uid} className="flex items-center justify-between gap-3 border-b border-[#232a30] py-2.5 last:border-b-0">
                            <div className="min-w-0">
                                <p className="truncate font-chakra text-sm text-[#f8fafc]">{indicator.title}</p>
                                <p className="font-chakra text-[11px] text-[#64748b]">{indicator.kind === "builtin" ? "Bawaan" : "Buatanmu"} · {indicator.overlay ? "di chart utama" : "panel bawah"}</p>
                            </div>
                            <Switch checked={indicator.visible} onChange={() => onToggleIndicator(indicator.uid)} label={`Tampilkan ${indicator.title}`} />
                        </li>
                    ))}
                    <li className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                            <p className="font-chakra text-sm text-[#f8fafc]">Volume</p>
                            <p className="font-chakra text-[11px] text-[#64748b]">Bawaan · di chart utama</p>
                        </div>
                        <Switch checked={toggles.volume} onChange={onToggleVolume} label="Tampilkan volume" />
                    </li>
                </ul>
            </Panel>
            <p className="px-1 font-chakra text-[11px] text-[#64748b]">Lock sinyal tersedia lagi saat analisis DCMS ditampilkan.</p>
        </>
    );
}
