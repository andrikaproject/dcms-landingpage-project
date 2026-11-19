// State pembaca subbab. Setiap aksi membawa lessonId supaya respons dari subbab
// yang sudah ditinggalkan tidak menimpa subbab yang sedang dibuka.

export function initialReaderState(lessonId) {
    return {
        lessonId,
        load: "loading",
        data: null,
        loadError: null,
        // idle -> saving -> saved | error. "saved" hanya setelah BE mengonfirmasi.
        completion: "idle",
        completedAt: null,
        completionError: null,
        progress: null,
    };
}

export function readerReducer(state, action) {
    if (action.lessonId !== state.lessonId) return state;

    switch (action.type) {
        case "loaded": {
            const lesson = action.data.lesson;
            return {
                ...state,
                load: "ready",
                data: action.data,
                loadError: null,
                // Membuka ulang materi yang sudah selesai tidak membatalkan status selesai.
                completion: lesson.completed || state.completion === "saved" ? "saved" : state.completion === "saving" ? "saving" : "idle",
                completedAt: lesson.completedAt ?? state.completedAt,
                progress: action.data.progress ?? state.progress,
            };
        }
        case "loadFailed":
            return { ...state, load: "error", loadError: action.message };
        case "retryLoad":
            return { ...state, load: "loading", loadError: null };
        case "completeStart":
            if (state.load !== "ready" || state.completion === "saving" || state.completion === "saved") return state;
            return { ...state, completion: "saving", completionError: null };
        case "completeSucceeded":
            if (state.completion !== "saving") return state;
            return {
                ...state,
                completion: "saved",
                completedAt: action.completedAt ?? state.completedAt,
                progress: action.progress ?? state.progress,
                completionError: null,
            };
        case "completeFailed":
            if (state.completion !== "saving") return state;
            return { ...state, completion: "error", completionError: action.message };
        default:
            return state;
    }
}

export function flattenLessons(chapters = []) {
    return chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ ...lesson, chapterId: chapter.id, chapterTitle: chapter.title })));
}

export function adjacentLessons(chapters, lessonId) {
    const lessons = flattenLessons(chapters);
    const index = lessons.findIndex((lesson) => lesson.id === lessonId);
    return {
        current: index >= 0 ? lessons[index] : null,
        previous: index > 0 ? lessons[index - 1] : null,
        next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null,
        position: index >= 0 ? index + 1 : null,
        total: lessons.length,
    };
}

// Tujuan tombol lanjut di detail ebook. Hanya membaca flag selesai dari BE.
export function resumeTarget(ebook) {
    const lessons = flattenLessons(ebook?.chapters);
    if (!lessons.length) return null;
    const last = lessons.find((lesson) => lesson.id === ebook.progress?.lastLessonId && !lesson.completed);
    if (last) return { lesson: last, label: "Lanjutkan membaca" };
    const firstOpen = lessons.find((lesson) => !lesson.completed);
    if (!firstOpen) return { lesson: lessons[0], label: "Baca dari awal" };
    const started = lessons.some((lesson) => lesson.completed || lesson.lastOpenedAt);
    return { lesson: firstOpen, label: started ? "Lanjutkan membaca" : "Mulai membaca" };
}

export function markLessonCompleted(ebook, lessonId, { completedAt, progress }) {
    if (!ebook) return ebook;
    return {
        ...ebook,
        progress: progress ?? ebook.progress,
        chapters: ebook.chapters.map((chapter) => ({
            ...chapter,
            lessons: chapter.lessons.map((lesson) => (lesson.id === lessonId
                ? { ...lesson, completed: true, completedAt: lesson.completedAt ?? completedAt ?? null }
                : lesson)),
        })),
    };
}

export function identityOf(user) {
    if (!user) return null;
    const id = user.sub ?? user.id ?? user.email;
    return id ? `${user.accountType || "USER"}:${id}` : null;
}

// Cache memori per sesi browser. Data hanya dikembalikan untuk identitas akun yang
// sama; akun berbeda atau logout mengosongkan seluruh isi cache.
export function createIdentityCache() {
    let owner = null;
    const entries = new Map();

    return {
        get(key, identity) {
            if (!identity || identity !== owner) return undefined;
            return entries.get(key);
        },
        set(key, identity, value) {
            if (!identity) return;
            if (identity !== owner) {
                entries.clear();
                owner = identity;
            }
            entries.set(key, value);
        },
        delete(key) {
            entries.delete(key);
        },
        syncIdentity(identity) {
            if (identity !== owner) {
                entries.clear();
                owner = identity;
            }
        },
        clear() {
            entries.clear();
            owner = null;
        },
        get size() {
            return entries.size;
        },
    };
}
