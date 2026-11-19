// Logika murni tab AI Agent: pilihan fokus waktu, pesan analisis, riwayat yang
// dikirim ke agent, dan pemecahan teks jawaban untuk dirender.

export const FOCUS_OPTIONS = [
    { key: "scalp", label: "Scalp", range: "5m–15m" },
    { key: "intraday", label: "Intraday", range: "1H–4H" },
    { key: "swing", label: "Swing", range: "1D" },
];

// Backend agent hanya menerima teks, jadi fokus waktu disampaikan lewat pesan.
export function buildAnalysisPrompt(pair, focusKey) {
    const focus = FOCUS_OPTIONS.find((option) => option.key === focusKey) || FOCUS_OPTIONS[0];
    return `Analisa ${pair} untuk fokus ${focus.label} (${focus.range}). Beri bias long atau short, level penting, dan risikonya.`;
}

// Agent membaca maksimal 6 giliran terakhir. Pesan gagal tidak ikut dikirim.
export const HISTORY_LIMIT = 6;

export function toAgentHistory(messages) {
    return messages
        .filter((message) => (message.role === "user" || message.role === "assistant") && !message.failed)
        .slice(-HISTORY_LIMIT)
        .map((message) => ({ role: message.role, content: message.content }));
}

// Jawaban agent memakai blok ``` untuk tabel level dan **tebal** untuk judul seksi.
export function splitReply(text) {
    const blocks = [];
    String(text || "").split(/```[a-z]*\n?([\s\S]*?)```/g).forEach((part, index) => {
        if (index % 2 === 1) {
            const code = part.replace(/\s+$/, "");
            if (code) blocks.push({ type: "code", text: code });
            return;
        }
        if (!part.trim()) return;
        const spans = part.split(/(\*\*[^*\n]{1,120}\*\*)/g)
            .filter(Boolean)
            .map((segment) => (/^\*\*[^*]+\*\*$/.test(segment)
                ? { bold: true, text: segment.slice(2, -2) }
                : { bold: false, text: segment }));
        blocks.push({ type: "text", spans });
    });
    return blocks;
}

const ERROR_MESSAGES = {
    AI_QUOTA_EXCEEDED: "Kuota AI harianmu sudah habis. Coba lagi besok.",
    AI_AGENT_NOT_CONFIGURED: "AI Agent belum aktif di server ini.",
    AI_AGENT_TIMEOUT: "AI Agent terlalu lama menjawab. Coba lagi.",
    RATE_LIMITED: "Terlalu banyak pesan dalam waktu singkat. Tunggu sebentar.",
};

export function describeAgentError(error) {
    if (error?.status === 401) return "Sesi login berakhir. Muat ulang halaman lalu login lagi.";
    return ERROR_MESSAGES[error?.code] || error?.message || "AI Agent sedang tidak bisa dihubungi. Coba lagi sebentar.";
}
