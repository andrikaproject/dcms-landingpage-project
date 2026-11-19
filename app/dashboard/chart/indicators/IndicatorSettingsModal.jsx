"use client";

import { useId, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { useDialog } from "../../overview/useDialog";

const SOURCES = ["open", "high", "low", "close", "hl2", "hlc3", "ohlc4", "hlcc4", "volume"];
const TABS = [
    { id: "input", label: "Input" },
    { id: "style", label: "Gaya" },
    { id: "visibility", label: "Visibilitas" },
];
const DRAWING_TOGGLES = [
    { key: "lines", label: "Garis dan polyline", count: (output) => output.drawings.lines.length + output.drawings.polylines.length },
    { key: "labels", label: "Label", count: (output) => output.drawings.labels.length },
    { key: "boxes", label: "Kotak", count: (output) => output.drawings.boxes.length },
    { key: "shapes", label: "Bentuk (plotshape/plotchar)", count: (output) => output.shapes.length },
    { key: "fills", label: "Isian area (fill)", count: (output) => output.fills.length },
    { key: "bgcolor", label: "Warna latar (bgcolor)", count: (output) => output.bgcolors.length },
];

function variableName(source, line) {
    const text = String(source || "").split("\n")[line - 1] || "";
    return /^\s*(?:var\s+)?(?:[\w.<>]+\s+)?([A-Za-z_]\w*)\s*(?::)?=/.exec(text)?.[1] || "";
}

function cssToHex(css) {
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(String(css || ""));
    if (!match) return /^#[0-9a-f]{6}/i.test(css || "") ? css.slice(0, 7) : "#2196f3";
    return `#${match.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function Switch({ checked, onChange, label }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#2563eb]" : "bg-[#334155]"}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-[left] ${checked ? "left-[18px]" : "left-0.5"}`} />
        </button>
    );
}

