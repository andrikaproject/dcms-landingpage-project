import assert from "node:assert/strict";
import test from "node:test";
import { MAX_UPLOAD_BYTES, UploadError, finalizeUpload, putUploadFile, uploadImage, validateImageFile } from "../../lib/ebooks/upload.js";

// Fixture pengujian: URL storage dan asset ID sintetis.
const INIT = { assetId: "asset-1", uploadUrl: "https://storage.example.test/ebooks/tmp/asset-1?X-Amz-Signature=abc", headers: { "Content-Type": "image/png" }, expiresAt: "2026-09-22T10:05:00.000Z" };

function imageFile(type = "image/png", size = 1024) {
    return new File([new Uint8Array(size)], "cover.png", { type });
}

function fakeApi({ init = INIT, complete = [{ asset: { assetId: "asset-1", status: "READY" }, reused: false }] } = {}) {
    const calls = { start: [], complete: [] };
    return {
        calls,
        startUpload: async (body, options) => {
            calls.start.push({ body, options });
            if (init instanceof Error) throw init;
            return init;
        },
        completeUpload: async (assetId, options) => {
            calls.complete.push({ assetId, options });
            const next = complete.shift();
            if (next instanceof Error) throw next;
            return next;
        },
    };
}

test("PUT storage memakai raw File, header dari init saja, dan tanpa cookie", async (t) => {
    const requests = [];
    t.mock.method(globalThis, "fetch", async (url, init) => {
        requests.push({ url, init });
        return new Response(null, { status: 200 });
    });
    const file = imageFile();
    const api = fakeApi();
    const result = await uploadImage(file, { purpose: "COVER", api });

    assert.equal(result.assetId, "asset-1");
    assert.equal(requests.length, 1, "Hanya satu request ke storage; init/complete lewat api");
    assert.equal(requests[0].url, INIT.uploadUrl);
    assert.equal(requests[0].init.method, "PUT");
    assert.equal(requests[0].init.credentials, "omit");
    assert.equal(requests[0].init.body, file);
    assert.deepEqual(requests[0].init.headers, { "Content-Type": "image/png" });
    assert.equal(Object.keys(requests[0].init.headers).some((name) => name.toLowerCase() === "authorization"), false);
    assert.deepEqual(api.calls.start[0].body, { purpose: "COVER", filename: "cover.png", contentType: "image/png", sizeBytes: 1024 });
    assert.deepEqual(api.calls.complete.map((call) => call.assetId), ["asset-1"]);
});

test("kegagalan PUT tidak memanggil finalisasi", async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response("denied", { status: 403 }));
    const api = fakeApi();
    await assert.rejects(uploadImage(imageFile(), { purpose: "LESSON_IMAGE", api }), (error) => error instanceof UploadError && error.stage === "put" && error.assetId === "asset-1");
    assert.equal(api.calls.complete.length, 0);
});

test("kegagalan jaringan PUT juga tidak memanggil finalisasi", async (t) => {
    t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
    const api = fakeApi();
    await assert.rejects(uploadImage(imageFile(), { purpose: "COVER", api }), /Upload gambar gagal/);
    assert.equal(api.calls.complete.length, 0);
});

test("kegagalan finalisasi dapat dicoba ulang tanpa upload ulang", async (t) => {
    const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 200 }));
    const serverError = Object.assign(new Error("Server error"), { status: 500, code: "HTTP_500" });
    const api = fakeApi({ complete: [serverError, { asset: { assetId: "asset-1", status: "READY" }, reused: true }] });

    let failure;
    await uploadImage(imageFile(), { purpose: "COVER", api }).catch((error) => { failure = error; });
    assert.ok(failure instanceof UploadError);
    assert.equal(failure.stage, "complete");
    assert.equal(failure.assetId, "asset-1");

    const asset = await finalizeUpload(api, failure.assetId);
    assert.equal(asset.status, "READY");
    assert.equal(fetchMock.mock.callCount(), 1, "Berkas tidak diunggah ulang saat retry finalisasi");
    assert.equal(api.calls.complete.length, 2);
});

test("finalisasi yang belum READY tidak dianggap sukses", async () => {
    const api = fakeApi({ complete: [{ asset: { assetId: "asset-1", status: "PROCESSING" } }] });
    await assert.rejects(finalizeUpload(api, "asset-1"), (error) => error.stage === "complete");
});

test("abort menghentikan upload tanpa finalisasi dan tanpa menyentuh draft", async (t) => {
    const draft = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Isi draft" }] }] };
    const snapshot = structuredClone(draft);
    const controller = new AbortController();
    t.mock.method(globalThis, "fetch", (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")));
    }));
    const api = fakeApi();
    const stages = [];
    const pending = uploadImage(imageFile(), { purpose: "LESSON_IMAGE", api, signal: controller.signal, onStage: (stage) => stages.push(stage) });
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();

    await assert.rejects(pending, (error) => error.name === "AbortError");
    assert.equal(api.calls.complete.length, 0);
    assert.deepEqual(stages, ["preparing", "uploading"]);
    assert.deepEqual(draft, snapshot);
});

test("validasi lokal menolak tipe dan ukuran di luar kontrak sebelum init", async () => {
    assert.match(validateImageFile(imageFile("image/gif")), /JPEG, PNG, atau WebP/);
    assert.match(validateImageFile({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 }), /10 MiB/);
    assert.match(validateImageFile({ type: "image/png", size: 0 }), /kosong/);
    assert.equal(validateImageFile(imageFile("image/webp")), null);

    const api = fakeApi();
    await assert.rejects(uploadImage(imageFile("image/svg+xml"), { purpose: "COVER", api }), (error) => error.stage === "validate");
    assert.equal(api.calls.start.length, 0);
});

test("storage belum dikonfigurasi (503) ditampilkan sebagai pesan jelas", async () => {
    const api = fakeApi({ init: Object.assign(new Error("Storage off"), { status: 503, code: "MEDIA_STORAGE_UNAVAILABLE" }) });
    await assert.rejects(uploadImage(imageFile(), { purpose: "COVER", api }), (error) => error.stage === "init" && /belum dikonfigurasi/.test(error.message));
});

test("putUploadFile melempar ketika storage menolak", async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 400 }));
    await assert.rejects(putUploadFile(INIT, imageFile()), /Upload gambar gagal/);
});
