import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Transpile the real client using the project's compiler; no TS test loader needed.
const source = await readFile(new URL("../../lib/api/client.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
let moduleId = 0;
async function setup(t, responses, baseUrl = "/api/v1") {
    const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
    t.after(() => {
        if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
        else process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
    });
    const events = [];
    t.mock.method(globalThis, "fetch", async (...args) => {
        calls.push(args);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        assert.ok(response, "Unexpected extra request");
        return response;
    });
    const originalWindow = globalThis.window;
    globalThis.window = { location: { origin: "http://localhost:3000" }, dispatchEvent: (event) => events.push(event.detail) };
    t.after(() => { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
    const calls = [];
    const client = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}#${moduleId++}`);
    return { client, calls, events };
}
const json = (data, status = 200) => Response.json(data, { status });

test("download builds URL, includes auth and credentials, preserves binary and filename", async (t) => {
    const { client, calls, events } = await setup(t, [new Response("csv-data", { headers: { "Content-Disposition": 'attachment; filename="logs.csv"' } })]);
    client.setAccessToken("access");
    const result = await client.apiDownload("/admin/logs/export", { query: { date: "2026-09-04", format: "csv", kind: "", omitted: undefined } });
    assert.equal(result.filename, "logs.csv");
    assert.equal(await result.blob.text(), "csv-data");
    assert.equal(String(calls[0][0]), "http://localhost:3000/api/v1/admin/logs/export?date=2026-09-04&format=csv");
    assert.equal(calls[0][1].headers.get("Authorization"), "Bearer access");
    assert.equal(calls[0][1].headers.get("Accept"), "*/*");
    assert.equal(calls[0][1].credentials, "include");
    assert.equal(events[0].status, 200);
});

test("download refreshes once, uses new token and stable request ID", async (t) => {
    const { client, calls, events } = await setup(t, [json({}, 401), json({ ok: true, data: { accessToken: "new", user: { email: "admin@example.test" } } }), new Response("[]")], "http://localhost:4000/v1");
    client.setAccessToken("old");
    assert.equal((await client.apiDownload("admin/logs/export")).filename, "download");
    assert.equal(calls.length, 3);
    assert.equal(calls[1][0], "http://localhost:4000/v1/auth/refresh");
    assert.equal(calls[2][1].headers.get("Authorization"), "Bearer new");
    assert.equal(calls[0][1].headers.get("X-Request-ID"), calls[2][1].headers.get("X-Request-ID"));
    assert.equal(events.length, 1);
    assert.equal(events[0].retried, true);
});

test("a repeated 401 is not retried again; API errors retain server details", async (t) => {
    const { client, calls, events } = await setup(t, [json({}, 401), json({ accessToken: "new", user: {} }), json({ error: { code: "UNAUTHORIZED", message: "Sesi habis", details: { expired: true } } }, 401)]);
    await assert.rejects(client.apiDownload("/admin/logs/export"), (error) => error instanceof client.ApiError && error.message === "Sesi habis" && error.details.expired);
    assert.equal(calls.length, 3);
    assert.equal(events.length, 1);
    assert.equal(events[0].status, 401);
});

test("failed refresh stops, disabled retry omits refresh", async (t) => {
    const { client, calls } = await setup(t, [json({}, 401), json({}, 401), json({}, 401)]);
    await assert.rejects(client.apiDownload("/export"), { status: 401 });
    assert.equal(calls.length, 2);
    await assert.rejects(client.apiDownload("/export", { retryAuth: false }), { status: 401 });
    assert.equal(calls.length, 3);
});

test("download network errors and non-JSON HTTP errors have correct telemetry", async (t) => {
    const { client, events } = await setup(t, [new Error("offline"), new Response("Bad gateway", { status: 502 })]);
    await assert.rejects(client.apiDownload("/export"), { status: 0, code: "NETWORK_ERROR" });
    await assert.rejects(client.apiDownload("/export"), { status: 502, code: "HTTP_502" });
    assert.deepEqual(events.map((event) => event.status), [0, 502]);
});

test("logout sends current identity without refresh and clears token on failure", async (t) => {
    const { client, calls } = await setup(t, [json({}, 401)]);
    client.setAccessToken("identity");
    await assert.rejects(client.logout(), { status: 401 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1].headers.get("Authorization"), "Bearer identity");
    assert.equal(client.getAccessToken(), null);
});
