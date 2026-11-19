// Interpreter Pine: AST dikompilasi menjadi closure lalu dijalankan bar demi
// bar. Setiap titik panggil fungsi buatan punya frame sendiri, sehingga `var`,
// state ta.*, dan riwayat parameter terpisah per pemanggil seperti di Pine.

import { ARRAY_FUNCTIONS, MAP_FUNCTIONS, newArray, PineArray, PineMap } from "./runtime/collections.js";
import { ChartPoint, createDrawingFunctions, Drawing, DrawingStore, MAX_LIMITS } from "./runtime/drawings.js";
import { createTa, precomputeSeries } from "./runtime/ta.js";
import {
    CHART_BG, CHART_FG, colorFromGradient, colorNew, colorRgb, colorToCss, isColor, isNa, NA, NAMED_COLORS, nz,
    parseHexColor, PineRuntimeError, toBool,
} from "./runtime/values.js";
import { CONSTANT_NAMES, DISPLAY_FLAGS, enumValue, FUNCTIONS } from "./registry.js";

const BREAK = 1;
const CONTINUE = 2;
const SOURCE_NAMES = new Set(["open", "high", "low", "close", "volume", "hl2", "hlc3", "ohlc4", "hlcc4"]);
const MAX_CALL_DEPTH = 200;
const TICK_CHECK_INTERVAL = 4096;

class Var {
    constructor(isVar) {
        this.value = NA;
        this.hist = [];
        this.isVar = isVar;
        this.initialized = false;
    }
}

class Frame {
    constructor() {
        this.vars = new Map();
        this.states = new Map();
        this.children = new Map();
        this.histories = new Map();
    }
}

function lookup(scope, name) {
    for (let current = scope; current; current = current.parent) {
        const found = current.names?.get(name);
        if (found !== undefined) return found;
    }
    return undefined;
}

function declare(scope, name, variable) {
    if (!scope.names) scope.names = new Map();
    scope.names.set(name, variable);
}

function getVar(frame, key, isVar) {
    let variable = frame.vars.get(key);
    if (!variable) {
        variable = new Var(isVar);
        frame.vars.set(key, variable);
    }
    return variable;
}

function readHistory(variable, index) {
    if (index < 0) return NA;
    const value = variable.hist[index];
    if (value !== undefined) return value;
    if (!variable.isVar) return NA;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        if (variable.hist[cursor] !== undefined) return variable.hist[cursor];
    }
    return NA;
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
    return { root: current.name, full: parts.join(".") };
}

function equals(a, b) {
    if (isColor(a) && isColor(b)) return a.r === b.r && a.g === b.g && a.b === b.b && a.t === b.t;
    return a === b;
}

function timeframeSeconds(period) {
    const value = String(period ?? "");
    if (value === "D" || value === "1D") return 86_400;
    if (value === "W" || value === "1W") return 604_800;
    if (value === "M" || value === "1M") return 2_592_000;
    const seconds = /^(\d+)S$/.exec(value);
    if (seconds) return Number(seconds[1]);
    const days = /^(\d+)D$/.exec(value);
    if (days) return Number(days[1]) * 86_400;
    const minutes = Number(value);
    return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : NA;
}

export function pinePeriod(timeframe) {
    const map = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D" };
    return map[timeframe] || "5";
}

function decimalsOf(step) {
    if (!Number.isFinite(step) || step <= 0) return 2;
    const text = step.toExponential();
    const [mantissa, exponent] = text.split("e");
    const mantissaDecimals = (mantissa.split(".")[1] || "").length;
    return Math.max(0, mantissaDecimals - Number(exponent));
}

const CONSTANT_VALUES = new Map();
for (const name of CONSTANT_NAMES) {
    const [namespace, ...rest] = name.split(".");
    const key = rest.join(".");
    if (namespace === "color") CONSTANT_VALUES.set(name, parseHexColor(NAMED_COLORS[key]));
    else if (namespace === "display") CONSTANT_VALUES.set(name, DISPLAY_FLAGS[key]);
    else if (namespace === "math") CONSTANT_VALUES.set(name, { pi: Math.PI, e: Math.E, phi: 1.618033988749895, rphi: 0.618033988749895 }[key]);
    else CONSTANT_VALUES.set(name, enumValue(namespace, key));
}

