"use client";

import { describeStatus } from "@/lib/signals/lifecycle";
import { finalTakeProfit, hasPartialTakeProfit } from "@/lib/signals/plan";
import { describeTriggerRule } from "@/lib/signals/rules";
import { SIGNAL_FLAGS, SIGNAL_TRACKING } from "@/lib/signals/flags";
import {
    describeFreshness,
    describeValidity,
    formatDecimalPrice,
    formatRealizedR,
    formatRewardRisk,
    formatUserTime,
} from "@/lib/signals/format";

function sideBadgeClass(side) {
    if (side === "LONG") return "bg-gradient-to-br from-[#8AEF5A] to-[#4ADE80] text-[#052e16]";
    if (side === "SHORT") return "bg-gradient-to-br from-[#f49062] to-[#fd371f] text-[#fef3f2]";
    return "bg-gradient-to-br from-[#38bdf8] to-[#184BFF] text-white";
}

function LevelBlock({ label, value, tone = "text-white", hint = null }) {
    return (
        <div className="min-w-0 rounded-lg bg-black/25 p-3">
            <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <p className={`mt-1 truncate font-chakra text-sm font-bold ${tone}`}>{value}</p>
            {hint && <p className="mt-0.5 truncate font-chakra text-[10px] text-zinc-500">{hint}</p>}
        </div>
    );
}

