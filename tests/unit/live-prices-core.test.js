import assert from "node:assert/strict";
import test from "node:test";
import { LIVE_PRICE_POLL_INTERVAL_MS, livePricesBySymbol, symbolsForLivePrices } from "../../lib/market/live-prices-core.js";

test("polling harga live memakai interval sepuluh detik", () => {
    assert.equal(LIVE_PRICE_POLL_INTERVAL_MS, 10_000);
});

test("hanya delapan symbol unik yang diminta untuk harga live", () => {
    const pairs = Array.from({ length: 10 }, (_, index) => ({ symbol: `COIN${index}USDT` }));
    pairs.splice(2, 0, { symbol: "COIN0USDT" });

    assert.deepEqual(symbolsForLivePrices(pairs), [
        "COIN0USDT", "COIN1USDT", "COIN2USDT", "COIN3USDT",
        "COIN4USDT", "COIN5USDT", "COIN6USDT", "COIN7USDT",
    ]);
});

test("response harga dinormalisasi berdasarkan symbol tanpa mengubah decimal string", () => {
    const prices = livePricesBySymbol([
        { symbol: "EDUUSDT", lastPrice: "0.00432100" },
        { symbol: "BTCUSDT", lastPrice: "64250.50" },
        { symbol: "BADUSDT", lastPrice: null },
    ]);

    assert.deepEqual(prices, {
        EDUUSDT: "0.00432100",
        BTCUSDT: "64250.50",
    });
});