export function compileProgram(ast) {
    const types = new Map();
    const functions = new Map();
    const methods = new Map();
    const methodsByName = new Map();

    // ----- Ekspresi --------------------------------------------------------------

    function compileArgs(args) {
        const positional = [];
        const named = [];
        for (const arg of args) {
            if (arg.name) named.push({ name: arg.name, fn: compileExpression(arg.value), node: arg.value });
            else positional.push(compileExpression(arg.value));
        }
        return { positional, named };
    }

    function evaluateArgs(compiled, machine) {
        const positional = compiled.positional.map((fn) => fn(machine));
        let named = null;
        if (compiled.named.length) {
            named = {};
            for (const entry of compiled.named) named[entry.name] = entry.fn(machine);
        }
        return { positional, named };
    }

    function orderArgs(params, positional, named) {
        if (!named) return positional;
        const ordered = [...positional];
        params.forEach((param, index) => {
            if (index >= positional.length && Object.prototype.hasOwnProperty.call(named, param)) {
                while (ordered.length < index) ordered.push(undefined);
                ordered[index] = named[param];
            }
        });
        return ordered;
    }

    function asStatementValue(statement) {
        const run = compileStatement(statement);
        return (machine) => {
            run(machine);
            return machine.lastValue;
        };
    }

    function compileExpression(node) {
        switch (node.type) {
            case "Num": {
                const value = node.value;
                return () => value;
            }
            case "Str": {
                const value = node.value;
                return () => value;
            }
            case "Bool": {
                const value = node.value;
                return () => value;
            }
            case "Color": {
                const value = parseHexColor(node.value);
                return () => value;
            }
            case "Tuple": {
                const items = node.items.map(compileExpression);
                return (machine) => items.map((item) => item(machine));
            }
            case "If":
            case "Switch":
                return asStatementValue(node);
            case "Ident": {
                const name = node.name;
                if (name === "na") return () => NA;
                return (machine) => {
                    const variable = lookup(machine.scope, name);
                    if (variable !== undefined) return variable.value;
                    return machine.readGlobal(name);
                };
            }
            case "Member": {
                const path = staticPath(node);
                const object = compileExpression(node.object);
                const property = node.property;
                return (machine) => {
                    if (path && lookup(machine.scope, path.root) === undefined) return machine.readConstant(path.full);
                    return machine.readField(object(machine), property);
                };
            }
            case "History":
                return compileHistory(node);
            case "Unary": {
                const argument = compileExpression(node.argument);
                if (node.op === "not") return (machine) => !toBool(argument(machine));
                if (node.op === "-") return (machine) => {
                    const value = argument(machine);
                    return typeof value === "number" ? -value : NA;
                };
                return argument;
            }
            case "Binary":
                return compileBinary(node);
            case "Ternary": {
                const test = compileExpression(node.test);
                const consequent = compileExpression(node.consequent);
                const alternate = compileExpression(node.alternate);
                return (machine) => (toBool(test(machine)) ? consequent(machine) : alternate(machine));
            }
            case "Call":
                return compileCall(node);
            default:
                throw new PineRuntimeError(`Ekspresi ${node.type} tidak didukung.`, node.line, node.column);
        }
    }

    function compileHistory(node) {
        const index = compileExpression(node.index);
        if (node.object.type === "Ident") {
            const name = node.object.name;
            return (machine) => {
                const offset = index(machine);
                if (isNa(offset)) return NA;
                const steps = Math.trunc(offset);
                const variable = lookup(machine.scope, name);
                if (variable !== undefined) return readHistory(variable, machine.bar - steps);
                return machine.seriesAt(name, steps);
            };
        }
        const inner = compileExpression(node.object);
        const key = node.id;
        return (machine) => {
            let buffer = machine.frame.histories.get(key);
            if (!buffer) {
                buffer = [];
                machine.frame.histories.set(key, buffer);
            }
            buffer[machine.bar] = inner(machine);
            const offset = index(machine);
            if (isNa(offset)) return NA;
            const at = machine.bar - Math.trunc(offset);
            return at < 0 || buffer[at] === undefined ? NA : buffer[at];
        };
    }

    function compileBinary(node) {
        const left = compileExpression(node.left);
        const right = compileExpression(node.right);
        switch (node.op) {
            case "and": return (machine) => toBool(left(machine)) && toBool(right(machine));
            case "or": return (machine) => toBool(left(machine)) || toBool(right(machine));
            case "+": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                if (typeof a === "string" || typeof b === "string") {
                    if (a === null || b === null) return null;
                    return `${typeof a === "number" && Number.isNaN(a) ? "NaN" : a}${typeof b === "number" && Number.isNaN(b) ? "NaN" : b}`;
                }
                if (typeof a !== "number" || typeof b !== "number") return NA;
                return a + b;
            };
            case "-": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                return typeof a === "number" && typeof b === "number" ? a - b : NA;
            };
            case "*": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                return typeof a === "number" && typeof b === "number" ? a * b : NA;
            };
            case "/": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                if (typeof a !== "number" || typeof b !== "number" || b === 0) return NA;
                return a / b;
            };
            case "%": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                if (typeof a !== "number" || typeof b !== "number" || b === 0) return NA;
                return a % b;
            };
            case "<": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                return a !== null && b !== null && a < b;
            };
            case ">": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                return a !== null && b !== null && a > b;
            };
            case "<=": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                return a !== null && b !== null && a <= b;
            };
            case ">=": return (machine) => {
                const a = left(machine);
                const b = right(machine);
                return a !== null && b !== null && a >= b;
            };
            case "==": return (machine) => equals(left(machine), right(machine));
            case "!=": return (machine) => !equals(left(machine), right(machine));
            default:
                throw new PineRuntimeError(`Operator '${node.op}' tidak dikenal.`, node.line, node.column);
        }
    }

    function compileCall(node) {
        const args = compileArgs(node.args);
        const callee = node.callee;

        if (callee.type === "Ident") {
            const name = callee.name;
            const spec = FUNCTIONS[name];
            return (machine) => {
                const userFunction = functions.get(name);
                const values = evaluateArgs(args, machine);
                if (userFunction) return callUser(userFunction, node, machine, values.positional, values.named);
                const builtin = machine.builtins[name];
                if (!builtin) throw new PineRuntimeError(`Fungsi '${name}' tidak dikenal.`);
                return builtin(orderArgs(spec?.params || [], values.positional, values.named), node, values.named);
            };
        }

        if (callee.type === "Member") {
            const path = staticPath(callee);
            const objectFn = compileExpression(callee.object);
            const method = callee.property;
            const spec = path ? FUNCTIONS[path.full] : null;
            return (machine) => {
                const values = evaluateArgs(args, machine);
                if (path && lookup(machine.scope, path.root) === undefined) {
                    const typeName = path.full.slice(0, path.full.lastIndexOf("."));
                    if (types.has(typeName) && (method === "new" || method === "copy")) {
                        return method === "new" ? construct(types.get(typeName), values, machine) : copyObject(values.positional[0]);
                    }
                    const builtin = machine.builtins[path.full];
                    if (!builtin) throw new PineRuntimeError(`Fungsi '${path.full}' tidak dikenal.`);
                    return builtin(orderArgs(spec?.params || [], values.positional, values.named), node, values.named);
                }
                return callMethod(machine, objectFn(machine), method, values, node);
            };
        }

        const calleeFn = compileExpression(callee);
        return (machine) => {
            calleeFn(machine);
            throw new PineRuntimeError("Ekspresi ini tidak bisa dipanggil sebagai fungsi.");
        };
    }

    function construct(type, values, machine) {
        const fields = {};
        type.fields.forEach((field, index) => {
            let value;
            if (index < values.positional.length) value = values.positional[index];
            else if (values.named && Object.prototype.hasOwnProperty.call(values.named, field.name)) value = values.named[field.name];
            else value = field.defaultFn ? field.defaultFn(machine) : field.na;
            fields[field.name] = value;
        });
        return { __udt: type.name, fields };
    }

    function copyObject(value) {
        if (!value || !value.__udt) return value;
        return { __udt: value.__udt, fields: { ...value.fields } };
    }

    function callMethod(machine, object, method, values, node) {
        const prefix = object?.__udt
            ? object.__udt
            : object instanceof PineArray ? "array"
                : object instanceof PineMap ? "map"
                    : object instanceof Drawing ? object.kind
                        : object instanceof ChartPoint ? "chart.point" : null;

        const userMethod = prefix ? methods.get(`${prefix}.${method}`) : null;
        if (userMethod) return callUser(userMethod, node, machine, [object, ...values.positional], values.named);
        if (object?.__udt && method === "copy") return copyObject(object);

        if (prefix && !object?.__udt) {
            const fullName = `${prefix}.${method}`;
            const builtin = machine.builtins[fullName];
            if (builtin) {
                const params = FUNCTIONS[fullName]?.params || [];
                return builtin(orderArgs(params, [object, ...values.positional], values.named), node, values.named);
            }
        }

        const anyMethod = methodsByName.get(method);
        if (anyMethod) return callUser(anyMethod, node, machine, [object, ...values.positional], values.named);
        // Method pada objek na (misalnya polyline yang belum dibuat) tidak berbuat apa-apa.
        if (isNa(object)) return NA;
        throw new PineRuntimeError(`Method '${method}' tidak tersedia untuk nilai ini.`);
    }

    function callUser(definition, node, machine, positional, named) {
        const parentFrame = machine.frame;
        let frame = parentFrame.children.get(node.id);
        if (!frame) {
            frame = new Frame();
            parentFrame.children.set(node.id, frame);
        }
        const scope = { names: new Map(), parent: machine.globalScope };
        definition.params.forEach((param, index) => {
            let value;
            if (index < positional.length) value = positional[index];
            else if (named && Object.prototype.hasOwnProperty.call(named, param.name)) value = named[param.name];
            else value = param.defaultFn ? param.defaultFn(machine) : NA;
            const variable = getVar(frame, param.id, false);
            variable.value = value;
            variable.hist[machine.bar] = value;
            scope.names.set(param.name, variable);
        });

        const savedFrame = machine.frame;
        const savedScope = machine.scope;
        machine.frame = frame;
        machine.scope = scope;
        machine.depth += 1;
        if (machine.depth > MAX_CALL_DEPTH) throw new PineRuntimeError("Rekursi terlalu dalam. Pine tidak mengizinkan fungsi memanggil dirinya sendiri.");
        try {
            machine.lastValue = NA;
            executeList(definition.body, machine);
            return machine.lastValue;
        } finally {
            machine.depth -= 1;
            machine.frame = savedFrame;
            machine.scope = savedScope;
        }
    }

    // ----- Pernyataan ------------------------------------------------------------

    function executeList(list, machine) {
        for (let index = 0; index < list.length; index += 1) {
            const signal = list[index](machine);
            if (signal) return signal;
        }
        return 0;
    }

    function runBlock(list, machine) {
        const saved = machine.scope;
        machine.scope = { names: null, parent: saved };
        try {
            return executeList(list, machine);
        } finally {
            machine.scope = saved;
        }
    }

    function located(node, run) {
        return (machine) => {
            try {
                return run(machine);
            } catch (error) {
                if (error instanceof PineRuntimeError) {
                    if (!error.line) {
                        error.line = node.line;
                        error.column = node.column;
                    }
                    throw error;
                }
                if (error?.name === "PineTimeoutError") throw error;
                throw new PineRuntimeError(`Kesalahan saat menjalankan baris ini: ${error?.message || error}`, node.line, node.column);
            }
        };
    }

    function compileBlock(statements) {
        return statements.map(compileStatement).filter(Boolean);
    }

    function compileStatement(node) {
        switch (node.type) {
            case "FunctionDef":
            case "TypeDef":
                return null;
            case "ExprStmt": {
                const expression = compileExpression(node.expression);
                return located(node, (machine) => {
                    machine.lastValue = expression(machine);
                    return 0;
                });
            }
            case "Decl": {
                const init = compileExpression(node.init);
                const isVar = node.mode === "var" || node.mode === "varip";
                const key = node.id;
                const name = node.name;
                return located(node, (machine) => {
                    const variable = getVar(machine.frame, key, isVar);
                    if (isVar) {
                        if (!variable.initialized) {
                            variable.value = init(machine);
                            variable.initialized = true;
                        }
                    } else {
                        variable.value = init(machine);
                    }
                    variable.hist[machine.bar] = variable.value;
                    declare(machine.scope, name, variable);
                    machine.lastValue = variable.value;
                    return 0;
                });
            }
            case "TupleDecl": {
                const init = compileExpression(node.init);
                return located(node, (machine) => {
                    const value = init(machine);
                    if (!Array.isArray(value)) throw new PineRuntimeError("Sisi kanan harus mengembalikan tuple [a, b, …].");
                    node.names.forEach((entry, index) => {
                        const variable = getVar(machine.frame, entry.id, false);
                        variable.value = value[index] === undefined ? NA : value[index];
                        variable.hist[machine.bar] = variable.value;
                        declare(machine.scope, entry.name, variable);
                    });
                    machine.lastValue = value;
                    return 0;
                });
            }
            case "Assign":
                return compileAssign(node);
            case "If": {
                const test = compileExpression(node.test);
                const consequent = compileBlock(node.consequent);
                const alternate = node.alternate ? compileBlock(node.alternate) : null;
                return located(node, (machine) => {
                    if (toBool(test(machine))) return runBlock(consequent, machine);
                    if (alternate) return runBlock(alternate, machine);
                    machine.lastValue = NA;
                    return 0;
                });
            }
            case "Switch": {
                const discriminant = node.discriminant ? compileExpression(node.discriminant) : null;
                const cases = node.cases.map((entry) => ({
                    test: entry.test ? compileExpression(entry.test) : null,
                    body: compileBlock(entry.body),
                }));
                return located(node, (machine) => {
                    const subject = discriminant ? discriminant(machine) : undefined;
                    for (const entry of cases) {
                        const matched = entry.test === null || (discriminant ? equals(subject, entry.test(machine)) : toBool(entry.test(machine)));
                        if (matched) return runBlock(entry.body, machine);
                    }
                    machine.lastValue = NA;
                    return 0;
                });
            }
            case "For": {
                const from = compileExpression(node.from);
                const to = compileExpression(node.to);
                const step = node.step ? compileExpression(node.step) : null;
                const body = compileBlock(node.body);
                return located(node, (machine) => {
                    const start = from(machine);
                    const end = to(machine);
                    machine.lastValue = NA;
                    if (isNa(start) || isNa(end)) return 0;
                    const increment = step ? Math.abs(step(machine)) || 1 : 1;
                    const direction = start <= end ? 1 : -1;
                    const saved = machine.scope;
                    const loopScope = { names: new Map(), parent: saved };
                    const counter = getVar(machine.frame, node.varId, false);
                    loopScope.names.set(node.variable, counter);
                    try {
                        for (let value = start; direction > 0 ? value <= end : value >= end; value += direction * increment) {
                            machine.tick();
                            counter.value = value;
                            counter.hist[machine.bar] = value;
                            machine.scope = { names: null, parent: loopScope };
                            const signal = executeList(body, machine);
                            if (signal === BREAK) break;
                        }
                    } finally {
                        machine.scope = saved;
                    }
                    return 0;
                });
            }
            case "ForIn": {
                const iterable = compileExpression(node.iterable);
                const body = compileBlock(node.body);
                return located(node, (machine) => {
                    const collection = iterable(machine);
                    machine.lastValue = NA;
                    const saved = machine.scope;
                    const loopScope = { names: new Map(), parent: saved };
                    const vars = node.names.map((name, index) => {
                        const variable = getVar(machine.frame, `${node.id}:${index}`, false);
                        loopScope.names.set(name, variable);
                        return variable;
                    });
                    const assign = (values) => values.forEach((value, index) => {
                        if (!vars[index]) return;
                        vars[index].value = value;
                        vars[index].hist[machine.bar] = value;
                    });
                    const run = () => {
                        machine.tick();
                        machine.scope = { names: null, parent: loopScope };
                        return executeList(body, machine);
                    };
                    try {
                        if (collection instanceof PineMap) {
                            for (const [key, value] of [...collection.entries]) {
                                assign(vars.length > 1 ? [key, value] : [key]);
                                if (run() === BREAK) break;
                            }
                        } else {
                            const items = collection instanceof PineArray ? collection.items : Array.isArray(collection) ? collection : null;
                            if (!items) {
                                if (isNa(collection)) return 0;
                                throw new PineRuntimeError("for…in hanya untuk array atau map.");
                            }
                            for (let index = 0; index < items.length; index += 1) {
                                assign(vars.length > 1 ? [index, items[index]] : [items[index]]);
                                if (run() === BREAK) break;
                            }
                        }
                    } finally {
                        machine.scope = saved;
                    }
                    return 0;
                });
            }
            case "While": {
                const test = compileExpression(node.test);
                const body = compileBlock(node.body);
                return located(node, (machine) => {
                    machine.lastValue = NA;
                    while (toBool(test(machine))) {
                        machine.tick();
                        if (runBlock(body, machine) === BREAK) break;
                    }
                    return 0;
                });
            }
            case "Break":
                return () => BREAK;
            case "Continue":
                return () => CONTINUE;
            default:
                throw new PineRuntimeError(`Pernyataan ${node.type} tidak didukung.`, node.line, node.column);
        }
    }

    function compileAssign(node) {
        const value = compileExpression(node.value);
        const op = node.op;
        const combine = (current, next) => {
            if (op === ":=") return next;
            if (op === "+=" && (typeof current === "string" || typeof next === "string")) return `${current}${next}`;
            if (typeof current !== "number" || typeof next !== "number") return NA;
            if (op === "+=") return current + next;
            if (op === "-=") return current - next;
            if (op === "*=") return current * next;
            if (op === "/=") return next === 0 ? NA : current / next;
            return next === 0 ? NA : current % next;
        };

        if (node.target.type === "Ident") {
            const name = node.target.name;
            return located(node, (machine) => {
                const variable = lookup(machine.scope, name);
                if (!variable) throw new PineRuntimeError(`Variabel '${name}' belum dideklarasikan. Pakai '=' untuk deklarasi pertama.`);
                const next = combine(variable.value, value(machine));
                variable.value = next;
                variable.hist[machine.bar] = next;
                machine.lastValue = next;
                return 0;
            });
        }

        const object = compileExpression(node.target.object);
        const property = node.target.property;
        return located(node, (machine) => {
            const target = object(machine);
            if (target?.__udt) {
                if (!(property in target.fields)) throw new PineRuntimeError(`Field '${property}' tidak ada di type ${target.__udt}.`);
                target.fields[property] = combine(target.fields[property], value(machine));
                machine.lastValue = target.fields[property];
            } else if (target instanceof ChartPoint) {
                target[property] = combine(target[property], value(machine));
                machine.lastValue = target[property];
            } else {
                throw new PineRuntimeError(`Tidak bisa mengubah field '${property}' pada objek na.`);
            }
            return 0;
        });
    }

    // ----- Registrasi type dan fungsi -------------------------------------------

    for (const statement of ast.body) {
        if (statement.type === "TypeDef") {
            types.set(statement.name, {
                name: statement.name,
                fields: statement.fields.map((field) => ({
                    name: field.name,
                    defaultFn: field.default ? compileExpression(field.default) : null,
                    na: ["int", "float"].includes(field.fieldType?.name) ? NA : field.fieldType?.name === "bool" ? false : null,
                })),
            });
        }
    }
    for (const statement of ast.body) {
        if (statement.type !== "FunctionDef") continue;
        const definition = {
            name: statement.name,
            params: statement.params.map((param) => ({ ...param, defaultFn: param.default ? compileExpression(param.default) : null })),
            body: null,
        };
        if (statement.isMethod) {
            const typeName = statement.params[0]?.typeName;
            const normalized = typeName && /^(array|map)$/.test(typeName) ? typeName : typeName;
            if (normalized) methods.set(`${normalized}.${statement.name}`, definition);
            methodsByName.set(statement.name, definition);
        } else {
            functions.set(statement.name, definition);
        }
        definition.body = compileBlock(statement.body);
    }

    const body = compileBlock(ast.body);
    return { body, executeList, types };
}

