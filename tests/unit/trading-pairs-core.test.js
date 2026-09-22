import assert from "node:assert/strict";
import test from "node:test";
import {
    TRADING_PAIRS_CACHE_KEY,
    filterTradingPairs,
    monogramFor,
    normalizeQuery,
    readCachedPairs,
    writeCachedPairs,
} from "../../lib/market/trading-pairs-core.js";

const pairs = [
    { symbol: "BTCUSDT", base: "BTC", quote: "USDT" },
    { symbol: "FILUSDT", base: "FIL", quote: "USDT" },
    { symbol: "FLOKIUSDT", base: "FLOKI", quote: "USDT" },
    { symbol: "SOLUSDT", base: "SOL", quote: "USDT" },
    { symbol: "1000PEPEUSDT", base: "1000PEPE", quote: "USDT" },
    { symbol: "PEPEUSDT", base: "PEPE", quote: "USDT" },
];

test("ketikan salah seperti FILL tidak menghasilkan saran apa pun", () => {
    assert.deepEqual(filterTradingPairs(pairs, "FILL"), []);
    assert.deepEqual(filterTradingPairs(pairs, "FIL").map((pair) => pair.symbol), ["FILUSDT"]);
});

test("kecocokan persis dan awalan base menang atas kecocokan di tengah", () => {
    const symbols = filterTradingPairs(pairs, "PEPE").map((pair) => pair.symbol);
    assert.deepEqual(symbols, ["PEPEUSDT", "1000PEPEUSDT"]);
});

test("query dibersihkan dari spasi dan huruf kecil", () => {
    assert.equal(normalizeQuery("  fil usdt "), "FILUSDT");
    assert.deepEqual(filterTradingPairs(pairs, " sol ").map((pair) => pair.base), ["SOL"]);
});

test("query kosong tidak menampilkan saran dan limit dihormati", () => {
    assert.deepEqual(filterTradingPairs(pairs, ""), []);
    assert.equal(filterTradingPairs(pairs, "U", { limit: 2 }).length, 2);
    assert.deepEqual(filterTradingPairs(null, "BTC"), []);
});

test("monogram konsisten untuk base yang sama dan memakai maksimal tiga huruf", () => {
    assert.deepEqual(monogramFor("BTC"), monogramFor("btc"));
    assert.equal(monogramFor("BTC").initials, "BTC");
    assert.equal(monogramFor("FLOKI").initials, "FL");
    assert.ok(monogramFor("SOL").hue >= 0 && monogramFor("SOL").hue < 360);
    assert.equal(monogramFor("").initials, "?");
});

function createStorage() {
    const map = new Map();
    return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, value) };
}

test("cache browser kedaluwarsa setelah TTL dan menolak isi yang rusak", () => {
    const storage = createStorage();
    const now = 1_700_000_000_000;

    assert.equal(writeCachedPairs(pairs, { storage, now }), true);
    assert.deepEqual(readCachedPairs({ storage, now: now + 1000 }).items, pairs);
    assert.equal(readCachedPairs({ storage, now: now + 25 * 60 * 60 * 1000 }), null);

    storage.setItem(TRADING_PAIRS_CACHE_KEY, "{");
    assert.equal(readCachedPairs({ storage, now }), null);
    assert.equal(writeCachedPairs("bukan array", { storage, now }), false);
});

test("storage yang menolak penulisan tidak melempar", () => {
    const failing = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    assert.equal(writeCachedPairs(pairs, { storage: failing }), false);
    assert.equal(readCachedPairs({ storage: failing }), null);
});
