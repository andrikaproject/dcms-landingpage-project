// Lexer Pine: memecah sumber menjadi baris logis berisi token, lengkap dengan
// indentasi. Struktur blok ditentukan parser dari indentasi ini.

export class PineSyntaxError extends Error {
    constructor(message, line, column = 1, length = 1) {
        super(message);
        this.name = "PineSyntaxError";
        this.line = line;
        this.column = column;
        this.length = length;
    }
}

const OPERATORS = [":=", "=>", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "?", ":", "+", "-", "*", "/", "%", "<", ">", "=", "(", ")", "[", "]", ",", "."];
const TAB_WIDTH = 4;

function isIdentStart(char) {
    return /[A-Za-z_]/.test(char);
}

function isIdentPart(char) {
    return /[A-Za-z0-9_]/.test(char);
}

function measureIndent(text) {
    let width = 0;
    let index = 0;
    for (; index < text.length; index += 1) {
        if (text[index] === " ") width += 1;
        else if (text[index] === "\t") width += TAB_WIDTH;
        else break;
    }
    return { width, offset: index };
}

// Mengembalikan token satu baris fisik dan kedalaman kurung yang masih terbuka.
function tokenizeLine(text, lineNumber, startOffset, depth) {
    const tokens = [];
    let index = startOffset;
    let parenDepth = depth;

    while (index < text.length) {
        const char = text[index];
        const column = index + 1;

        if (char === " " || char === "\t" || char === "\r") {
            index += 1;
            continue;
        }
        if (char === "/" && text[index + 1] === "/") break;

        if (char === "\"" || char === "'") {
            let value = "";
            let cursor = index + 1;
            let closed = false;
            while (cursor < text.length) {
                const next = text[cursor];
                if (next === "\\") {
                    const escaped = text[cursor + 1];
                    value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped ?? "";
                    cursor += 2;
                    continue;
                }
                if (next === char) {
                    closed = true;
                    break;
                }
                value += next;
                cursor += 1;
            }
            if (!closed) throw new PineSyntaxError("String belum ditutup tanda kutip.", lineNumber, column, text.length - index);
            tokens.push({ type: "string", value, line: lineNumber, column, length: cursor - index + 1 });
            index = cursor + 1;
            continue;
        }

        if (char === "#" && /[0-9A-Fa-f]/.test(text[index + 1] || "")) {
            const match = /^#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})/.exec(text.slice(index));
            if (!match) throw new PineSyntaxError("Format warna harus #RRGGBB atau #RRGGBBAA.", lineNumber, column, 7);
            tokens.push({ type: "color", value: match[0], line: lineNumber, column, length: match[0].length });
            index += match[0].length;
            continue;
        }

        if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(text[index + 1] || ""))) {
            const match = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(text.slice(index));
            const raw = match[0];
            tokens.push({ type: "number", value: Number(raw), isFloat: /[.eE]/.test(raw), line: lineNumber, column, length: raw.length });
            index += raw.length;
            continue;
        }

        if (isIdentStart(char)) {
            let cursor = index + 1;
            while (cursor < text.length && isIdentPart(text[cursor])) cursor += 1;
            const value = text.slice(index, cursor);
            tokens.push({ type: "ident", value, line: lineNumber, column, length: value.length });
            index = cursor;
            continue;
        }

        const operator = OPERATORS.find((candidate) => text.startsWith(candidate, index));
        if (!operator) throw new PineSyntaxError(`Karakter '${char}' tidak dikenal.`, lineNumber, column);
        if (operator === "(" || operator === "[") parenDepth += 1;
        if (operator === ")" || operator === "]") parenDepth = Math.max(0, parenDepth - 1);
        tokens.push({ type: "op", value: operator, line: lineNumber, column, length: operator.length });
        index += operator.length;
    }

    return { tokens, depth: parenDepth };
}

// Baris logis: satu pernyataan beserta indentasinya. Baris yang dilanjutkan
// (kurung masih terbuka, atau indentasi bukan kelipatan 4) digabung ke baris
// sebelumnya seperti aturan line wrapping Pine.
export function tokenize(source) {
    const physical = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
    const lines = [];
    let current = null;
    let depth = 0;

    physical.forEach((text, index) => {
        const lineNumber = index + 1;
        const { width, offset } = measureIndent(text);
        const content = text.slice(offset);
        if (content === "" || content.startsWith("//")) return;

        const continues = current && (depth > 0 || (width % TAB_WIDTH !== 0 && width > current.indent));
        const { tokens, depth: nextDepth } = tokenizeLine(text, lineNumber, offset, continues ? depth : 0);
        if (!tokens.length) return;

        if (continues) {
            current.tokens.push(...tokens);
        } else {
            if (width % TAB_WIDTH !== 0) {
                throw new PineSyntaxError("Indentasi harus kelipatan 4 spasi atau satu tab.", lineNumber, 1, offset);
            }
            current = { indent: width / TAB_WIDTH, tokens, line: lineNumber };
            lines.push(current);
        }
        depth = nextDepth;
    });

    return lines;
}