// ----- Mesin eksekusi -----------------------------------------------------------

function formatNumber(value, format, mintick) {
    if (format === "mintick") return value.toFixed(decimalsOf(mintick));
    if (format === "percent") return `${value.toFixed(2)}%`;
    if (format === "volume") {
        const abs = Math.abs(value);
        if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
        if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
        if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
        return value.toFixed(2);
    }
    if (typeof format === "string" && /^[#0,]*\.?[#0]*$/.test(format) && format.includes("#")) {
        const decimals = (format.split(".")[1] || "").length;
        return Number(value.toFixed(decimals)).toString();
    }
    if (Number.isInteger(value)) return String(value);
    return String(Number(value.toFixed(8)));
}

function toText(value, format, mintick) {
    if (value === null || value === undefined) return "NaN";
    if (typeof value === "string") return value;
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return Number.isNaN(value) ? "NaN" : formatNumber(value, format, mintick);
    if (value instanceof PineArray) return `[${value.items.map((item) => toText(item, format, mintick)).join(", ")}]`;
    return String(value);
}

export function runProgram(program, options) {
    const bars = options.bars;
    const total = bars.length;
    const overrides = options.inputs || {};
    const mintick = options.mintick || 0.01;
    const period = pinePeriod(options.timeframe);
    const startedAt = Date.now();
    const deadline = options.timeoutMs ? startedAt + options.timeoutMs : Infinity;

    const columns = {
        open: bars.map((bar) => bar.open),
        high: bars.map((bar) => bar.high),
        low: bars.map((bar) => bar.low),
        close: bars.map((bar) => bar.close),
        volume: bars.map((bar) => bar.volume),
        time: bars.map((bar) => bar.time),
    };
    columns.hl2 = bars.map((bar) => (bar.high + bar.low) / 2);
    columns.hlc3 = bars.map((bar) => (bar.high + bar.low + bar.close) / 3);
    columns.ohlc4 = bars.map((bar) => (bar.open + bar.high + bar.low + bar.close) / 4);
    columns.hlcc4 = bars.map((bar) => (bar.high + bar.low + bar.close + bar.close) / 4);
    const derived = precomputeSeries(bars);
    const spanMs = total > 1 ? bars[total - 1].time - bars[total - 2].time : timeframeSeconds(period) * 1000;

    const output = {
        meta: { title: "Indikator", shorttitle: "", overlay: false, precision: null },
        inputs: [],
        plots: new Map(),
        shapes: new Map(),
        hlines: new Map(),
        fills: new Map(),
        bgcolors: new Map(),
        barcolors: new Map(),
        logs: [],
        droppedLogs: 0,
        warnings: [],
        alerts: [],
    };
    const inputCount = new Map();
    const inputByNode = new Map();
    const warned = new Set();
    const store = new DrawingStore();

    const machine = {
        bar: 0,
        frame: new Frame(),
        scope: null,
        globalScope: null,
        lastValue: NA,
        depth: 0,
        ticks: 0,
        builtins: null,
        tick() {
            this.ticks += 1;
            if (this.ticks % TICK_CHECK_INTERVAL === 0 && Date.now() > deadline) {
                const error = new Error(`Script melebihi batas waktu ${options.timeoutMs} ms. Kurangi loop atau jumlah bar.`);
                error.name = "PineTimeoutError";
                throw error;
            }
        },
        seriesAt(name, offset) {
            const column = columns[name];
            if (column) {
                const index = this.bar - offset;
                return index < 0 || index >= total ? NA : column[index];
            }
            if (name === "bar_index") return this.bar - offset >= 0 ? this.bar - offset : NA;
            const variable = this.readGlobal(name);
            return offset === 0 ? variable : NA;
        },
        readGlobal(name) {
            const column = columns[name];
            if (column) return column[this.bar];
            const date = () => new Date(columns.time[this.bar]);
            switch (name) {
                case "bar_index": return this.bar;
                case "last_bar_index": return total - 1;
                case "last_bar_time": return columns.time[total - 1];
                case "timenow": return Date.now();
                case "time_close": return columns.time[this.bar] + spanMs;
                case "year": return date().getUTCFullYear();
                case "month": return date().getUTCMonth() + 1;
                case "dayofmonth": return date().getUTCDate();
                case "dayofweek": return date().getUTCDay() + 1;
                case "hour": return date().getUTCHours();
                case "minute": return date().getUTCMinutes();
                default:
                    throw new PineRuntimeError(`Nama '${name}' tidak dikenal.`);
            }
        },
        readConstant(path) {
            if (CONSTANT_VALUES.has(path)) return CONSTANT_VALUES.get(path);
            const last = this.bar === total - 1;
            switch (path) {
                case "barstate.isfirst": return this.bar === 0;
                case "barstate.islast": return last;
                case "barstate.ishistory": return !last;
                case "barstate.isrealtime": return last;
                case "barstate.isconfirmed": return !last;
                case "barstate.isnew": return true;
                case "barstate.islastconfirmedhistory": return this.bar === total - 2;
                case "syminfo.mintick": return mintick;
                case "syminfo.pricescale": return Math.round(1 / mintick);
                case "syminfo.tickerid": return `BITUNIX:${options.symbol || "UNKNOWN"}`;
                case "syminfo.ticker": return options.symbol || "UNKNOWN";
                case "syminfo.basecurrency": return String(options.symbol || "").replace(/USDT$/, "");
                case "syminfo.currency": return "USDT";
                case "timeframe.period": return period;
                case "timeframe.multiplier": return period === "D" ? 1 : Number(period);
                case "timeframe.isintraday": return period !== "D";
                case "timeframe.isdaily": return period === "D";
                case "timeframe.isminutes": return period !== "D";
                case "timeframe.isseconds": return false;
                case "timeframe.isweekly": return false;
                case "timeframe.ismonthly": return false;
                case "chart.bg_color": return parseHexColor(CHART_BG);
                case "chart.fg_color": return parseHexColor(CHART_FG);
                case "ta.obv": return derived.obv[this.bar];
                case "ta.tr": return derived.tr[this.bar];
                case "ta.vwap": return derived.vwap[this.bar];
                default:
                    throw new PineRuntimeError(`Nama '${path}' tidak dikenal.`);
            }
        },
        readField(object, property) {
            if (object?.__udt) {
                if (!(property in object.fields)) throw new PineRuntimeError(`Field '${property}' tidak ada di type ${object.__udt}.`);
                return object.fields[property];
            }
            if (object instanceof ChartPoint) return object[property];
            if (isNa(object)) return NA;
            throw new PineRuntimeError(`Field '${property}' tidak bisa dibaca dari nilai ini.`);
        },
        state(node) {
            let state = this.frame.states.get(node.id);
            if (!state) {
                state = {};
                this.frame.states.set(node.id, state);
            }
            return state;
        },
    };

    const timeAt = (index) => {
        if (index >= 0 && index < total) return columns.time[index];
        return columns.time[total - 1] + (index - (total - 1)) * spanMs;
    };
    const indexAt = (time) => {
        let low = 0;
        let high = total - 1;
        while (low < high) {
            const middle = (low + high + 1) >> 1;
            if (columns.time[middle] <= time) low = middle;
            else high = middle - 1;
        }
        return low;
    };

    const blue = parseHexColor(NAMED_COLORS.blue);
    const drawings = createDrawingFunctions(store, {
        defaultLineColor: blue,
        defaultLabelColor: blue,
        defaultTextColor: parseHexColor(NAMED_COLORS.white),
        defaultBoxBorder: blue,
        defaultBoxBg: blue,
        timeAt,
        indexAt,
        bar: () => machine.bar,
    });
    const ta = createTa({
        get bar() {
            return machine.bar;
        },
        seriesValue: (name, offset = 0) => machine.seriesAt(name, offset),
    });

    function warnOnce(key, message) {
        if (warned.has(key)) return;
        warned.add(key);
        output.warnings.push(message);
    }

    function inputDefinition(kind, args, node, named) {
        let entry = inputByNode.get(node.id);
        if (!entry) {
            let resolvedKind = kind;
            let defval = args[0];
            const defvalNode = node.args.find((arg) => arg.name === "defval")?.value || node.args.find((arg) => !arg.name)?.value;
            const sourceName = defvalNode?.type === "Ident" && SOURCE_NAMES.has(defvalNode.name) ? defvalNode.name : null;
            if (kind === "source" || (kind === "auto" && sourceName)) {
                resolvedKind = "source";
                defval = sourceName || "close";
            } else if (kind === "auto") {
                resolvedKind = typeof defval === "boolean" ? "bool" : typeof defval === "string" ? "string" : isColor(defval) ? "color" : Number.isInteger(defval) ? "int" : "float";
            }
            const spec = FUNCTIONS[kind === "auto" ? "input" : `input.${kind}`];
            const pick = (name) => args[spec.params.indexOf(name)];
            const title = pick("title") || "";
            const base = title || `Input ${output.inputs.length + 1}`;
            const seen = (inputCount.get(base) || 0) + 1;
            inputCount.set(base, seen);
            const options = pick("options");
            entry = {
                key: seen > 1 ? `${base}#${seen}` : base,
                kind: resolvedKind,
                title,
                defval: resolvedKind === "color" ? colorToCss(defval) : defval,
                options: Array.isArray(options) ? options : null,
                minval: pick("minval"),
                maxval: pick("maxval"),
                step: pick("step"),
                group: pick("group") || "",
                inline: pick("inline") || "",
                tooltip: pick("tooltip") || "",
                line: node.line,
                rawDefault: defval,
            };
            void named;
            output.inputs.push(entry);
            inputByNode.set(node.id, entry);
        }
        const override = Object.prototype.hasOwnProperty.call(overrides, entry.key) ? overrides[entry.key] : undefined;
        if (entry.kind === "source") {
            const name = SOURCE_NAMES.has(override) ? override : entry.rawDefault;
            return columns[name][machine.bar];
        }
        if (override === undefined) return entry.rawDefault;
        if (entry.kind === "color") return typeof override === "string" ? cssToColor(override) ?? entry.rawDefault : entry.rawDefault;
        if (entry.kind === "int") return Math.trunc(Number(override));
        if (entry.kind === "float") return Number(override);
        if (entry.kind === "bool") return Boolean(override);
        return override;
    }

    function plotEntry(map, node, factory) {
        let entry = map.get(node.id);
        if (!entry) {
            entry = factory();
            map.set(node.id, entry);
        }
        return entry;
    }

    const numberOrNa = (value) => (typeof value === "number" ? value : typeof value === "boolean" ? (value ? 1 : 0) : NA);

    const builtins = {
        ...Object.fromEntries(Object.entries(drawings).map(([name, implementation]) => [name, (args) => implementation(...args)])),
        indicator: (args) => {
            if (machine.bar !== 0) return NA;
            const [title, shorttitle, overlay, , precision] = args;
            output.meta = { title: title || "Indikator", shorttitle: shorttitle || "", overlay: Boolean(overlay), precision: isNa(precision) ? null : precision };
            const spec = FUNCTIONS.indicator.params;
            const limit = (name, kind) => {
                const value = args[spec.indexOf(name)];
                if (!isNa(value) && value !== undefined) store.limits[kind] = Math.min(MAX_LIMITS[kind], Math.max(1, value));
            };
            limit("max_lines_count", "line");
            limit("max_labels_count", "label");
            limit("max_boxes_count", "box");
            limit("max_polylines_count", "polyline");
            return NA;
        },
        strategy: () => {
            throw new PineRuntimeError("strategy() belum didukung. Pakai indicator().");
        },
        alertcondition: (args) => {
            const title = args[1];
            if (title && !output.alerts.includes(title)) output.alerts.push(title);
            return NA;
        },
        input: (args, node, named) => inputDefinition("auto", args, node, named),
        "input.int": (args, node, named) => inputDefinition("int", args, node, named),
        "input.float": (args, node, named) => inputDefinition("float", args, node, named),
        "input.bool": (args, node, named) => inputDefinition("bool", args, node, named),
        "input.string": (args, node, named) => inputDefinition("string", args, node, named),
        "input.color": (args, node, named) => inputDefinition("color", args, node, named),
        "input.source": (args, node, named) => inputDefinition("source", args, node, named),

        plot: ([series, title, color, linewidth, style, , , offset, , , , display], node) => {
            const entry = plotEntry(output.plots, node, () => ({
                id: node.id, title: title || `Plot ${output.plots.size + 1}`, linewidth: isNa(linewidth) || linewidth === undefined ? 1 : linewidth,
                style: style || "line", offset: Number.isFinite(offset) ? Math.trunc(offset) : 0, display: display ?? DISPLAY_FLAGS.all,
                values: new Array(total).fill(NA), colors: new Array(total).fill(null), defaultColor: null,
            }));
            entry.values[machine.bar] = numberOrNa(series);
            const resolved = color === undefined ? parseHexColor(NAMED_COLORS.blue) : color;
            entry.colors[machine.bar] = resolved;
            if (!entry.defaultColor && isColor(resolved)) entry.defaultColor = resolved;
            return { plotId: node.id };
        },
        plotshape: ([series, title, style, location, color, offset, text, textcolor, , size], node) => {
            const entry = plotEntry(output.shapes, node, () => ({
                id: node.id, kind: "shape", title: title || "Shape", style: style || "xcross", location: location || "abovebar",
                offset: Number.isFinite(offset) ? Math.trunc(offset) : 0, size: size || "auto", points: [], defaultColor: null,
            }));
            if (toBool(series)) {
                const resolved = color === undefined ? parseHexColor(NAMED_COLORS.blue) : color;
                entry.points.push({ bar: machine.bar, value: numberOrNa(series), color: resolved, textcolor: textcolor ?? resolved, text: text || "" });
                if (!entry.defaultColor && isColor(resolved)) entry.defaultColor = resolved;
            }
            return NA;
        },
        plotchar: ([series, title, char, location, color, offset, text, textcolor, , size], node) => {
            const entry = plotEntry(output.shapes, node, () => ({
                id: node.id, kind: "char", title: title || "Char", char: char || "★", style: "char", location: location || "abovebar",
                offset: Number.isFinite(offset) ? Math.trunc(offset) : 0, size: size || "auto", points: [], defaultColor: null,
            }));
            if (toBool(series)) {
                const resolved = color === undefined ? parseHexColor(NAMED_COLORS.blue) : color;
                entry.points.push({ bar: machine.bar, value: numberOrNa(series), color: resolved, textcolor: textcolor ?? resolved, text: text || "" });
                if (!entry.defaultColor && isColor(resolved)) entry.defaultColor = resolved;
            }
            return NA;
        },
        hline: ([price, title, color, linestyle, linewidth], node) => {
            plotEntry(output.hlines, node, () => ({
                id: node.id, title: title || "Hline", price, color: color === undefined ? parseHexColor("#787B86") : color,
                style: linestyle || "dashed", width: isNa(linewidth) || linewidth === undefined ? 1 : linewidth,
            }));
            return { hlineId: node.id };
        },
        fill: ([first, second, color, title], node) => {
            const entry = plotEntry(output.fills, node, () => ({
                id: node.id, title: title || "Fill", a: first, b: second, colors: new Array(total).fill(null),
            }));
            entry.colors[machine.bar] = color ?? null;
            return NA;
        },
        bgcolor: ([color, offset], node) => {
            const entry = plotEntry(output.bgcolors, node, () => ({ id: node.id, offset: Number.isFinite(offset) ? offset : 0, colors: new Array(total).fill(null) }));
            entry.colors[machine.bar] = color ?? null;
            return NA;
        },
        barcolor: ([color, offset], node) => {
            const entry = plotEntry(output.barcolors, node, () => ({ id: node.id, offset: Number.isFinite(offset) ? offset : 0, colors: new Array(total).fill(null) }));
            entry.colors[machine.bar] = color ?? null;
            return NA;
        },

        na: ([value]) => isNa(value),
        nz: ([value, replacement]) => nz(value, replacement === undefined ? 0 : replacement),
        fixnan: ([value], node) => {
            const state = machine.state(node);
            if (!isNa(value)) state.last = value;
            return state.last === undefined ? NA : state.last;
        },
        int: ([value]) => (typeof value === "number" ? (Number.isNaN(value) ? NA : Math.trunc(value)) : typeof value === "boolean" ? Number(value) : NA),
        float: ([value]) => (typeof value === "number" ? value : typeof value === "boolean" ? Number(value) : NA),
        bool: ([value]) => toBool(value),
        string: ([value]) => (isNa(value) ? null : String(value)),
        color: ([value]) => (isColor(value) ? value : null),
        label: ([value]) => (value instanceof Drawing ? value : null),
        line: ([value]) => (value instanceof Drawing ? value : null),
        box: ([value]) => (value instanceof Drawing ? value : null),
        polyline: ([value]) => (value instanceof Drawing ? value : null),

        "math.abs": ([value]) => Math.abs(value),
        "math.max": (args) => (args.some(isNa) ? NA : Math.max(...args)),
        "math.min": (args) => (args.some(isNa) ? NA : Math.min(...args)),
        "math.avg": (args) => (args.some(isNa) ? NA : args.reduce((sum, value) => sum + value, 0) / args.length),
        "math.round": ([value, precision]) => {
            if (isNa(value)) return NA;
            if (precision === undefined || isNa(precision)) return Math.sign(value) * Math.round(Math.abs(value));
            const factor = 10 ** precision;
            return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
        },
        "math.round_to_mintick": ([value]) => (isNa(value) ? NA : Math.round(value / mintick) * mintick),
        "math.floor": ([value]) => Math.floor(value),
        "math.ceil": ([value]) => Math.ceil(value),
        "math.pow": ([base, exponent]) => base ** exponent,
        "math.sqrt": ([value]) => (value < 0 ? NA : Math.sqrt(value)),
        "math.exp": ([value]) => Math.exp(value),
        "math.log": ([value]) => (value <= 0 ? NA : Math.log(value)),
        "math.log10": ([value]) => (value <= 0 ? NA : Math.log10(value)),
        "math.sign": ([value]) => (isNa(value) ? NA : Math.sign(value)),
        "math.sin": ([value]) => Math.sin(value),
        "math.cos": ([value]) => Math.cos(value),
        "math.tan": ([value]) => Math.tan(value),
        "math.atan": ([value]) => Math.atan(value),
        "math.todegrees": ([value]) => (value * 180) / Math.PI,
        "math.toradians": ([value]) => (value * Math.PI) / 180,
        "math.random": ([min = 0, max = 1]) => min + Math.random() * (max - min),

        "color.new": ([color, transp]) => colorNew(color, transp),
        "color.rgb": ([r, g, b, t]) => colorRgb(r, g, b, t),
        "color.from_gradient": ([value, bottom, top, bottomColor, topColor]) => colorFromGradient(value, bottom, top, bottomColor, topColor),
        "color.r": ([color]) => (isColor(color) ? color.r : NA),
        "color.g": ([color]) => (isColor(color) ? color.g : NA),
        "color.b": ([color]) => (isColor(color) ? color.b : NA),
        "color.t": ([color]) => (isColor(color) ? color.t : NA),

        "array.new": (args, node) => newArray(node.callee.typeArgs?.[0]?.name || node.typeArgs?.[0]?.name || null, args[0], args[1]),
        "array.new_float": ([size, initial]) => newArray("float", size, initial),
        "array.new_int": ([size, initial]) => newArray("int", size, initial),
        "array.new_bool": ([size, initial]) => newArray("bool", size, initial),
        "array.new_string": ([size, initial]) => newArray("string", size, initial),
        "array.new_color": ([size, initial]) => newArray("color", size, initial),
        "array.new_line": ([size, initial]) => newArray("line", size, initial),
        "array.new_label": ([size, initial]) => newArray("label", size, initial),
        "array.new_box": ([size, initial]) => newArray("box", size, initial),
        "array.from": (args) => new PineArray([...args]),
        ...Object.fromEntries(Object.entries(ARRAY_FUNCTIONS).map(([name, implementation]) => [`array.${name}`, (args) => implementation(...args)])),
        "map.new": () => new PineMap(),
        ...Object.fromEntries(Object.entries(MAP_FUNCTIONS).map(([name, implementation]) => [`map.${name}`, (args) => implementation(...args)])),

        "str.tostring": ([value, format]) => toText(value, format, mintick),
        "str.tonumber": ([value]) => {
            const number = Number(value);
            return value === null || value === "" || !Number.isFinite(number) ? NA : number;
        },
        "str.format": ([template, ...values]) => String(template ?? "").replace(/\{(\d+)(?:,[^}]*)?\}/g, (_, index) => toText(values[Number(index)], null, mintick)),
        "str.length": ([value]) => (value === null ? NA : String(value).length),
        "str.upper": ([value]) => (value === null ? null : String(value).toUpperCase()),
        "str.lower": ([value]) => (value === null ? null : String(value).toLowerCase()),
        "str.contains": ([value, part]) => String(value ?? "").includes(String(part ?? "")),
        "str.startswith": ([value, part]) => String(value ?? "").startsWith(String(part ?? "")),
        "str.endswith": ([value, part]) => String(value ?? "").endsWith(String(part ?? "")),
        "str.replace_all": ([value, target, replacement]) => String(value ?? "").split(String(target)).join(String(replacement ?? "")),
        "str.split": ([value, separator]) => new PineArray(String(value ?? "").split(String(separator ?? "")), "string"),
        "str.substring": ([value, begin, end]) => String(value ?? "").substring(begin, end === undefined ? undefined : end),
        "str.trim": ([value]) => String(value ?? "").trim(),
        "log.info": (args) => pushLog("info", args),
        "log.warning": (args) => pushLog("warning", args),
        "log.error": (args) => pushLog("error", args),
        "runtime.error": ([message]) => {
            throw new PineRuntimeError(String(message ?? "runtime.error"));
        },

        "timeframe.in_seconds": ([value]) => timeframeSeconds(value === undefined ? period : value),
        "request.security": (args) => {
            const requested = args[1];
            if (requested && requested !== period && requested !== "") {
                warnOnce("security", `request.security ke timeframe '${requested}' belum didukung; memakai data timeframe chart.`);
            }
            return args[2];
        },
        "request.security_lower_tf": (args) => {
            warnOnce("lower_tf", "request.security_lower_tf belum punya data timeframe kecil; memakai bar chart sendiri.");
            return new PineArray([args[2]]);
        },
    };

    function pushLog(level, args) {
        if (output.logs.length >= 200) {
            output.droppedLogs += 1;
            return NA;
        }
        const [template, ...values] = args;
        const message = String(template ?? "").replace(/\{(\d+)(?:,[^}]*)?\}/g, (_, index) => toText(values[Number(index)], null, mintick));
        output.logs.push({ level, message, bar: machine.bar });
        return NA;
    }

    for (const [name, implementation] of Object.entries(ta)) {
        const fullName = name.startsWith("math.") ? name : `ta.${name}`;
        builtins[fullName] = (args, node) => implementation(machine.state(node), ...args);
    }
    machine.builtins = builtins;

    const rootFrame = machine.frame;
    for (let bar = 0; bar < total; bar += 1) {
        machine.bar = bar;
        machine.frame = rootFrame;
        machine.globalScope = { names: new Map(), parent: null };
        machine.scope = machine.globalScope;
        machine.depth = 0;
        program.executeList(program.body, machine);
        if (Date.now() > deadline) {
            const error = new Error(`Script melebihi batas waktu ${options.timeoutMs} ms. Kurangi loop atau jumlah bar.`);
            error.name = "PineTimeoutError";
            throw error;
        }
    }

    return serializeOutput(output, store, { indexAt, total, ms: Date.now() - startedAt });
}

