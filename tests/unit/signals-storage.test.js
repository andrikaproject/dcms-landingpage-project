import assert from "node:assert/strict";
import test from "node:test";
import {
    boardCacheKey,
    hideCard,
    isHidden,
    legacyBoardKey,
    legacyRemovedKey,
    migrateBoardCache,
    readBoardCache,
    rememberCard,
    writeBoardCache,
} from "../../lib/signals/storage.js";

function createStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, value),
        removeItem: (key) => map.delete(key),
        raw: map,
    };
}

test("cache lama berbasis symbol dimigrasi tanpa menghapus data lama", () => {
    const storage = createStorage({
        [legacyBoardKey("15m")]: JSON.stringify([{ symbol: "BTCUSDT" }, { symbol: "ETHUSDT" }]),
        [legacyRemovedKey("15m")]: JSON.stringify(["SOLUSDT"]),
    });

    const { cache, migrated } = migrateBoardCache("15m", storage);
    assert.equal(migrated, true);
    assert.deepEqual(cache.cards.map((card) => card.symbol), ["BTCUSDT", "ETHUSDT"]);
    assert.equal(cache.cards.every((card) => card.signalId === null && card.isLegacy), true);
    assert.deepEqual(cache.hidden.map((card) => card.symbol), ["SOLUSDT"]);
    assert.ok(storage.getItem(legacyBoardKey("15m")));
    assert.ok(storage.getItem(boardCacheKey("15m")));
});

test("migrasi hanya berjalan sekali", () => {
    const storage = createStorage({ [legacyBoardKey("1h")]: JSON.stringify([{ symbol: "BTCUSDT" }]) });
    assert.equal(migrateBoardCache("1h", storage).migrated, true);
    assert.equal(migrateBoardCache("1h", storage).migrated, false);
});

test("satu symbol bisa punya beberapa rencana dengan signalId berbeda", () => {
    let cache = readBoardCache("15m", createStorage());
    cache = rememberCard(cache, { signalId: "sig_a", symbol: "BTCUSDT", timeframe: "15m" });
    cache = rememberCard(cache, { signalId: "sig_b", symbol: "BTCUSDT", timeframe: "15m" });

    assert.equal(cache.cards.length, 2);
    assert.deepEqual(cache.cards.map((card) => card.signalId), ["sig_b", "sig_a"]);
});

test("kartu yang sama tidak diduplikasi saat retry", () => {
    let cache = readBoardCache("15m", createStorage());
    cache = rememberCard(cache, { signalId: "sig_a", symbol: "BTCUSDT" });
    cache = rememberCard(cache, { signalId: "sig_a", symbol: "BTCUSDT" });
    assert.equal(cache.cards.length, 1);
});

test("menyembunyikan kartu hanya memindahkannya ke daftar hidden", () => {
    let cache = readBoardCache("15m", createStorage());
    cache = rememberCard(cache, { signalId: "sig_a", symbol: "BTCUSDT" });
    cache = hideCard(cache, { signalId: "sig_a", symbol: "BTCUSDT" });

    assert.equal(cache.cards.length, 0);
    assert.equal(isHidden(cache, { signalId: "sig_a" }), true);

    cache = rememberCard(cache, { signalId: "sig_a", symbol: "BTCUSDT" });
    assert.equal(isHidden(cache, { signalId: "sig_a" }), false);
});

test("storage yang menolak penulisan tidak melempar error", () => {
    const failing = {
        getItem: () => null,
        setItem: () => { throw new Error("QuotaExceeded"); },
    };
    assert.equal(writeBoardCache("15m", { cards: [], hidden: [] }, failing), false);
    assert.deepEqual(readBoardCache("15m", failing).cards, []);
});

test("cache rusak diperlakukan sebagai kosong", () => {
    const storage = createStorage({ [boardCacheKey("4h")]: "{" });
    assert.deepEqual(readBoardCache("4h", storage).cards, []);
});
