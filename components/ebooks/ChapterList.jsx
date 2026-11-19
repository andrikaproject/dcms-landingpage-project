import Link from "next/link";
import { CheckCircle, Circle } from "@phosphor-icons/react";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]";

export function lessonHref(slug, lessonId) {
    return `/dashboard/ebook/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}`;
}

// Ikon lingkaran/centang menandai status selesai yang dikonfirmasi BE. Semua
// subbab terbit dapat dibuka dalam urutan apa pun, jadi tidak ada ikon gembok.
function CompletionMark({ completed, size }) {
    return completed ? (
        <>
            <CheckCircle size={size} weight="fill" className="shrink-0 text-[#B7FB5B]" aria-hidden />
            <span className="sr-only">(selesai)</span>
        </>
    ) : (
        <>
            <Circle size={size} className="shrink-0 text-zinc-400" aria-hidden />
            <span className="sr-only">(belum selesai)</span>
        </>
    );
}

function ChapterHeading({ compact, ...props }) {
    return compact ? <p {...props} /> : <h3 {...props} />;
}

export default function ChapterList({ slug, chapters, currentLessonId = null, compact = false, onNavigate }) {
    return (
        <ol className={compact ? "space-y-5" : "space-y-8"}>
            {chapters.map((chapter, chapterIndex) => (
                <li key={chapter.id}>
                    {/* Navigasi ringkas di samping materi tidak ikut membentuk outline heading halaman. */}
                    <ChapterHeading compact={compact} className={compact ? "px-2 text-xs font-bold text-zinc-400" : "font-nebulica text-lg font-bold text-white"}>
                        <span className={compact ? "" : "mr-2 text-zinc-400"}>Bab {chapterIndex + 1}{compact ? ": " : ""}</span>
                        <span className="break-words">{chapter.title}</span>
                    </ChapterHeading>
                    <ol className={compact ? "mt-1.5 space-y-0.5" : "mt-3 divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-black/20"}>
                        {chapter.lessons.map((lesson) => {
                            const current = lesson.id === currentLessonId;
                            return (
                                <li key={lesson.id}>
                                    <Link
                                        href={lessonHref(slug, lesson.id)}
                                        onClick={onNavigate}
                                        aria-current={current ? "page" : undefined}
                                        className={`flex min-h-11 items-start gap-3 transition ${FOCUS_RING} ${compact
                                            ? `rounded-lg px-2 py-2 text-sm ${current ? "bg-white/10 font-semibold text-white" : "text-zinc-300 hover:bg-white/[0.05] hover:text-white"}`
                                            : "px-4 py-3 text-[0.95rem] text-zinc-100 first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/[0.04]"}`}
                                    >
                                        <span className="mt-0.5 flex"><CompletionMark completed={lesson.completed} size={compact ? 16 : 18} /></span>
                                        <span className="min-w-0 flex-1 break-words">{lesson.title || "Tanpa judul"}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                </li>
            ))}
        </ol>
    );
}
