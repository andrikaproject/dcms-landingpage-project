// Parser Pine: baris logis dari lexer menjadi AST. Blok ditentukan oleh
// indentasi; `if` dan `switch` bisa dipakai sebagai pernyataan maupun nilai.

import { PineSyntaxError, tokenize } from "./lexer.js";

const ASSIGN_OPS = new Set([":=", "+=", "-=", "*=", "/=", "%="]);
const QUALIFIERS = new Set(["series", "simple", "const", "input"]);
const RESERVED_STATEMENTS = new Set(["if", "for", "while", "switch", "break", "continue", "var", "varip", "type", "method", "import", "export"]);

class TokenStream {
    constructor(tokens, line) {
        this.tokens = tokens;
        this.index = 0;
        this.line = line;
    }

    peek(offset = 0) {
        return this.tokens[this.index + offset];
    }

    next() {
        const token = this.tokens[this.index];
        this.index += 1;
        return token;
    }

    done() {
        return this.index >= this.tokens.length;
    }

    is(type, value, offset = 0) {
        const token = this.peek(offset);
        return Boolean(token) && token.type === type && (value === undefined || token.value === value);
    }

    isOp(value, offset = 0) {
        return this.is("op", value, offset);
    }

    isKeyword(value, offset = 0) {
        return this.is("ident", value, offset);
    }

    expectOp(value) {
        const token = this.peek();
        if (!token || token.type !== "op" || token.value !== value) this.fail(`Diharapkan '${value}'.`, token);
        return this.next();
    }

    expectIdent(message = "Diharapkan nama.") {
        const token = this.peek();
        if (!token || token.type !== "ident") this.fail(message, token);
        return this.next();
    }

    fail(message, token = this.peek()) {
        const last = this.tokens[this.tokens.length - 1];
        const at = token || (last ? { line: last.line, column: last.column + last.length, length: 1 } : { line: this.line, column: 1, length: 1 });
        throw new PineSyntaxError(message, at.line, at.column, at.length || 1);
    }
}

