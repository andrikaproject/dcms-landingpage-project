import assert from "node:assert/strict";
import test from "node:test";
import {
    describeSavedAt,
    historyKey,
    HISTORY_TTL_MS,
    loadConversation,
    MAX_SAVED_PAIRS,
    MAX_SAVED_MESSAGES,
    sanitizeMessages,
    saveConversation,
} from "../../lib/ai/agent-history.js";

function memoryStorage() {
    const data = new Map();
    return {
        getItem: (key) => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key),
        data,
    };
}

const plan = { bias: "long", entry: 1, entryLow: null, entryHigh: null, tp1: 1.1, tp2: null, sl: 0.9 };
const thread = [
    { role: "user", content: "Analisa BTC", at: 1 },
    { role: "assistant", content: "Long", charts: ["a.png"], plan, focus: "scalp", at: 2 },
];

test("kunci riwayat terpisah per akun dan kosong tanpa akun", () => {
    assert.equal(historyKey({ id: "7", accountType: "member" }), "dcms-ai-chat:v1:member:7");
    assert.notEqual(historyKey({ id: "7", accountType: "admin" }), historyKey({ id: "7", accountType: "member" }));
    assert.equal(historyKey(null), null);
});

test("percakapan tersimpan dan dimuat ulang per pair", () => {
    const storage = memoryStorage();
    const key = historyKey({ id: "1" });
    saveConversation(key, "BTCUSDT", { focus: "scalp", messages: thread }, { storage, now: 1000 });
    const loaded = loadConversation(key, "BTCUSDT", { storage, now: 2000 });
    assert.equal(loaded.focus, "scalp");
    assert.equal(loaded.updatedAt, 1000);
    assert.deepEqual(loaded.messages, thread);
    assert.equal(loadConversation(key, "ETHUSDT", { storage, now: 2000 }), null);
    assert.equal(loadConversation(historyKey({ id: "2" }), "BTCUSDT", { storage, now: 2000 }), null);
});

test("pesan gagal dan pertanyaan yang belum dijawab tidak disimpan", () => {
    const clean = sanitizeMessages([
        ...thread,
        { role: "user", content: "gagal", failed: true },
        { role: "user", content: "masih menunggu" },
    ]);
    assert.deepEqual(clean, thread);
    const long = Array.from({ length: MAX_SAVED_MESSAGES + 6 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `m${index}` }));
    assert.equal(sanitizeMessages(long).length, MAX_SAVED_MESSAGES);
});

test("mulai ulang menghapus riwayat pair tersebut", () => {
    const storage = memoryStorage();
    const key = historyKey({ id: "1" });
    saveConversation(key, "BTCUSDT", { focus: "scalp", messages: thread }, { storage, now: 1000 });
    saveConversation(key, "BTCUSDT", { focus: "scalp", messages: [] }, { storage, now: 1500 });
    assert.equal(storage.data.size, 0);
});

test("riwayat kedaluwarsa dan pair terlama dibuang", () => {
    const storage = memoryStorage();
    const key = historyKey({ id: "1" });
    saveConversation(key, "OLDUSDT", { focus: "scalp", messages: thread }, { storage, now: 0 });
    assert.equal(loadConversation(key, "OLDUSDT", { storage, now: HISTORY_TTL_MS + 1 }), null);

    for (let index = 0; index <= MAX_SAVED_PAIRS; index += 1) {
        saveConversation(key, `P${index}USDT`, { focus: "scalp", messages: thread }, { storage, now: 10 + index });
    }
    assert.equal(loadConversation(key, "P0USDT", { storage, now: 100 }), null);
    assert.ok(loadConversation(key, `P${MAX_SAVED_PAIRS}USDT`, { storage, now: 100 }));
});

test("data rusak di storage tidak membuat panel error", () => {
    const storage = memoryStorage();
    const key = historyKey({ id: "1" });
    storage.setItem(key, "{bukan json");
    assert.equal(loadConversation(key, "BTCUSDT", { storage }), null);
    saveConversation(key, "BTCUSDT", { focus: "scalp", messages: thread }, { storage, now: 5 });
    assert.ok(loadConversation(key, "BTCUSDT", { storage, now: 6 }));
});

test("waktu simpan ditulis relatif", () => {
    const now = 10 * 24 * 60 * 60_000;
    assert.equal(describeSavedAt(now - 10_000, now), "baru saja");
    assert.equal(describeSavedAt(now - 5 * 60_000, now), "5 menit lalu");
    assert.equal(describeSavedAt(now - 3 * 60 * 60_000, now), "3 jam lalu");
    assert.equal(describeSavedAt(now - 30 * 60 * 60_000, now), "kemarin");
    assert.equal(describeSavedAt(now - 4 * 24 * 60 * 60_000, now), "4 hari lalu");
});
