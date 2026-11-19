// Hook modul Node untuk tes komponen: memetakan alias "@/" ke root project,
// melengkapi ekstensi import tanpa ekstensi, dan mentranspilasi .jsx/.ts dengan
// compiler TypeScript milik project. Tidak dipakai oleh build aplikasi.
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
const TRANSPILE = new Set([".jsx", ".ts", ".tsx"]);

function probe(basePath) {
    if (existsSync(basePath) && statSync(basePath).isFile()) return basePath;
    for (const extension of EXTENSIONS) {
        if (existsSync(basePath + extension)) return basePath + extension;
    }
    for (const extension of EXTENSIONS) {
        const indexPath = path.join(basePath, `index${extension}`);
        if (existsSync(indexPath)) return indexPath;
    }
    return null;
}

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith("@/")) {
            const found = probe(path.join(root, specifier.slice(2)));
            if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
        }
        if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
            const found = probe(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
            if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.startsWith("file:") && TRANSPILE.has(path.extname(fileURLToPath(url)))) {
            const fileName = fileURLToPath(url);
            const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
                fileName,
                compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
            });
            return { format: "module", source: outputText, shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});
