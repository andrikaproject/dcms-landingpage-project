// array.* dan map.* Pine. Fungsi menerima objek koleksi sebagai argumen
// pertama, sehingga bentuk `array.push(a, x)` dan `a.push(x)` memakai kode sama.

import { isNa, NA, PineRuntimeError } from "./values.js";

export class PineArray {
    constructor(items = [], elementType = null) {
        this.items = items;
        this.elementType = elementType;
    }
}

export class PineMap {
    constructor() {
        this.entries = new Map();
    }
}

export function isPineArray(value) {
    return value instanceof PineArray;
}

export function isPineMap(value) {
    return value instanceof PineMap;
}

function requireArray(id, name) {
    if (!(id instanceof PineArray)) throw new PineRuntimeError(`array.${name}() dipanggil pada nilai yang bukan array (na).`);
    return id.items;
}

function resolveIndex(items, index, name) {
    if (isNa(index)) throw new PineRuntimeError(`Indeks array.${name}() bernilai na.`);
    const position = Math.trunc(index) < 0 ? items.length + Math.trunc(index) : Math.trunc(index);
    if (position < 0 || position >= items.length) {
        throw new PineRuntimeError(`Indeks ${Math.trunc(index)} di luar jangkauan array (ukuran ${items.length}).`);
    }
    return position;
}

function numeric(items) {
    return items.filter((value) => typeof value === "number" && !Number.isNaN(value));
}

function nth(sorted, rank) {
    const index = isNa(rank) ? 0 : Math.trunc(rank);
    return index >= 0 && index < sorted.length ? sorted[index] : NA;
}

function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NA;
}

function variance(values, biased = true) {
    if (!values.length) return NA;
    const average = mean(values);
    const squares = values.reduce((sum, value) => sum + (value - average) ** 2, 0);
    const divisor = biased ? values.length : values.length - 1;
    return divisor > 0 ? squares / divisor : NA;
}

function defaultFor(elementType) {
    if (elementType === "bool") return false;
    if (elementType === "int" || elementType === "float") return NA;
    return null;
}

export function newArray(elementType, size, initial) {
    const length = isNa(size) ? 0 : Math.max(0, Math.trunc(size));
    const fill = initial === undefined ? defaultFor(elementType) : initial;
    return new PineArray(Array.from({ length }, () => fill), elementType);
}

