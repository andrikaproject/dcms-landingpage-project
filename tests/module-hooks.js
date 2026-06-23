import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

export function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
        const relativePath = specifier.slice(2);
        let absolutePath = path.join(ROOT, relativePath);

        // Tambahkan .js jika file tidak punya extension dan tanpa .js tidak ditemukan
        if (!path.extname(absolutePath) && !fs.existsSync(absolutePath)) {
            absolutePath += ".js";
        }

        return nextResolve(absolutePath, context);
    }
    return nextResolve(specifier, context);
}
