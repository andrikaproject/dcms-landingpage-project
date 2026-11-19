import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiOrigin } from "../../lib/api/proxy-origin.js";

test("override server-side menuju backend lokal pada environment apa pun", () => {
    assert.equal(resolveApiOrigin("http://127.0.0.1:4000", "development"), "http://127.0.0.1:4000");
    assert.equal(resolveApiOrigin("http://localhost:4000/", "production"), "http://localhost:4000");
    assert.equal(resolveApiOrigin("  https://staging-api.example.test  ", "production"), "https://staging-api.example.test");
});

test("production tanpa override tetap memakai origin API production", () => {
    assert.equal(resolveApiOrigin(undefined, "production"), "https://dcms-api.my.id");
    assert.equal(resolveApiOrigin("", "production"), "https://dcms-api.my.id");
});

test("development dan test tanpa override memakai backend lokal", () => {
    assert.equal(resolveApiOrigin(undefined, "development"), "http://127.0.0.1:4000");
    assert.equal(resolveApiOrigin(undefined, "test"), "http://127.0.0.1:4000");
    assert.equal(resolveApiOrigin(undefined, undefined), "http://127.0.0.1:4000");
});

test("nilai yang bukan origin HTTP ditolak", () => {
    for (const value of [
        "ftp://127.0.0.1:4000",
        "http://127.0.0.1:4000/v1",
        "http://user:secret@127.0.0.1:4000",
        "http://127.0.0.1:4000/?debug=1",
        "http://127.0.0.1:4000/#x",
        "javascript:alert(1)",
    ]) {
        assert.throws(() => resolveApiOrigin(value, "development"), /API_UPSTREAM_ORIGIN/, value);
    }
    assert.throws(() => resolveApiOrigin("bukan url", "development"), TypeError);
});