function InputField({ input, value, onChange, id }) {
    const base = "h-9 rounded-lg border border-[#334155] bg-[#0b0d0f] px-2.5 font-mono text-sm text-[#f8fafc] focus:border-[#b8fb5c] focus:outline-none";
    if (input.kind === "bool") return <Switch checked={Boolean(value)} onChange={onChange} label={input.title || "Input"} />;
    if (input.kind === "source") {
        return (
            <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${base} w-28`}>
                {SOURCES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
        );
    }
    if (input.kind === "color") {
        return <input id={id} type="color" value={cssToHex(value)} onChange={(event) => onChange(event.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-[#334155] bg-[#0b0d0f] p-1" />;
    }
    if (input.options?.length) {
        return (
            <select id={id} value={value} onChange={(event) => onChange(input.kind === "string" ? event.target.value : Number(event.target.value))} className={`${base} w-40`}>
                {input.options.map((option) => <option key={String(option)} value={option}>{String(option)}</option>)}
            </select>
        );
    }
    if (input.kind === "string") {
        return <input id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={`${base} w-40`} />;
    }
    return (
        <input
            id={id}
            type="number"
            value={value ?? ""}
            min={input.minval ?? undefined}
            max={input.maxval ?? undefined}
            step={input.step ?? (input.kind === "int" ? 1 : "any")}
            onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
            className={`${base} w-28`}
        />
    );
}

export default function IndicatorSettingsModal({ indicator, source, onApply, onClose }) {
    const titleId = useId();
    const panelRef = useRef(null);
    useDialog(panelRef, onClose);
    const output = indicator.output;
    const [tab, setTab] = useState("input");
    const [values, setValues] = useState(() => ({ ...indicator.inputs }));
    const [style, setStyle] = useState(() => ({ plots: { ...(indicator.style?.plots || {}) }, show: { ...(indicator.style?.show || {}) } }));
    const inputs = useMemo(() => output?.inputs || [], [output]);
    const groups = useMemo(() => {
        const map = new Map();
        for (const input of inputs) {
            const key = input.group || "";
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(input);
        }
        return [...map.entries()];
    }, [inputs]);
    const plotColor = (plot) => style.plots[plot.id]?.color || plot.color || "#2196f3";

    function setPlot(plotId, patch) {
        setStyle((current) => ({ ...current, plots: { ...current.plots, [plotId]: { ...current.plots[plotId], ...patch } } }));
    }

    function apply() {
        // Field angka yang dikosongkan kembali ke nilai default script.
        const cleaned = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value !== undefined));
        onApply({ inputs: cleaned, style });
    }

    return (
        <div className="tactile-backdrop fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="tactile-dialog flex max-h-[calc(100dvh-2rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-[#161a1e] shadow-[var(--shadow-modal)] focus:outline-none">
                <div className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div>
                        <h2 id={titleId} className="font-chakra text-lg font-bold text-[#f8fafc]">{indicator.title}</h2>
                        <p className="font-chakra text-xs text-[#94a3b8]">{indicator.kind === "builtin" ? "Pengaturan indikator bawaan" : "Pengaturan indikator buatanmu"}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-8 place-items-center rounded-md text-[#94a3b8] hover:bg-white/[0.06] hover:text-white"><X size={16} aria-hidden /></button>
                </div>
                <div role="tablist" className="mt-3 flex gap-5 border-b border-[#232a30] px-5">
                    {TABS.map((item) => (
                        <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
                            className={`-mb-px border-b-2 pb-2 font-chakra text-sm ${tab === item.id ? "border-[#b8fb5c] text-[#f8fafc]" : "border-transparent text-[#64748b] hover:text-[#cbd5e1]"}`}>
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                    {tab === "input" && (
                        inputs.length === 0 ? (
                            <p className="font-chakra text-sm text-[#94a3b8]">Script ini tidak punya input.*() yang bisa diatur.</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {groups.map(([group, items]) => (
                                    <div key={group || "default"}>
                                        {group && <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#64748b]">{group}</p>}
                                        <ul className="flex flex-col gap-3">
                                            {items.map((input) => {
                                                const fieldId = `${titleId}-${input.key}`;
                                                const name = variableName(source, input.line);
                                                const plot = output.plots.find((entry) => entry.title === input.title);
                                                return (
                                                    <li key={input.key} className="flex items-center justify-between gap-4">
                                                        <label htmlFor={fieldId} className="min-w-0">
                                                            <span className="flex items-center gap-2 font-chakra text-sm text-[#f8fafc]">
                                                                {plot && <span className="h-0.5 w-3 rounded" style={{ background: plot.color }} aria-hidden />}
                                                                {input.title || name || input.key}
                                                            </span>
                                                            <span className="font-mono text-[11px] text-[#64748b]">{name ? `${name} · ` : ""}input.{input.kind}</span>
                                                        </label>
                                                        <InputField id={fieldId} input={input} value={values[input.key] ?? input.defval} onChange={(next) => setValues((current) => ({ ...current, [input.key]: next }))} />
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                                <p className="rounded-lg bg-[#161a1e] px-3 py-2.5 font-chakra text-xs text-[#94a3b8]">Field ini dibuat otomatis dari input.*() di script.</p>
                            </div>
                        )
                    )}

                    {tab === "style" && (
                        <ul className="flex flex-col gap-3">
                            {output.plots.length === 0 && <li className="font-chakra text-sm text-[#94a3b8]">Script ini tidak punya plot().</li>}
                            {output.plots.map((plot) => (
                                <li key={plot.id} className="flex items-center justify-between gap-3">
                                    <span className="font-chakra text-sm text-[#f8fafc]">{plot.title}</span>
                                    <span className="flex items-center gap-2">
                                        <input type="color" aria-label={`Warna ${plot.title}`} value={cssToHex(plotColor(plot))} onChange={(event) => setPlot(plot.id, { color: event.target.value })} className="h-8 w-12 cursor-pointer rounded border border-[#334155] bg-[#0b0d0f] p-1" />
                                        <select aria-label={`Tebal ${plot.title}`} value={style.plots[plot.id]?.linewidth ?? plot.linewidth ?? 1} onChange={(event) => setPlot(plot.id, { linewidth: Number(event.target.value) })} className="h-8 rounded border border-[#334155] bg-[#0b0d0f] px-2 font-mono text-xs text-[#f8fafc]">
                                            {[1, 2, 3, 4].map((width) => <option key={width} value={width}>{width}px</option>)}
                                        </select>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {tab === "visibility" && (
                        <ul className="flex flex-col gap-3">
                            {output.plots.map((plot) => (
                                <li key={plot.id} className="flex items-center justify-between gap-3">
                                    <span className="font-chakra text-sm text-[#f8fafc]">Plot · {plot.title}</span>
                                    <Switch checked={style.plots[plot.id]?.visible !== false} onChange={(checked) => setPlot(plot.id, { visible: checked })} label={`Tampilkan ${plot.title}`} />
                                </li>
                            ))}
                            {DRAWING_TOGGLES.filter((toggle) => toggle.count(output) > 0).map((toggle) => (
                                <li key={toggle.key} className="flex items-center justify-between gap-3">
                                    <span className="font-chakra text-sm text-[#f8fafc]">{toggle.label} <span className="font-mono text-[11px] text-[#64748b]">({toggle.count(output)})</span></span>
                                    <Switch checked={style.show[toggle.key] !== false} onChange={(checked) => setStyle((current) => ({ ...current, show: { ...current.show, [toggle.key]: checked } }))} label={toggle.label} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#232a30] px-5 py-4">
                    <button type="button" onClick={() => { setValues({}); setStyle({ plots: {}, show: {} }); }} className="font-chakra text-sm font-semibold text-[#cbd5e1] hover:text-white">Kembalikan default</button>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[#334155] px-3 font-chakra text-sm text-[#f8fafc] hover:border-[#475569]">Batal</button>
                        <button type="button" onClick={apply} className="h-9 rounded-lg bg-[#b8fb5c] px-3 font-chakra text-sm font-semibold text-black hover:bg-[#a8ec4c]">Terapkan</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
