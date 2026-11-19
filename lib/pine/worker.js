// Web Worker untuk engine Pine: script berat tidak membekukan halaman.
import { runScript } from "./index.js";

self.onmessage = (event) => {
    const { id, source, options } = event.data || {};
    try {
        const result = runScript(source, options);
        self.postMessage({ id, result });
    } catch (error) {
        self.postMessage({
            id,
            result: { ok: false, errors: [{ kind: "internal", message: `Engine gagal: ${error?.message || error}`, line: 0, column: 1, length: 1, fix: null }] },
        });
    }
};
