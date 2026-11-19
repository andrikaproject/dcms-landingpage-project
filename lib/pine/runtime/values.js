// Nilai dasar runtime Pine. `na` angka diwakili NaN supaya aritmetika
// mengalir alami; `na` untuk objek, string, dan warna diwakili null.

export const NA = NaN;

export class PineRuntimeError extends Error {
    constructor(message, line = 0, column = 1) {
        super(message);
        this.name = "PineRuntimeError";
        this.line = line;
        this.column = column;
    }
}

export function isNa(value) {
    return value === null || value === undefined || (typeof value === "number" && Number.isNaN(value));
}

export function nz(value, replacement = 0) {
    return isNa(value) ? replacement : value;
}

export function toBool(value) {
    if (isNa(value)) return false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return Boolean(value);
}

export function toNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    return NaN;
}

// ----- Warna -----------------------------------------------------------------------

export const NAMED_COLORS = {
    aqua: "#00BCD4",
    black: "#363A45",
    blue: "#2196F3",
    fuchsia: "#E040FB",
    gray: "#787B86",
    green: "#4CAF50",
    lime: "#00E676",
    maroon: "#880E4F",
    navy: "#311B92",
    olive: "#808000",
    orange: "#FF9800",
    purple: "#9C27B0",
    red: "#FF5252",
    silver: "#B2B5BE",
    teal: "#00897B",
    white: "#FFFFFF",
    yellow: "#FFEB3B",
};

export const CHART_BG = "#111417";
export const CHART_FG = "#D1D4DC";

// Warna disimpan sebagai {r, g, b, t} dengan t = transparansi 0–100 seperti Pine.
export function parseHexColor(hex) {
    const clean = String(hex).replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const alpha = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, t: Math.round((1 - alpha) * 100) };
}

export function isColor(value) {
    return Boolean(value) && typeof value === "object" && "r" in value && "g" in value && "b" in value && "t" in value;
}

export function colorNew(color, transparency) {
    if (!isColor(color)) return null;
    const t = isNa(transparency) ? color.t : Math.max(0, Math.min(100, transparency));
    return { r: color.r, g: color.g, b: color.b, t };
}

export function colorRgb(r, g, b, t = 0) {
    if ([r, g, b].some(isNa)) return null;
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), t: isNa(t) ? 0 : t };
}

export function colorFromGradient(value, bottom, top, bottomColor, topColor) {
    if (isNa(value) || !isColor(bottomColor) || !isColor(topColor)) return null;
    const span = top - bottom;
    const ratio = span === 0 ? 0 : Math.max(0, Math.min(1, (value - bottom) / span));
    const mix = (a, b) => a + (b - a) * ratio;
    return {
        r: Math.round(mix(bottomColor.r, topColor.r)),
        g: Math.round(mix(bottomColor.g, topColor.g)),
        b: Math.round(mix(bottomColor.b, topColor.b)),
        t: mix(bottomColor.t, topColor.t),
    };
}

export function colorToCss(color) {
    if (!isColor(color)) return null;
    const alpha = Math.max(0, Math.min(1, 1 - color.t / 100));
    if (alpha === 0) return null;
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${Number(alpha.toFixed(3))})`;
}

export function colorToHex(color) {
    if (!isColor(color)) return null;
    return `#${[color.r, color.g, color.b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}
