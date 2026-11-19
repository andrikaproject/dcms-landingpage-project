// Cek kompilasi statis: fungsi, konstanta, dan variabel yang tidak dikenal
// ditolak sebelum script dijalankan, lengkap dengan saran perbaikan.

import { CONSTANT_NAMES, FUNCTIONS, NAMESPACES, suggestName, UNSUPPORTED, VARIABLES } from "./registry.js";

const CASTS = new Set(["label", "line", "box", "polyline"]);
const KNOWN_GLOBALS = new Set(Object.keys(VARIABLES).filter((name) => !name.includes(".")));

function walk(node, visit, parent = null) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        node.forEach((child) => walk(child, visit, parent));
        return;
    }
    if (node.type) visit(node, parent);
    for (const [key, value] of Object.entries(node)) {
        if (key === "type" || key === "id" || key === "line" || key === "column") continue;
        if (value && typeof value === "object") walk(value, visit, node.type ? node : parent);
    }
}

function staticPath(node) {
    const parts = [];
    let current = node;
    while (current.type === "Member") {
        parts.unshift(current.property);
        current = current.object;
    }
    if (current.type !== "Ident") return null;
    parts.unshift(current.name);
    return { root: current.name, full: parts.join("."), rootNode: current };
}

function unsupportedMessage(path) {
    const match = Object.keys(UNSUPPORTED).find((prefix) => path === prefix || path.startsWith(`${prefix}.`));
    return match ? UNSUPPORTED[match] : null;
}

export function checkProgram(ast) {
    const declared = new Set();
    const userFunctions = new Set();
    const userTypes = new Set();

    walk(ast.body, (node) => {
        if (node.type === "Decl") declared.add(node.name);
        if (node.type === "TupleDecl") node.names.forEach((entry) => declared.add(entry.name));
        if (node.type === "For") declared.add(node.variable);
        if (node.type === "ForIn") node.names.forEach((name) => declared.add(name));
        if (node.type === "FunctionDef") {
            if (node.isMethod) declared.add(node.name);
            else userFunctions.add(node.name);
            node.params.forEach((param) => declared.add(param.name));
        }
        if (node.type === "TypeDef") userTypes.add(node.name);
    });

    const errors = [];
    const report = (node, message, length, replacement = null) => {
        errors.push({
            kind: "compile",
            message,
            line: node.line,
            column: node.column,
            length: Math.max(1, length),
            fix: replacement ? { replacement, label: `Ganti ke ${replacement}` } : null,
        });
    };
    const callableNames = [...Object.keys(FUNCTIONS).filter((name) => !name.includes(".")), ...userFunctions, ...CASTS];
    const isDeclaredRoot = (name) => declared.has(name) || userTypes.has(name) || userFunctions.has(name);
    const memberRoots = new Set();

    walk(ast.body, (node) => {
        if (node.type === "Call" && node.callee.type === "Member") {
            const path = staticPath(node.callee);
            if (path) memberRoots.add(path.rootNode);
        }
        if (node.type === "Member") {
            const path = staticPath(node);
            if (path) memberRoots.add(path.rootNode);
        }
    });

    walk(ast.body, (node, parent) => {
        if (node.type === "Call") {
            const callee = node.callee;
            if (callee.type === "Ident") {
                const name = callee.name;
                if (userFunctions.has(name) || FUNCTIONS[name] || CASTS.has(name)) return;
                const suggestion = suggestName(name, callableNames);
                report(callee, `Fungsi '${name}' tidak dikenal${suggestion ? `. Maksud kamu ${suggestion}?` : "."}`, name.length, suggestion);
                return;
            }
            const path = callee.type === "Member" ? staticPath(callee) : null;
            if (!path || isDeclaredRoot(path.root)) return;
            if (FUNCTIONS[path.full]) return;
            const typeName = path.full.slice(0, path.full.lastIndexOf("."));
            if (userTypes.has(typeName) && (callee.property === "new" || callee.property === "copy")) return;
            const unsupported = unsupportedMessage(path.full);
            if (unsupported) {
                report(callee, unsupported, path.full.length);
                return;
            }
            const namespace = path.full.split(".")[0];
            const candidates = Object.keys(FUNCTIONS).filter((name) => name.startsWith(`${namespace}.`));
            const suggestion = suggestName(path.full, candidates.length ? candidates : Object.keys(FUNCTIONS));
            report(callee, `Fungsi '${path.full}' tidak dikenal${suggestion ? `. Maksud kamu ${suggestion}?` : "."}`, path.full.length, suggestion);
            return;
        }

        if (node.type === "Member") {
            if (parent?.type === "Member" || (parent?.type === "Call" && parent.callee === node)) return;
            const path = staticPath(node);
            if (!path || isDeclaredRoot(path.root)) return;
            if (CONSTANT_NAMES.has(path.full) || VARIABLES[path.full]) return;
            const unsupported = unsupportedMessage(path.full);
            if (unsupported) {
                report(node, unsupported, path.full.length);
                return;
            }
            const candidates = [...CONSTANT_NAMES, ...Object.keys(VARIABLES).filter((name) => name.includes("."))];
            const suggestion = suggestName(path.full, candidates);
            report(node, `'${path.full}' tidak dikenal${suggestion ? `. Maksud kamu ${suggestion}?` : "."}`, path.full.length, suggestion);
            return;
        }

        if (node.type === "Ident") {
            if (memberRoots.has(node) || (parent?.type === "Call" && parent.callee === node)) return;
            const name = node.name;
            if (name === "na" || declared.has(name) || KNOWN_GLOBALS.has(name) || NAMESPACES.has(name)) return;
            const suggestion = suggestName(name, [...declared, ...KNOWN_GLOBALS]);
            report(node, `Variabel '${name}' belum dideklarasikan${suggestion ? `. Maksud kamu ${suggestion}?` : "."}`, name.length, suggestion);
        }
    });

    const seen = new Set();
    return errors
        .filter((error) => {
            const key = `${error.line}:${error.column}:${error.message}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => a.line - b.line || a.column - b.column);
}

// Judul dan overlay dibaca tanpa menjalankan script, supaya UI tahu sejak awal
// apakah indikator perlu panel sendiri.
export function staticMeta(ast) {
    const call = ast.body.find((statement) => statement.type === "ExprStmt" && statement.expression.type === "Call"
        && statement.expression.callee.type === "Ident" && statement.expression.callee.name === "indicator")?.expression;
    if (!call) return { title: "Indikator", overlay: false, hasIndicatorCall: false };
    const positional = call.args.filter((arg) => !arg.name);
    const named = Object.fromEntries(call.args.filter((arg) => arg.name).map((arg) => [arg.name, arg.value]));
    const titleNode = named.title || positional[0]?.value;
    const overlayNode = named.overlay || positional[2]?.value;
    return {
        title: titleNode?.type === "Str" ? titleNode.value : "Indikator",
        overlay: overlayNode?.type === "Bool" ? overlayNode.value : false,
        hasIndicatorCall: true,
    };
}
