import assert from "node:assert/strict";
import test from "node:test";
import { buildPage, createReporter, hashKey, isReporterEnabled, normalizeError } from "../../lib/monitoring/client-error-reporter.js";

const entry = { type: "CLIENT_UNCAUGHT_ERROR", message: "test error" };
function setup(options = {}) {
    const calls = [];
    let time = 0;
    const reporter = createReporter({ endpoint: "/api/v1/logs/client", location: { pathname: "/reset-password", search: "?token=private", hash: "#private" }, fetchImpl: (...args) => { calls.push(args); return Promise.resolve(); }, now: () => time, ...options });
    return { ...reporter, calls, advance: (ms) => { time += ms; } };
}

test("page contains only pathname; empty location uses root", () => {
    assert.equal(buildPage({ pathname: "/reset-password", search: "?token=abc", hash: "#x" }), "/reset-password");
    assert.equal(buildPage(undefined), "/");
    const r = setup();
    r.report({ ...entry, page: "https://example.com?token=private", authorization: "private" });
    const body = JSON.parse(r.calls[0][1].body);
    assert.equal(body.page, "/reset-password");
    assert.equal(body.authorization, undefined);
});

test("dedupe expires after sixty seconds and hashes only the first 200 stack characters", () => {
    const r = setup();
    assert.equal(r.report(entry), true);
    assert.equal(r.report(entry), false);
    r.advance(61_000);
    assert.equal(r.report(entry), true);
    assert.equal(r.calls.length, 2);
    assert.equal(hashKey("T", "M", "x".repeat(200) + "one"), hashKey("T", "M", "x".repeat(200) + "two"));
});

test("manual dedupe bypass still respects the rolling budget", () => {
    const r = setup();
    for (let i = 0; i < 25; i++) r.report(entry, { bypassDedupe: true, force: true });
    assert.equal(r.calls.length, 20);
    r.advance(60_000);
    assert.equal(r.report(entry), true);
});

test("twenty distinct reports per minute, then accepts again", () => {
    const r = setup();
    for (let i = 0; i < 25; i++) r.report({ ...entry, message: `error ${i}` });
    assert.equal(r.calls.length, 20);
    r.advance(61_000);
    assert.equal(r.report(entry), true);
});

test("disabled reporters only send forced reports", () => {
    const r = setup({ enabled: false });
    assert.equal(r.report(entry), false);
    assert.equal(r.calls.length, 0);
    assert.equal(r.report(entry, { force: true }), true);
    assert.equal(isReporterEnabled({ NODE_ENV: "development" }), false);
    assert.equal(isReporterEnabled({ NODE_ENV: "production" }), true);
    assert.equal(isReporterEnabled({ NEXT_PUBLIC_CLIENT_LOGS_ENABLED: "true" }), true);
});

test("rejected fetch, synchronous errors, circular details and recursion never escape", async () => {
    const rejected = setup({ fetchImpl: () => Promise.reject(new Error("offline")) });
    assert.equal(rejected.report(entry), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(setup({ fetchImpl: () => { throw new Error("offline"); } }).report(entry), false);
    assert.equal(setup({ getToken: () => { throw new Error("unavailable"); } }).report(entry), false);
    const details = {}; details.self = details;
    const r = setup();
    assert.equal(r.report({ ...entry, details }), false);
    assert.equal(r.report(entry), true);
    let recursive;
    recursive = setup({ fetchImpl: () => { assert.equal(recursive.report(entry), false); return Promise.resolve(); } });
    assert.equal(recursive.report(entry), true);
});

test("listeners report browser failures and network errors, ignore HTTP errors, and clean up", () => {
    const r = setup();
    const target = new EventTarget();
    const clean = r.installGlobalListeners(target);
    const send = (type, values) => target.dispatchEvent(Object.assign(new Event(type), values));
    send("dcms:api-request", { detail: { status: 500 } });
    send("dcms:api-request", {});
    assert.equal(r.calls.length, 0);
    send("dcms:api-request", { detail: { status: 0, method: "GET", path: "/v1/market/dashboard", requestId: "req-1", durationMs: 123, retried: true } });
    const payload = JSON.parse(r.calls[0][1].body);
    assert.equal(payload.type, "CLIENT_NETWORK_ERROR");
    assert.equal(payload.requestId, "req-1");
    assert.equal(payload.retried, true);
    send("error", { error: new Error("global failure") });
    send("unhandledrejection", { reason: "rejection" });
    assert.deepEqual(r.calls.map((call) => JSON.parse(call[1].body).type), ["CLIENT_NETWORK_ERROR", "CLIENT_UNCAUGHT_ERROR", "CLIENT_UNHANDLED_REJECTION"]);
    clean();
    send("error", { message: "another error" });
    send("unhandledrejection", { reason: "another rejection" });
    send("dcms:api-request", { detail: { code: "NETWORK_ERROR", path: "/another" } });
    assert.equal(r.calls.length, 3);
});

test("bearer token is optional and keepalive credentials are included", () => {
    for (const token of [null, "access-token"]) {
        const r = setup({ getToken: () => token });
        r.report(entry);
        const [url, options] = r.calls[0];
        assert.equal(url, "/api/v1/logs/client");
        assert.equal(options.headers.Authorization, token ? `Bearer ${token}` : undefined);
        assert.equal(options.credentials, "include");
        assert.equal(options.keepalive, true);
    }
});

test("normalizes unknown errors and bounds message and stack", () => {
    assert.equal(normalizeError("x".repeat(1001)).message.length, 1000);
    assert.equal(normalizeError({ message: "test", stack: "x".repeat(8001) }).stack.length, 8000);
    assert.equal(normalizeError({ reason: "bad" }).message, '{"reason":"bad"}');
    const cyclic = {}; cyclic.self = cyclic;
    assert.equal(normalizeError(cyclic).message, "Unknown error");
});
