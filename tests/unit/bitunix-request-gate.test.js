import assert from "node:assert/strict";
import test from "node:test";
import {
    createBitunixRequestGate,
    withBitunixFrequencyRetries,
} from "../../lib/market/bitunix-request-gate.js";
import { createBitunixResponseCache } from "../../lib/market/bitunix-response-cache.js";

test("Bitunix request gate starts FIFO requests 400ms apart", async () => {
    let time = 0;
    const starts = [];
    const gate = createBitunixRequestGate({
        minSpacingMs: 400,
        now: () => time,
        sleep: async (delay) => {
            time += delay;
        },
    });

    const results = await Promise.all(
        ["first", "second", "third"].map((name) =>
            gate.run(async () => {
                starts.push({ name, time });
                return name;
            })
        )
    );

    assert.deepEqual(results, ["first", "second", "third"]);
    assert.deepEqual(starts, [
        { name: "first", time: 0 },
        { name: "second", time: 400 },
        { name: "third", time: 800 },
    ]);
});

test("frequency errors retry with increasing delays", async () => {
    let attempts = 0;
    const delays = [];
    const result = await withBitunixFrequencyRetries({
        request: async () => {
            attempts += 1;
            if (attempts < 3) throw new Error("request too frequently");
            return "ok";
        },
        sleep: async (delay) => {
            delays.push(delay);
        },
    });

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [1_000, 2_000]);
});

test("HTTP 429 retries as a Bitunix frequency error", async () => {
    let attempts = 0;
    const result = await withBitunixFrequencyRetries({
        request: async () => {
            attempts += 1;
            if (attempts === 1) {
                const error = new Error("Bitunix responded 429");
                error.status = 429;
                throw error;
            }
            return "ok";
        },
        sleep: async () => {},
    });

    assert.equal(result, "ok");
    assert.equal(attempts, 2);
});

test("non-frequency and aborted requests do not retry", async () => {
    let nonFrequencyAttempts = 0;
    await assert.rejects(
        withBitunixFrequencyRetries({
            request: async () => {
                nonFrequencyAttempts += 1;
                throw new Error("Bitunix responded 500");
            },
            sleep: async () => {
                throw new Error("must not sleep");
            },
        }),
        /500/
    );
    assert.equal(nonFrequencyAttempts, 1);

    const controller = new AbortController();
    controller.abort();
    let abortedAttempts = 0;
    await assert.rejects(
        withBitunixFrequencyRetries({
            signal: controller.signal,
            request: async () => {
                abortedAttempts += 1;
                throw new Error("request too frequently");
            },
        }),
        { name: "AbortError" }
    );
    assert.equal(abortedAttempts, 0);
});

test("fresh Bitunix response cache bypasses a new request slot", () => {
    let time = 0;
    const cache = createBitunixResponseCache({
        ttlMs: 60_000,
        now: () => time,
    });
    const payload = { code: 0, data: [{ symbol: "BTCUSDT" }] };

    cache.write("/tickers", payload);
    assert.strictEqual(cache.read("/tickers"), payload);

    time += 60_000;
    assert.equal(cache.read("/tickers"), null);
});