export function parse(source) {
    const lines = tokenize(source);
    let nextId = 1;
    let position = 0;

    function node(type, token, fields) {
        return { type, id: nextId++, line: token?.line ?? 0, column: token?.column ?? 1, ...fields };
    }

    // ----- Ekspresi -----------------------------------------------------------------

    function parseType(stream) {
        const first = stream.expectIdent("Diharapkan nama tipe.");
        let name = first.value;
        while (stream.isOp(".") && stream.is("ident", undefined, 1)) {
            stream.next();
            name += `.${stream.next().value}`;
        }
        const args = [];
        if (stream.isOp("<")) {
            stream.next();
            args.push(parseType(stream));
            while (stream.isOp(",")) {
                stream.next();
                args.push(parseType(stream));
            }
            stream.expectOp(">");
        }
        if (stream.isOp("[") && stream.isOp("]", 1)) {
            stream.next();
            stream.next();
            return { name: "array", args: [{ name, args }] };
        }
        return { name, args };
    }

    function tryParseTypeArgs(stream) {
        const start = stream.index;
        try {
            stream.expectOp("<");
            const args = [parseType(stream)];
            while (stream.isOp(",")) {
                stream.next();
                args.push(parseType(stream));
            }
            stream.expectOp(">");
            if (!stream.isOp("(")) throw new Error("bukan generik");
            return args;
        } catch {
            stream.index = start;
            return null;
        }
    }

    function parseArgs(stream) {
        const args = [];
        stream.expectOp("(");
        while (!stream.isOp(")")) {
            if (stream.done()) stream.fail("Kurung ')' belum ditutup.");
            let name = null;
            if (stream.is("ident") && stream.isOp("=", 1)) {
                name = stream.next().value;
                stream.next();
            }
            args.push({ name, value: parseExpression(stream) });
            if (stream.isOp(",")) stream.next();
            else if (!stream.isOp(")")) stream.fail("Diharapkan ',' atau ')'.");
        }
        stream.expectOp(")");
        return args;
    }

    function parsePrimary(stream) {
        const token = stream.peek();
        if (!token) stream.fail("Ekspresi belum lengkap.");

        if (token.type === "number") {
            stream.next();
            return node("Num", token, { value: token.value, isFloat: token.isFloat });
        }
        if (token.type === "string") {
            stream.next();
            return node("Str", token, { value: token.value });
        }
        if (token.type === "color") {
            stream.next();
            return node("Color", token, { value: token.value });
        }
        if (token.type === "op" && token.value === "(") {
            stream.next();
            const inner = parseExpression(stream);
            stream.expectOp(")");
            return inner;
        }
        if (token.type === "op" && token.value === "[") {
            stream.next();
            const items = [];
            while (!stream.isOp("]")) {
                items.push(parseExpression(stream));
                if (stream.isOp(",")) stream.next();
                else if (!stream.isOp("]")) stream.fail("Diharapkan ',' atau ']'.");
            }
            stream.expectOp("]");
            return node("Tuple", token, { items });
        }
        if (token.type === "ident") {
            if (token.value === "true" || token.value === "false") {
                stream.next();
                return node("Bool", token, { value: token.value === "true" });
            }
            if (token.value === "if" || token.value === "switch") {
                stream.fail(`'${token.value}' sebagai nilai hanya boleh di awal sisi kanan '='.`);
            }
            stream.next();
            return node("Ident", token, { name: token.value });
        }
        stream.fail(`Token '${token.value}' tidak terduga.`);
        return null;
    }

    function parsePostfix(stream) {
        let expr = parsePrimary(stream);
        for (;;) {
            const token = stream.peek();
            if (!token || token.type !== "op") break;
            if (token.value === "(") {
                const args = parseArgs(stream);
                expr = node("Call", token, { callee: expr, args, typeArgs: expr.typeArgs || null, line: expr.line, column: expr.column });
            } else if (token.value === ".") {
                stream.next();
                const property = stream.expectIdent("Diharapkan nama setelah '.'.");
                expr = node("Member", property, { object: expr, property: property.value, line: expr.line, column: expr.column });
                if (property.value === "new" && stream.isOp("<")) {
                    const typeArgs = tryParseTypeArgs(stream);
                    if (typeArgs) expr.typeArgs = typeArgs;
                }
            } else if (token.value === "[") {
                stream.next();
                const index = parseExpression(stream);
                stream.expectOp("]");
                expr = node("History", token, { object: expr, index, line: expr.line, column: expr.column });
            } else {
                break;
            }
        }
        return expr;
    }

    function parseUnary(stream) {
        const token = stream.peek();
        if (token && ((token.type === "op" && (token.value === "-" || token.value === "+")) || (token.type === "ident" && token.value === "not"))) {
            stream.next();
            return node("Unary", token, { op: token.value, argument: parseUnary(stream) });
        }
        return parsePostfix(stream);
    }

    const BINARY_LEVELS = [
        { ops: ["or"], keyword: true },
        { ops: ["and"], keyword: true },
        { ops: ["==", "!="] },
        { ops: ["<", ">", "<=", ">="] },
        { ops: ["+", "-"] },
        { ops: ["*", "/", "%"] },
    ];

    function parseBinary(stream, level) {
        if (level >= BINARY_LEVELS.length) return parseUnary(stream);
        const { ops, keyword } = BINARY_LEVELS[level];
        let left = parseBinary(stream, level + 1);
        for (;;) {
            const token = stream.peek();
            if (!token || !ops.includes(token.value) || (keyword ? token.type !== "ident" : token.type !== "op")) break;
            stream.next();
            const right = parseBinary(stream, level + 1);
            left = node("Binary", token, { op: token.value, left, right, line: left.line, column: left.column });
        }
        return left;
    }

    function parseExpression(stream) {
        const condition = parseBinary(stream, 0);
        if (!stream.isOp("?")) return condition;
        const token = stream.next();
        const consequent = parseExpression(stream);
        stream.expectOp(":");
        const alternate = parseExpression(stream);
        return node("Ternary", token, { test: condition, consequent, alternate, line: condition.line, column: condition.column });
    }

    function parseFullExpression(stream) {
        const expr = parseExpression(stream);
        if (!stream.done()) stream.fail(`Token '${stream.peek().value}' tidak terduga.`);
        return expr;
    }

    // ----- Blok dan pernyataan ------------------------------------------------------

    function current() {
        return lines[position];
    }

    function parseBlock(indent) {
        const statements = [];
        while (position < lines.length) {
            const line = current();
            if (line.indent < indent) break;
            if (line.indent > indent) {
                throw new PineSyntaxError("Indentasi tidak terduga. Baris ini tidak berada di dalam blok apa pun.", line.line, 1, 1);
            }
            statements.push(parseStatement(indent));
        }
        return statements;
    }

    function parseChildBlock(indent, headerToken) {
        if (position >= lines.length || current().indent <= indent) {
            throw new PineSyntaxError("Blok kosong: baris berikutnya harus diindentasi.", headerToken.line, headerToken.column, headerToken.length);
        }
        return parseBlock(indent + 1);
    }

    function parseIf(stream, indent, token) {
        const test = parseFullExpression(stream);
        position += 1;
        const consequent = parseChildBlock(indent, token);
        let alternate = null;
        if (position < lines.length && current().indent === indent && current().tokens[0]?.value === "else" && current().tokens[0].type === "ident") {
            const elseLine = current();
            const elseStream = new TokenStream(elseLine.tokens, elseLine.line);
            const elseToken = elseStream.next();
            if (elseStream.isKeyword("if")) {
                const ifToken = elseStream.next();
                alternate = [parseIf(elseStream, indent, ifToken)];
            } else {
                if (!elseStream.done()) elseStream.fail("'else' harus berdiri sendiri di barisnya.");
                position += 1;
                alternate = parseChildBlock(indent, elseToken);
            }
        }
        return node("If", token, { test, consequent, alternate });
    }

    function parseSwitch(stream, indent, token) {
        const discriminant = stream.done() ? null : parseFullExpression(stream);
        position += 1;
        if (position >= lines.length || current().indent <= indent) {
            throw new PineSyntaxError("switch membutuhkan minimal satu cabang.", token.line, token.column, token.length);
        }
        const cases = [];
        const armIndent = indent + 1;
        while (position < lines.length && current().indent === armIndent) {
            const armLine = current();
            const arm = new TokenStream(armLine.tokens, armLine.line);
            let test = null;
            if (!arm.isOp("=>")) {
                const start = arm.index;
                let depth = 0;
                let arrow = -1;
                for (let cursor = start; cursor < arm.tokens.length; cursor += 1) {
                    const value = arm.tokens[cursor].value;
                    if (value === "(" || value === "[") depth += 1;
                    if (value === ")" || value === "]") depth -= 1;
                    if (value === "=>" && depth === 0) {
                        arrow = cursor;
                        break;
                    }
                }
                if (arrow === -1) arm.fail("Cabang switch harus berbentuk 'nilai => hasil'.");
                test = parseFullExpression(new TokenStream(arm.tokens.slice(start, arrow), armLine.line));
                arm.index = arrow;
            }
            const arrowToken = arm.expectOp("=>");
            let body;
            if (arm.done()) {
                position += 1;
                body = parseChildBlock(armIndent, arrowToken);
            } else {
                body = [node("ExprStmt", arrowToken, { expression: parseFullExpression(arm) })];
                position += 1;
            }
            cases.push({ test, body });
        }
        return node("Switch", token, { discriminant, cases });
    }

    // Sisi kanan '=' boleh berupa `if`/`switch` yang bloknya ada di baris berikutnya.
    function parseValue(stream, indent) {
        if (stream.isKeyword("if")) return { value: parseIf(stream, indent, stream.next()), consumed: true };
        if (stream.isKeyword("switch")) return { value: parseSwitch(stream, indent, stream.next()), consumed: true };
        return { value: parseFullExpression(stream), consumed: false };
    }

    function isFunctionDefinition(stream) {
        if (!stream.is("ident") || !stream.isOp("(", 1)) return false;
        let depth = 0;
        for (let cursor = stream.index + 1; cursor < stream.tokens.length; cursor += 1) {
            const value = stream.tokens[cursor].value;
            if (value === "(") depth += 1;
            if (value === ")") {
                depth -= 1;
                if (depth === 0) return stream.tokens[cursor + 1]?.value === "=>";
            }
        }
        return false;
    }

    function parseParams(stream) {
        stream.expectOp("(");
        const params = [];
        while (!stream.isOp(")")) {
            const parts = [];
            while (!stream.isOp(",") && !stream.isOp(")") && !stream.isOp("=")) {
                if (stream.done()) stream.fail("Parameter belum ditutup.");
                parts.push(stream.next());
            }
            const named = parts.filter((part) => part.type === "ident" && !QUALIFIERS.has(part.value));
            const nameToken = named[named.length - 1];
            if (!nameToken) stream.fail("Diharapkan nama parameter.");
            const typeName = named.length > 1 ? named[0].value : null;
            let defaultValue = null;
            if (stream.isOp("=")) {
                stream.next();
                defaultValue = parseExpression(stream);
            }
            params.push({ name: nameToken.value, typeName, default: defaultValue, id: nextId++, line: nameToken.line, column: nameToken.column });
            if (stream.isOp(",")) stream.next();
        }
        stream.expectOp(")");
        return params;
    }

    function parseFunction(stream, indent, isMethod) {
        const nameToken = stream.expectIdent("Diharapkan nama fungsi.");
        const params = parseParams(stream);
        const arrow = stream.expectOp("=>");
        let body;
        if (stream.done()) {
            position += 1;
            body = parseChildBlock(indent, arrow);
        } else {
            body = [node("ExprStmt", arrow, { expression: parseFullExpression(stream) })];
            position += 1;
        }
        return node("FunctionDef", nameToken, { name: nameToken.value, params, body, isMethod });
    }

    function parseTypeDef(stream, indent, token) {
        const nameToken = stream.expectIdent("Diharapkan nama tipe.");
        if (!stream.done()) stream.fail("Definisi type hanya berisi nama.");
        position += 1;
        const fields = [];
        if (position >= lines.length || current().indent <= indent) {
            throw new PineSyntaxError("type membutuhkan minimal satu field.", token.line, token.column, token.length);
        }
        while (position < lines.length && current().indent === indent + 1) {
            const fieldLine = current();
            const fieldStream = new TokenStream(fieldLine.tokens, fieldLine.line);
            if (fieldStream.isKeyword("varip")) fieldStream.next();
            const fieldType = parseType(fieldStream);
            const fieldName = fieldStream.expectIdent("Diharapkan nama field.");
            let defaultValue = null;
            if (fieldStream.isOp("=")) {
                fieldStream.next();
                defaultValue = parseFullExpression(fieldStream);
            } else if (!fieldStream.done()) {
                fieldStream.fail("Field type berbentuk 'tipe nama' atau 'tipe nama = nilai'.");
            }
            fields.push({ name: fieldName.value, fieldType, default: defaultValue });
            position += 1;
        }
        return node("TypeDef", nameToken, { name: nameToken.value, fields });
    }

    function parseFor(stream, indent, token) {
        if (stream.isOp("[")) {
            stream.next();
            const names = [stream.expectIdent().value];
            while (stream.isOp(",")) {
                stream.next();
                names.push(stream.expectIdent().value);
            }
            stream.expectOp("]");
            if (!stream.isKeyword("in")) stream.fail("Diharapkan 'in'.");
            stream.next();
            const iterable = parseFullExpression(stream);
            position += 1;
            return node("ForIn", token, { names, iterable, body: parseChildBlock(indent, token) });
        }
        const variable = stream.expectIdent("Diharapkan nama variabel loop.");
        if (stream.isKeyword("in")) {
            stream.next();
            const iterable = parseFullExpression(stream);
            position += 1;
            return node("ForIn", token, { names: [variable.value], iterable, body: parseChildBlock(indent, token) });
        }
        stream.expectOp("=");
        const from = parseExpression(stream);
        if (!stream.isKeyword("to")) stream.fail("Diharapkan 'to'.");
        stream.next();
        const to = parseExpression(stream);
        let step = null;
        if (stream.isKeyword("by")) {
            stream.next();
            step = parseExpression(stream);
        }
        if (!stream.done()) stream.fail(`Token '${stream.peek().value}' tidak terduga.`);
        position += 1;
        return node("For", token, { variable: variable.value, from, to, step, body: parseChildBlock(indent, token), varId: nextId++ });
    }

    // Deklarasi bertipe: `float x = …`, `array<float> a = …`, `chart.point p = …`.
    function tryTypedDeclaration(stream) {
        const start = stream.index;
        try {
            const declaredType = parseType(stream);
            if (stream.is("ident") && stream.isOp("=", 1)) return declaredType;
        } catch {
            // bukan deklarasi bertipe
        }
        stream.index = start;
        return null;
    }

    function parseStatement(indent) {
        const line = current();
        const stream = new TokenStream(line.tokens, line.line);
        const first = stream.peek();

        if (first.type === "ident" && RESERVED_STATEMENTS.has(first.value)) {
            switch (first.value) {
                case "if":
                    stream.next();
                    return parseIf(stream, indent, first);
                case "switch":
                    stream.next();
                    return parseSwitch(stream, indent, first);
                case "for":
                    stream.next();
                    return parseFor(stream, indent, first);
                case "while": {
                    stream.next();
                    const test = parseFullExpression(stream);
                    position += 1;
                    return node("While", first, { test, body: parseChildBlock(indent, first) });
                }
                case "break":
                case "continue":
                    stream.next();
                    if (!stream.done()) stream.fail(`'${first.value}' harus berdiri sendiri.`);
                    position += 1;
                    return node(first.value === "break" ? "Break" : "Continue", first, {});
                case "type":
                    if (stream.is("ident", undefined, 1) && stream.tokens.length === 2) {
                        stream.next();
                        return parseTypeDef(stream, indent, first);
                    }
                    break;
                case "method":
                    stream.next();
                    return parseFunction(stream, indent, true);
                case "import":
                    stream.fail("import library belum didukung.");
                    break;
                case "export":
                    stream.next();
                    break;
                default:
                    break;
            }
        }

        if (isFunctionDefinition(stream)) return parseFunction(stream, indent, false);

        let mode = null;
        if (stream.isKeyword("var") || stream.isKeyword("varip")) mode = stream.next().value;

        if (stream.isOp("[")) {
            let depth = 0;
            let close = -1;
            for (let cursor = stream.index; cursor < stream.tokens.length; cursor += 1) {
                const value = stream.tokens[cursor].value;
                if (value === "[") depth += 1;
                if (value === "]") {
                    depth -= 1;
                    if (depth === 0) {
                        close = cursor;
                        break;
                    }
                }
            }
            if (close !== -1 && stream.tokens[close + 1]?.value === "=") {
                const open = stream.next();
                const names = [];
                while (!stream.isOp("]")) {
                    const name = stream.expectIdent("Diharapkan nama variabel.");
                    names.push({ name: name.value, id: nextId++ });
                    if (stream.isOp(",")) stream.next();
                }
                stream.expectOp("]");
                stream.expectOp("=");
                const { value, consumed } = parseValue(stream, indent);
                if (!consumed) position += 1;
                return node("TupleDecl", open, { names, init: value });
            }
        }

        const declaredType = tryTypedDeclaration(stream);
        if (declaredType || (stream.is("ident") && stream.isOp("=", 1))) {
            const nameToken = stream.next();
            stream.expectOp("=");
            const { value, consumed } = parseValue(stream, indent);
            if (!consumed) position += 1;
            return node("Decl", nameToken, { name: nameToken.value, mode, declaredType, init: value });
        }
        if (mode) stream.fail(`Diharapkan nama variabel setelah '${mode}'.`);

        const target = parseExpression(stream);
        if (!stream.done() && ASSIGN_OPS.has(stream.peek().value)) {
            const opToken = stream.next();
            if (target.type !== "Ident" && target.type !== "Member") {
                throw new PineSyntaxError("Sisi kiri ':=' harus nama variabel atau field.", opToken.line, opToken.column, opToken.length);
            }
            const { value, consumed } = parseValue(stream, indent);
            if (!consumed) position += 1;
            return node("Assign", opToken, { target, op: opToken.value, value, line: target.line, column: target.column });
        }
        if (!stream.done()) stream.fail(`Token '${stream.peek().value}' tidak terduga.`);
        position += 1;
        return node("ExprStmt", first, { expression: target });
    }

    const body = parseBlock(0);
    return { type: "Program", body, nodeCount: nextId };
}
