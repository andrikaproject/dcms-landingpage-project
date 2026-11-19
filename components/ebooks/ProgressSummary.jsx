import { PROGRESS_STATUS_LABELS } from "@/lib/ebooks/payload";

// Angka dan persentase selalu dari BE. Komponen ini hanya menampilkan.
export function progressCountLabel(progress) {
    if (!progress) return "Progres belum tersedia";
    if (progress.totalLessons === 0) return PROGRESS_STATUS_LABELS.EMPTY;
    return `${progress.completedLessons} dari ${progress.totalLessons} subbab selesai`;
}

export default function ProgressSummary({ progress, compact = false, label = "Progres membaca", className = "" }) {
    const percent = progress?.percent;
    const hasBar = progress && progress.totalLessons > 0 && percent !== null && percent !== undefined;
    const status = progress?.status ? PROGRESS_STATUS_LABELS[progress.status] : null;

    return (
        <div className={className}>
            <div className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 ${compact ? "text-xs" : "text-sm"}`}>
                <span className="text-zinc-300">{progressCountLabel(progress)}</span>
                {hasBar ? (
                    <span className="font-bold tabular-nums text-white">{percent}%</span>
                ) : status && progress?.totalLessons !== 0 ? (
                    <span className="text-zinc-400">{status}</span>
                ) : null}
            </div>
            {hasBar && (
                <div
                    role="progressbar"
                    aria-label={label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-valuetext={`${percent}%, ${progressCountLabel(progress)}`}
                    className={`mt-2 overflow-hidden rounded-full bg-white/10 ${compact ? "h-1" : "h-1.5"}`}
                >
                    <div className="h-full rounded-full bg-[#B7FB5B]" style={{ width: `${percent}%` }} />
                </div>
            )}
        </div>
    );
}
