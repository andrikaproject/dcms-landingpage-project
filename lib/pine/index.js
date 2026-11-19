// API publik engine Pine DCMS: kompilasi (sintaks + cek nama) lalu eksekusi.

import { checkProgram, staticMeta } from "./analysis.js";
import { compileProgram, runProgram } from "./interpreter.js";
import { PineSyntaxError } from "./lexer.js";
import { parse } from "./parser.js";
import { PineRuntimeError } from "./runtime/values.js";

export const MAX_BARS = 5000;
export const DEFAULT_TIMEOUT_MS = 10_000;

export function compileScript(source) {
    let ast;
    try {
        ast = parse(source);
    } catch (error) {
        if (error instanceof PineSyntaxError) {
            return { ok: false, errors: [{ kind: "syntax", message: error.message, line: error.line, column: error.column, length: error.length, fix: null }], meta: null };
        }
        throw error;
    }

    const meta = staticMeta(ast);
    const errors = checkProgram(ast);
    if (!meta.hasIndicatorCall) {
        errors.unshift({ kind: "compile", message: "Script harus diawali indicator(\"Nama\", overlay=…).", line: 1, column: 1, length: 1, fix: null });
    }
    if (errors.length) return { ok: false, errors, meta };

    try {
        return { ok: true, errors: [], meta, program: compileProgram(ast) };
    } catch (error) {
        if (error instanceof PineRuntimeError || error instanceof PineSyntaxError) {
            return { ok: false, errors: [{ kind: "compile", message: error.message, line: error.line, column: error.column, length: 1, fix: null }], meta };
        }
        throw error;
    }
}

export function runScript(source, { bars, inputs = {}, timeframe = "5m", symbol = "", mintick, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const compiled = compileScript(source);
    if (!compiled.ok) return { ok: false, errors: compiled.errors, meta: compiled.meta };

    const limited = bars.length > MAX_BARS ? bars.slice(bars.length - MAX_BARS) : bars;
    try {
        const output = runProgram(compiled.program, { bars: limited, inputs, timeframe, symbol, mintick, timeoutMs });
        return { ok: true, errors: [], meta: compiled.meta, output };
    } catch (error) {
        if (error instanceof PineRuntimeError) {
            return { ok: false, meta: compiled.meta, errors: [{ kind: "runtime", message: error.message, line: error.line, column: error.column, length: 1, fix: null }] };
        }
        if (error?.name === "PineTimeoutError") {
            return { ok: false, meta: compiled.meta, errors: [{ kind: "timeout", message: error.message, line: 0, column: 1, length: 1, fix: null }] };
        }
        throw error;
    }
}

// Tick harga ditebak dari jumlah desimal harga candle bila bursa tidak memberi.
export function inferMintick(bars) {
    let decimals = 0;
    for (const bar of bars.slice(-50)) {
        for (const value of [bar.open, bar.high, bar.low, bar.close]) {
            const text = String(value);
            const part = text.includes("e-") ? Number(text.split("e-")[1]) + (text.split("e-")[0].split(".")[1] || "").length : (text.split(".")[1] || "").length;
            decimals = Math.max(decimals, part);
        }
    }
    return 10 ** -Math.min(decimals, 10);
}