function AssessmentPanel({ assessment }) {
    if (!assessment) return null;

    // Shadow score bukan rekomendasi publik, jadi hanya mode aktif yang tampil
    // sebagai penilaian; sisanya dijelaskan sebagai baseline atau uji internal.
    if (!SIGNAL_FLAGS.publicAssessment || !assessment.isActive) {
        return (
            <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Penilaian</p>
                <p className="mt-1 font-chakra text-xs leading-5 text-zinc-400">
                    {assessment.isShadow
                        ? "Model masih diuji internal. Rencana ini dipilih aturan baseline."
                        : "Rencana dipilih aturan baseline. Penilaian model belum dipublikasikan."}
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.06] p-3">
            <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-[#B7FB5B]">Penilaian Model Aktif</p>
            {assessment.summary && <p className="mt-1 font-chakra text-xs leading-5 text-zinc-200">{assessment.summary}</p>}
            <p className="mt-1 font-chakra text-[11px] text-zinc-400">
                {assessment.probability === null
                    ? assessment.probabilityWithheldReason
                    : `Probabilitas terkalibrasi ${(assessment.probability * 100).toFixed(0)}%`}
            </p>
            {assessment.reasonCodes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {assessment.reasonCodes.map((code) => (
                        <span key={code} className="rounded border border-white/[0.08] bg-black/30 px-1.5 py-0.5 font-chakra text-[10px] text-zinc-400">
                            {code}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PendingSignalCard({
    plan,
    now,
    isLocking = false,
    isLocked = false,
    lockError = "",
    onLock,
    onAddToBoard,
}) {
    const status = describeStatus(plan.status);
    const freshness = describeFreshness(plan.tracking?.lastEvaluatedAt, {
        now,
        staleAfterMs: SIGNAL_TRACKING.staleAfterMs,
        dataHealth: plan.tracking?.dataHealth,
    });
    const validity = describeValidity(plan.expiresAt, { now });
    const priceOptions = { tickSize: plan.tickSize, precision: plan.pricePrecision };
    const finalTp = finalTakeProfit(plan);
    const triggerRule = describeTriggerRule(plan.entry.triggerRule);
    const quote = plan.source === "DEXSCREENER" ? "USD" : "USDT";
    const entryLabel = plan.entry.isZone
        ? `${formatDecimalPrice(plan.entry.zoneLow, priceOptions)} – ${formatDecimalPrice(plan.entry.zoneHigh, priceOptions)}`
        : formatDecimalPrice(plan.entry.price, priceOptions);

    return (
        <article className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#202838] to-[#111827] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 font-chakra text-[10px] font-bold uppercase ${sideBadgeClass(plan.side)}`}>
                    {plan.side || "TANPA ARAH"}
                </span>
                <h3 className="font-nebulica text-lg font-bold text-white">{plan.base}/{quote}</h3>
                <span className="font-chakra text-xs text-zinc-500">{(plan.timeframe || "").toUpperCase()}</span>
                <span className="font-chakra text-xs text-zinc-600">·</span>
                <span className="font-chakra text-xs text-zinc-500">{plan.source || "Sumber tidak tersedia"}</span>
                <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 font-chakra text-[11px] font-bold ${status.className}`}>
                    {status.label}
                </span>
            </div>

            {!status.isKnown && (
                <p className="mt-3 rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 font-chakra text-[11px] text-fuchsia-200">
                    Status `{String(plan.status)}` belum dikenal frontend. Rencana tetap ditampilkan apa adanya dan perlu pemeriksaan kontrak API.
                </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <LevelBlock
                    label={plan.entry.isZone ? "Zona Entry" : "Harga Entry"}
                    value={entryLabel}
                    hint={triggerRule ? `Pemicu: ${triggerRule.short.toLowerCase()}` : null}
                />
                <LevelBlock label="Stop Loss" value={formatDecimalPrice(plan.stopLoss, priceOptions)} tone="text-red-300" />
                <LevelBlock
                    label="Target Final"
                    value={formatDecimalPrice(finalTp?.price, priceOptions)}
                    tone="text-[#B7FB5B]"
                    hint={hasPartialTakeProfit(plan) ? "Rencana partial TP" : null}
                />
                <LevelBlock
                    label="RR Rencana"
                    value={formatRewardRisk(plan.grossRewardRisk)}
                    hint="Sebelum biaya"
                />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-chakra text-[11px]">
                <span className={freshness.isStale ? "text-yellow-300" : "text-zinc-500"}>{freshness.label}</span>
                {status.phase === "waiting" && (
                    <span className={validity.isElapsed ? "text-yellow-300" : "text-zinc-500"}>{validity.label}</span>
                )}
                {plan.activatedAt && <span className="text-zinc-500">Entry tersentuh {formatUserTime(plan.activatedAt)}</span>}
                {plan.resolvedAt && <span className="text-zinc-500">Selesai {formatUserTime(plan.resolvedAt)}</span>}
            </div>

            {freshness.isStale && (
                <p className="mt-2 rounded-lg border border-yellow-400/20 bg-yellow-500/10 px-3 py-2 font-chakra text-[11px] text-yellow-200">
                    Data harga tertunda. Kartu ini menampilkan kondisi terakhir yang diketahui backend, bukan pemantauan real-time.
                </p>
            )}

            <div className="mt-3 space-y-2">
                {plan.selectionReason && (
                    <p className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 font-chakra text-xs leading-5 text-zinc-300">
                        {plan.selectionReason}
                    </p>
                )}
                {plan.invalidationRule && (
                    <p className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 font-chakra text-xs leading-5 text-zinc-400">
                        Pembatalan: {plan.invalidationRule}
                    </p>
                )}
                <AssessmentPanel assessment={plan.assessment} />
            </div>

            {plan.outcome && (
                <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <p className="font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Hasil Simulasi</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-chakra text-[11px] text-zinc-300">
                        <span>Alasan {plan.outcome.reason || "-"}</span>
                        <span>Harga keluar {formatDecimalPrice(plan.outcome.exitPrice, priceOptions)}</span>
                        <span>Gross {formatRealizedR(plan.outcome.grossRealizedR)}</span>
                        <span>Net {formatRealizedR(plan.outcome.netRealizedR)}</span>
                    </div>
                </div>
            )}

            <p className="mt-3 font-chakra text-[10px] leading-4 text-zinc-600">
                Pemantauan ini simulasi signal berdasarkan data exchange, bukan bukti order kamu terisi.
            </p>

            {lockError && (
                <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 font-chakra text-xs text-red-200">{lockError}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onLock?.(plan)}
                    disabled={isLocking || isLocked || !plan.signalId}
                    title={plan.signalId ? undefined : "Rencana ini belum punya signalId dari backend"}
                    className="min-h-10 flex-1 rounded-lg border-2 border-white/10 bg-[#B7FB5B] px-4 font-chakra text-xs font-bold text-black transition hover:bg-[#a8ec4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {isLocked ? "Dipantau di Lock Signal" : isLocking ? "Menambahkan…" : "Pantau di Lock Signal"}
                </button>
                <button
                    type="button"
                    onClick={() => onAddToBoard?.(plan)}
                    className="min-h-10 flex-1 rounded-lg border border-zinc-700 bg-black/20 px-4 font-chakra text-xs font-bold text-zinc-200 transition hover:border-zinc-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]"
                >
                    Tambah ke Signal Board
                </button>
            </div>

            <p className="mt-2 font-chakra text-[11px] leading-4 text-zinc-400">
                Kartu ini pindah ke Signal Board setelah ditambahkan. Detail lengkap, re-analyze, dan hapus kartu ada di sana.
            </p>
        </article>
    );
}
