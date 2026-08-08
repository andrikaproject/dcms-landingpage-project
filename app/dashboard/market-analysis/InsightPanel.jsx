"use client";

import { formatAbsPercent, formatAlertState, formatPrice, formatRangeState, formatSignedPercent, LEVEL_HELP, LEVEL_LABEL } from "./format";
import { ChartLineUp, Info } from "@phosphor-icons/react";
import { useState } from "react";

const LEVEL_ORDER = ["do", "pdh", "pdl", "pdm", "wo", "pwh", "pwl", "pwm"];

function LevelName({ level }) {
    const help = LEVEL_HELP[level];
    const [open, setOpen] = useState(false);
    if (!help) return LEVEL_LABEL[level];

    return (
        <span className="inline-flex items-center gap-2">
            <span>{LEVEL_LABEL[level]}</span>
            <span className={`market-tooltip-trigger relative inline-flex${open ? " is-open" : ""}`}>
                <button
                    type="button"
                    aria-label={`Penjelasan ${LEVEL_LABEL[level]}`}
                    aria-describedby={`${level}-help`}
                    aria-expanded={open}
                    onClick={() => setOpen((current) => !current)}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setOpen(false);
                            event.currentTarget.blur();
                        }
                    }}
                    className="market-info-button"
                >
                    <Info size={14} weight="bold" aria-hidden="true" />
                </button>
                <span id={`${level}-help`} role="tooltip" className="market-tooltip">
                    <strong>{help.name}</strong>
                    <span>{help.description}</span>
                </span>
            </span>
        </span>
    );
}

function statusSentence(payload) {
    const { symbol, nearestLevel, distances, alertState } = payload;
    if (nearestLevel && Number.isFinite(distances?.[nearestLevel])) {
        const d = distances[nearestLevel];
        const arah = d >= 0 ? "di atas" : "di bawah";
        return `Harga ${symbol} berada ${formatAbsPercent(d)} ${arah} ${LEVEL_LABEL[nearestLevel]}. Area ini layak dipantau sebagai level konteks.`;
    }
    return `Harga ${symbol}: ${formatAlertState(alertState).toLowerCase()}.`;
}

function rangeSentence(rangeState) {
    if (rangeState && typeof rangeState === "object") {
        const { abovePwm, abovePdm } = rangeState;
        if (abovePwm === true && abovePdm === true) return "Harga berada di atas PWM dan PDM, menandakan posisi di atas kedua titik tengah acuan.";
        if (abovePwm === false && abovePdm === false) return "Harga berada di bawah PWM dan PDM, menandakan posisi di bawah kedua titik tengah acuan.";
        if (typeof abovePwm === "boolean" || typeof abovePdm === "boolean") return "Harga berada di sisi yang berbeda terhadap PWM dan PDM; gunakan level map untuk melihat konteks lengkapnya.";
    }
    if (rangeState === "Di dalam range mingguan") {
        return "Harga masih berada di antara PWH dan PWL. Belum ada kondisi di atas PWH atau di bawah PWL.";
    }
    if (rangeState === "Di atas range mingguan") {
        return "Harga menembus di atas PWH. Kondisi berada di luar range mingguan sebelumnya.";
    }
    if (rangeState === "Di bawah range mingguan") {
        return "Harga menembus di bawah PWL. Kondisi berada di luar range mingguan sebelumnya.";
    }
    return "";
}

export function InsightPanelSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-xl bg-white/5" />
            <div className="h-20 animate-pulse rounded-xl bg-white/5" />
            <div className="h-40 animate-pulse rounded-xl bg-white/5" />
        </div>
    );
}

export default function InsightPanel({ payload, loading }) {
    if (loading) return <InsightPanelSkeleton />;
    if (!payload) return null;

    return (
        <div className="market-insight-panel">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                    <ChartLineUp size={17} weight="regular" className="text-[#B7FB5B]" aria-hidden="true" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Context panel</p>
                </div>
                <span className="font-mono text-[10px] text-gray-500">{payload.symbol}</span>
            </div>
            <section className="border-b border-white/10 pb-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">Current state</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-[#B7FB5B]">{formatAlertState(payload.alertState)}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{statusSentence(payload)}</p>
            </section>

            <section className="border-b border-white/10 py-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">Weekly range</p>
                <p className="mt-2 text-base font-semibold text-gray-100">{formatRangeState(payload.rangeState)}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{rangeSentence(payload.rangeState)}</p>
            </section>

            <section className="py-5">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">Level map</p>
                <table className="w-full text-sm tabular-nums">
                    <thead>
                        <tr className="text-left text-xs text-gray-500">
                            <th className="pb-2 font-medium">Level</th>
                            <th className="pb-2 text-right font-medium">Harga</th>
                            <th className="pb-2 text-right font-medium">Jarak</th>
                        </tr>
                    </thead>
                    <tbody>
                        {LEVEL_ORDER.map((key) => (
                            <tr key={key} className="border-t border-white/5">
                                <td className="py-2 font-medium text-gray-200"><LevelName level={key} /></td>
                                <td className="py-2 text-right text-gray-300">{formatPrice(payload.levels?.[key])}</td>
                                <td className="py-2 text-right text-gray-400">{formatSignedPercent(payload.distances?.[key])}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-gray-500">
                Panel ini hanya konteks level, bukan signal entry. Keputusan trading tetap milik Anda.
            </p>
        </div>
    );
}
