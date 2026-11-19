// Membaca Entry, TP, dan SL dari teks jawaban AI Agent. Backend agent belum
// mengirim data terstruktur, jadi parser ini sengaja ketat: hanya baris
// "kunci: angka", dan hasilnya dibuang bila susunan levelnya tidak masuk akal.
// Lebih baik tidak menggambar apa pun daripada menggambar di harga yang salah.

const KEY_PATTERNS = [
    ["entry", /^(entry|entri|entry price|harga entry|entry zone|zona entry|area entry|area masuk|masuk)$/],
    ["tp2", /^(tp ?2|target ?2|take ?profit ?2)$/],
    ["tp1", /^(tp ?1|tp|target ?1|target|take ?profit ?1|take ?profit)$/],
    ["sl", /^(sl|stop ?loss|stoploss|stop|invalidasi|invalidation)$/],
    ["bias", /^(bias|arah|direction|posisi|side)$/],
];

const LINE = /^\s*(?:[-*•]\s*)?\**\s*([A-Za-z][A-Za-z0-9 _]{0,24}?)\s*\**\s*[:=]\s*\**\s*(.+)$/;
// Angka yang diikuti % adalah persentase, bukan harga.
const NUMBER = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?!\d|[.,]\d|\s*%)/g;

function canonicalKey(raw) {
    const key = raw.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
    return KEY_PATTERNS.find(([, pattern]) => pattern.test(key))?.[0] || null;
}

function toNumber(token) {
    const lastDot = token.lastIndexOf(".");
    const lastComma = token.lastIndexOf(",");
    let normalized = token;
    if (lastDot !== -1 && lastComma !== -1) {
        // Pemisah yang muncul terakhir adalah desimal.
        normalized = lastDot > lastComma ? token.replace(/,/g, "") : token.replace(/\./g, "").replace(",", ".");
    } else if (lastComma !== -1) {
        normalized = /^\d{1,3}(,\d{3})+$/.test(token) ? token.replace(/,/g, "") : token.replace(",", ".");
    } else if ((token.match(/\./g) || []).length > 1) {
        normalized = token.replace(/\./g, "");
    }
    const value = Number(normalized);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function numbersIn(value) {
    return [...value.replace(/\*/g, "").matchAll(NUMBER)].map((match) => toNumber(match[1])).filter((number) => number !== null);
}

function readFields(text) {
    const fields = {};
    for (const line of text.split("\n")) {
        const match = line.match(LINE);
        if (!match) continue;
        const key = canonicalKey(match[1]);
        if (!key || key in fields) continue;
        if (key === "bias") {
            const word = match[2].toLowerCase();
            if (/\blong\b|\bbuy\b|bullish/.test(word)) fields.bias = "long";
            else if (/\bshort\b|\bsell\b|bearish/.test(word)) fields.bias = "short";
            continue;
        }
        const numbers = numbersIn(match[2]);
        if (numbers.length) fields[key] = numbers;
    }
    return fields;
}

function hasPrices(fields) {
    return fields.entry && fields.sl && fields.tp1;
}

function within(price, reference, ratio) {
    return !reference || (price >= reference / ratio && price <= reference * ratio);
}

/**
 * @returns {{ bias: "long"|"short", entry: number, entryLow: number|null, entryHigh: number|null, tp1: number, tp2: number|null, sl: number } | null}
 */
export function parseAgentPlan(text, { currentPrice = null } = {}) {
    const source = String(text || "");
    // Blok kode lebih dulu: di sanalah agent menaruh setup-nya.
    const blocks = [...source.matchAll(/```[a-z]*\n?([\s\S]*?)```/g)].map((match) => match[1]);
    let fields = readFields(blocks.join("\n"));
    if (!hasPrices(fields)) fields = readFields(source);
    if (!hasPrices(fields)) return null;

    const [entryA, entryB] = fields.entry;
    const entryLow = entryB ? Math.min(entryA, entryB) : null;
    const entryHigh = entryB ? Math.max(entryA, entryB) : null;
    const entry = entryB ? (entryA + entryB) / 2 : entryA;
    const sl = fields.sl[0];
    const tp1 = fields.tp1[0];
    // "TP: 0.123 / 0.127" berarti TP1 dan TP2 sekaligus.
    let tp2 = fields.tp2?.[0] ?? fields.tp1[1] ?? null;

    const bias = tp1 > entry ? "long" : "short";
    const ordered = bias === "long" ? sl < (entryLow ?? entry) && tp1 > (entryHigh ?? entry) : sl > (entryHigh ?? entry) && tp1 < (entryLow ?? entry);
    if (!ordered) return null;
    if (fields.bias && fields.bias !== bias) return null;
    // TP2 yang aneh (misalnya angka rasio R:R yang ikut terbaca) dibuang sendiri.
    if (tp2 !== null && ((bias === "long" ? tp2 <= tp1 : tp2 >= tp1) || !within(tp2, entry, 3))) tp2 = null;

    const reference = Number(currentPrice) > 0 ? Number(currentPrice) : null;
    if (![entry, sl, tp1, tp2].filter((value) => value !== null).every((value) => within(value, reference, 3))) return null;

    return { bias, entry, entryLow, entryHigh, tp1, tp2, sl };
}