function cssToColor(css) {
    const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(css));
    if (hex) return parseHexColor(css);
    const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i.exec(String(css));
    if (!rgba) return null;
    const alpha = rgba[4] === undefined ? 1 : Number(rgba[4]);
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), t: Math.round((1 - alpha) * 100) };
}

function serializeOutput(output, store, { indexAt, total, ms }) {
    const css = (color) => colorToCss(color);
    const drawings = store.snapshot();
    const toIndex = (x, xloc) => (xloc === "bar_time" && !isNa(x) ? indexAt(x) : x);

    return {
        meta: output.meta,
        inputs: output.inputs.map((entry) => {
            const { rawDefault: _ignored, ...rest } = entry;
            void _ignored;
            return rest;
        }),
        plots: [...output.plots.values()].map((plot) => ({
            id: plot.id, title: plot.title, linewidth: plot.linewidth, style: plot.style, offset: plot.offset, display: plot.display,
            color: css(plot.defaultColor), values: plot.values.map((value) => (Number.isFinite(value) ? value : null)),
            colors: plot.colors.map(css),
        })),
        shapes: [...output.shapes.values()].map((shape) => ({
            ...shape,
            defaultColor: css(shape.defaultColor),
            points: shape.points.map((point) => ({ ...point, color: css(point.color), textcolor: css(point.textcolor), value: Number.isFinite(point.value) ? point.value : null })),
        })),
        hlines: [...output.hlines.values()].map((line) => ({ ...line, color: css(line.color) })),
        fills: [...output.fills.values()].map((fill) => ({
            id: fill.id, title: fill.title, a: fill.a, b: fill.b, colors: fill.colors.map(css),
        })),
        bgcolors: [...output.bgcolors.values()].map((entry) => ({ ...entry, colors: entry.colors.map(css) })),
        barcolors: [...output.barcolors.values()].map((entry) => ({ ...entry, colors: entry.colors.map(css) })),
        drawings: {
            lines: drawings.lines.map((line) => ({ ...line, x1: toIndex(line.x1, line.xloc), x2: toIndex(line.x2, line.xloc), color: css(line.color) })),
            labels: drawings.labels.map((label) => ({ ...label, x: toIndex(label.x, label.xloc), color: css(label.color), textcolor: css(label.textcolor) })),
            boxes: drawings.boxes.map((box) => ({
                ...box, left: toIndex(box.left, box.xloc), right: toIndex(box.right, box.xloc),
                borderColor: css(box.borderColor), bgcolor: css(box.bgcolor), textColor: css(box.textColor),
            })),
            polylines: drawings.polylines.map((polyline) => ({
                ...polyline,
                points: polyline.points.map((point) => ({ index: polyline.xloc === "bar_time" ? indexAt(point.time) : point.index, price: point.price })),
                lineColor: css(polyline.lineColor), fillColor: css(polyline.fillColor),
            })),
        },
        logs: output.logs,
        droppedLogs: output.droppedLogs,
        warnings: output.warnings,
        alerts: output.alerts,
        stats: { bars: total, ms },
    };
}