export const ARRAY_FUNCTIONS = {
    // Indeks na (misalnya dari seri yang belum punya cukup bar) menghasilkan na
    // alih-alih menghentikan script; indeks di luar jangkauan tetap error.
    get: (id, index) => {
        const items = requireArray(id, "get");
        if (isNa(index)) return NA;
        return items[resolveIndex(items, index, "get")];
    },
    set: (id, index, value) => {
        const items = requireArray(id, "set");
        if (isNa(index)) return;
        items[resolveIndex(items, index, "set")] = value;
    },
    push: (id, value) => {
        requireArray(id, "push").push(value);
    },
    pop: (id) => {
        const items = requireArray(id, "pop");
        if (!items.length) throw new PineRuntimeError("array.pop() pada array kosong.");
        return items.pop();
    },
    shift: (id) => {
        const items = requireArray(id, "shift");
        if (!items.length) throw new PineRuntimeError("array.shift() pada array kosong.");
        return items.shift();
    },
    unshift: (id, value) => {
        requireArray(id, "unshift").unshift(value);
    },
    insert: (id, index, value) => {
        const items = requireArray(id, "insert");
        const position = Math.trunc(index) < 0 ? items.length + Math.trunc(index) : Math.trunc(index);
        if (position < 0 || position > items.length) throw new PineRuntimeError(`Indeks ${index} di luar jangkauan array (ukuran ${items.length}).`);
        items.splice(position, 0, value);
    },
    remove: (id, index) => {
        const items = requireArray(id, "remove");
        return items.splice(resolveIndex(items, index, "remove"), 1)[0];
    },
    clear: (id) => {
        requireArray(id, "clear").length = 0;
    },
    size: (id) => (id instanceof PineArray ? id.items.length : NA),
    first: (id) => {
        const items = requireArray(id, "first");
        if (!items.length) throw new PineRuntimeError("array.first() pada array kosong.");
        return items[0];
    },
    last: (id) => {
        const items = requireArray(id, "last");
        if (!items.length) throw new PineRuntimeError("array.last() pada array kosong.");
        return items[items.length - 1];
    },
    copy: (id) => new PineArray([...requireArray(id, "copy")], id.elementType),
    slice: (id, from, to) => new PineArray(requireArray(id, "slice").slice(from, to), id.elementType),
    concat: (id, other) => {
        requireArray(id, "concat").push(...requireArray(other, "concat"));
        return id;
    },
    includes: (id, value) => requireArray(id, "includes").includes(value),
    indexof: (id, value) => requireArray(id, "indexof").indexOf(value),
    lastindexof: (id, value) => requireArray(id, "lastindexof").lastIndexOf(value),
    sum: (id) => {
        const values = numeric(requireArray(id, "sum"));
        return values.length ? values.reduce((total, value) => total + value, 0) : NA;
    },
    avg: (id) => mean(numeric(requireArray(id, "avg"))),
    min: (id, rank = 0) => nth(numeric(requireArray(id, "min")).sort((a, b) => a - b), rank),
    max: (id, rank = 0) => nth(numeric(requireArray(id, "max")).sort((a, b) => b - a), rank),
    median: (id) => {
        const values = numeric(requireArray(id, "median")).sort((a, b) => a - b);
        if (!values.length) return NA;
        const middle = Math.floor(values.length / 2);
        return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    },
    range: (id) => {
        const values = numeric(requireArray(id, "range"));
        return values.length ? Math.max(...values) - Math.min(...values) : NA;
    },
    stdev: (id, biased = true) => Math.sqrt(variance(numeric(requireArray(id, "stdev")), biased)),
    variance: (id, biased = true) => variance(numeric(requireArray(id, "variance")), biased),
    sort: (id, order = "ascending") => {
        const items = requireArray(id, "sort");
        const direction = order === "descending" ? -1 : 1;
        items.sort((a, b) => {
            if (typeof a === "string" || typeof b === "string") return String(a).localeCompare(String(b)) * direction;
            if (Number.isNaN(a)) return 1;
            if (Number.isNaN(b)) return -1;
            return (a - b) * direction;
        });
    },
    sort_indices: (id, order = "ascending") => {
        const items = requireArray(id, "sort_indices");
        const direction = order === "descending" ? -1 : 1;
        return new PineArray(items.map((_, index) => index).sort((a, b) => (items[a] - items[b]) * direction), "int");
    },
    reverse: (id) => {
        requireArray(id, "reverse").reverse();
    },
    fill: (id, value, from = 0, to) => {
        const items = requireArray(id, "fill");
        items.fill(value, from, isNa(to) || to === undefined ? items.length : to);
    },
    join: (id, separator = "") => requireArray(id, "join").map((value) => (isNa(value) ? "NaN" : String(value))).join(separator),
    every: (id) => requireArray(id, "every").every(Boolean),
    some: (id) => requireArray(id, "some").some(Boolean),
    abs: (id) => new PineArray(requireArray(id, "abs").map((value) => Math.abs(value)), id.elementType),
    percentile_linear_interpolation: (id, percentage) => {
        const values = numeric(requireArray(id, "percentile_linear_interpolation")).sort((a, b) => a - b);
        if (!values.length) return NA;
        const rank = (percentage / 100) * (values.length - 1);
        const low = Math.floor(rank);
        const high = Math.ceil(rank);
        return values[low] + (values[high] - values[low]) * (rank - low);
    },
};

function requireMap(id, name) {
    if (!(id instanceof PineMap)) throw new PineRuntimeError(`map.${name}() dipanggil pada nilai yang bukan map (na).`);
    return id.entries;
}

export const MAP_FUNCTIONS = {
    put: (id, key, value) => {
        const entries = requireMap(id, "put");
        const previous = entries.has(key) ? entries.get(key) : NA;
        entries.set(key, value);
        return previous;
    },
    get: (id, key) => {
        const entries = requireMap(id, "get");
        return entries.has(key) ? entries.get(key) : NA;
    },
    contains: (id, key) => requireMap(id, "contains").has(key),
    remove: (id, key) => {
        const entries = requireMap(id, "remove");
        const previous = entries.has(key) ? entries.get(key) : NA;
        entries.delete(key);
        return previous;
    },
    keys: (id) => new PineArray([...requireMap(id, "keys").keys()]),
    values: (id) => new PineArray([...requireMap(id, "values").values()]),
    size: (id) => (id instanceof PineMap ? id.entries.size : NA),
    clear: (id) => {
        requireMap(id, "clear").clear();
    },
    copy: (id) => {
        const copy = new PineMap();
        for (const [key, value] of requireMap(id, "copy")) copy.entries.set(key, value);
        return copy;
    },
    put_all: (id, other) => {
        const entries = requireMap(id, "put_all");
        for (const [key, value] of requireMap(other, "put_all")) entries.set(key, value);
    },
};
