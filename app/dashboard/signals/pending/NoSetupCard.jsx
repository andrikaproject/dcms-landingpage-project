"use client";

import { formatUserTime } from "@/lib/signals/format";

const REASON_LABELS = {
    RR_BELOW_MINIMUM: "Reward/risk rencana belum mencapai minimal 1:2",
    RANGE_COMPRESSION: "Range terlalu sempit untuk rencana yang layak",
    DATA_INSUFFICIENT: "Data candle belum cukup untuk dinilai",
    STRUCTURE_UNCLEAR: "Struktur harga belum memberi arah yang jelas",
    LEGACY_NO_TRADE_PLAN: "Analisis lama tidak menghasilkan level lengkap",
};

// Kartu ini tidak pernah menampilkan Entry/SL/TP rekaan; NO_SETUP adalah
// keputusan analisis, bukan kegagalan sistem.
export default function NoSetupCard({ symbol, timeframe, reasons = [], reasonSummary, generatedAt, onDismiss }) {
    return (
        <article className="rounded-2xl border border-sky-400/20 bg-sky-500/[0.07] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-chakra text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">
                    Belum ada setup
                </span>
                <h3 className="font-nebulica text-lg font-bold text-white">{symbol}</h3>
                {timeframe && <span className="font-chakra text-xs text-zinc-500">{timeframe.toUpperCase()}</span>}
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="ml-auto min-h-8 rounded-lg border border-zinc-700 bg-black/20 px-3 font-chakra text-[11px] font-bold text-zinc-400 transition hover:text-white"
                    >
                        Tutup
                    </button>
                )}
            </div>

            <p className="mt-2 font-chakra text-sm leading-6 text-zinc-200">
                {reasonSummary || "Belum ada kandidat rencana yang memenuhi kriteria pada pencarian ini."}
            </p>

            {reasons.length > 0 && (
                <ul className="mt-3 space-y-1">
                    {reasons.map((reason) => (
                        <li key={reason} className="font-chakra text-xs text-zinc-400">
                            · {REASON_LABELS[reason] || reason}
                        </li>
                    ))}
                </ul>
            )}

            <p className="mt-3 font-chakra text-[11px] text-zinc-500">
                Dianalisis {generatedAt ? formatUserTime(generatedAt) : "baru saja"}. Tidak ada level entry, stop loss, atau target yang diterbitkan.
            </p>
        </article>
    );
}
