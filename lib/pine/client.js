"use client";

import { runScript } from "./index.js";

// Satu worker dipakai bergantian oleh semua indikator di halaman. Bila Worker
// tidak tersedia, engine dijalankan langsung di thread utama.
let worker = null;
let nextId = 1;
const pending = new Map();

function ensureWorker() {
    if (worker || typeof Worker === "undefined") return worker;
    try {
        worker = new Worker(new URL("./worker.js", import.meta.url));
        worker.onmessage = (event) => {
            const { id, result } = event.data || {};
            const entry = pending.get(id);
            if (!entry) return;
            pending.delete(id);
            entry.resolve(result);
        };
        worker.onerror = (event) => {
            for (const entry of pending.values()) {
                entry.resolve({ ok: false, errors: [{ kind: "internal", message: `Worker berhenti: ${event.message || "tidak diketahui"}`, line: 0, column: 1, length: 1, fix: null }] });
            }
            pending.clear();
            worker?.terminate();
            worker = null;
        };
    } catch {
        worker = null;
    }
    return worker;
}

export function runPine(source, options) {
    const target = ensureWorker();
    if (!target) return Promise.resolve(runScript(source, options));
    const id = nextId++;
    return new Promise((resolve) => {
        pending.set(id, { resolve });
        target.postMessage({ id, source, options });
    });
}
