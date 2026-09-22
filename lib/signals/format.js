// Harga datang sebagai decimal string dari server. Pembulatan hanya untuk
// tampilan; nilai keputusan tetap dipakai apa adanya dari backend.

const DECIMAL_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
const EXPONENT_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)e[+-]?\d+$/i;

export function toDecimalString(value) {
    if (value === null || value === undefined || value === "") return null;
    const raw = typeof value === "string" ? value.trim() : String(value);
    if (DECIMAL_PATTERN.test(raw)) return raw;
    if (EXPONENT_PATTERN.test(raw)) {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return null;
        return parsed.toFixed(20).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    }
    return null;
}

export function decimalPlaces(value) {
    const raw = toDecimalString(value);
    if (raw === null) return 0;
    const fraction = raw.split(".")[1];
    return fraction ? fraction.replace(/0+$/, "").length : 0;
}

export function decimalPlacesFromTick(tickSize) {
    const raw = toDecimalString(tickSize);
    if (raw === null || Number(raw) === 0) return null;
    return decimalPlaces(raw);
}

function incrementDigits(digits) {
    const characters = digits.split("");
    for (let index = characters.length - 1; index >= 0; index -= 1) {
        if (characters[index] === "9") {
            characters[index] = "0";
            continue;
        }
        characters[index] = String(Number(characters[index]) + 1);
        return characters.join("");
    }
    return `1${characters.join("")}`;
}

// Half-up di ruang string supaya presisi coin kecil tidak hilang di float.
export function roundDecimalString(value, decimals) {
    const raw = toDecimalString(value);
    if (raw === null) return null;

    const isNegative = raw.startsWith("-");
    const unsigned = raw.replace(/^[+-]/, "");
    const [integerPart = "0", fractionPart = ""] = unsigned.split(".");
    const safeDecimals = Math.max(0, Math.trunc(decimals));

    if (fractionPart.length <= safeDecimals) {
        const padded = fractionPart.padEnd(safeDecimals, "0");
        const body = safeDecimals > 0 ? `${integerPart}.${padded}` : integerPart;
        return isNegative && Number(unsigned) !== 0 ? `-${body}` : body;
    }

    const kept = `${integerPart}${fractionPart.slice(0, safeDecimals)}`;
    const shouldRoundUp = Number(fractionPart[safeDecimals]) >= 5;
    const rounded = shouldRoundUp ? incrementDigits(kept) : kept;
    const carried = rounded.length > kept.length;
    const integerLength = integerPart.length + (carried ? 1 : 0);
    const nextInteger = rounded.slice(0, integerLength);
    const nextFraction = rounded.slice(integerLength);
    const body = safeDecimals > 0 ? `${nextInteger}.${nextFraction}` : nextInteger;

    return isNegative && Number(body) !== 0 ? `-${body}` : body;
}

function groupInteger(integerPart) {
    return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function defaultDecimals(raw) {
    const magnitude = Math.abs(Number(raw));
    if (!Number.isFinite(magnitude)) return 2;
    if (magnitude >= 1) return Math.max(2, Math.min(decimalPlaces(raw), 4));
    return Math.max(2, Math.min(decimalPlaces(raw), 10));
}

export function formatDecimalPrice(value, options = {}) {
    const { tickSize = null, precision = null, prefix = "$", placeholder = "-" } = options;
    const raw = toDecimalString(value);
    if (raw === null) return placeholder;

    const decimals = precision ?? decimalPlacesFromTick(tickSize) ?? defaultDecimals(raw);
    const rounded = roundDecimalString(raw, decimals);
    if (rounded === null) return placeholder;

    const isNegative = rounded.startsWith("-");
    const [integerPart, fractionPart] = rounded.replace("-", "").split(".");
    const body = fractionPart ? `${groupInteger(integerPart)}.${fractionPart}` : groupInteger(integerPart);

    return `${isNegative ? "-" : ""}${prefix}${body}`;
}

export function formatRewardRisk(value, { placeholder = "-" } = {}) {
    if (value === null || value === undefined || value === "") return placeholder;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return placeholder;
    return `1:${number.toFixed(number >= 10 ? 0 : 1)}`;
}

export function formatRealizedR(value, { placeholder = "-" } = {}) {
    if (value === null || value === undefined || value === "") return placeholder;
    const number = Number(value);
    if (!Number.isFinite(number)) return placeholder;
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}R`;
}

export function formatUserTime(iso, { placeholder = "-" } = {}) {
    if (!iso) return placeholder;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return placeholder;

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
    }).format(date);
}

export function formatRelativeTime(iso, { now = Date.now(), placeholder = "-" } = {}) {
    if (!iso) return placeholder;
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) return placeholder;

    const diffSeconds = Math.round((now - time) / 1000);
    const ago = diffSeconds >= 0;
    const seconds = Math.abs(diffSeconds);
    if (seconds < 60) return ago ? "Baru saja" : "Sebentar lagi";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return ago ? `${minutes} mnt lalu` : `dalam ${minutes} mnt`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return ago ? `${hours} jam lalu` : `dalam ${hours} jam`;
    const days = Math.floor(hours / 24);
    return ago ? `${days} hari lalu` : `dalam ${days} hari`;
}

export const DEFAULT_STALE_AFTER_MS = 180_000;

// Kesegaran diukur dari waktu evaluasi backend, bukan dari jam browser sendiri.
export function describeFreshness(lastEvaluatedAt, options = {}) {
    const { now = Date.now(), staleAfterMs = DEFAULT_STALE_AFTER_MS, dataHealth = null } = options;

    if (!lastEvaluatedAt) {
        return {
            isStale: true,
            isUnknown: true,
            label: "Belum pernah dievaluasi backend",
            lastEvaluatedLabel: "-",
        };
    }

    const time = new Date(lastEvaluatedAt).getTime();
    if (Number.isNaN(time)) {
        return { isStale: true, isUnknown: true, label: "Waktu evaluasi tidak terbaca", lastEvaluatedLabel: "-" };
    }

    const ageMs = now - time;
    const unhealthy = dataHealth && dataHealth !== "OK" && dataHealth !== "HEALTHY";
    const isStale = unhealthy || ageMs > staleAfterMs;
    const relative = formatRelativeTime(lastEvaluatedAt, { now });

    return {
        isStale,
        isUnknown: false,
        ageMs,
        label: isStale ? `Data tertunda · evaluasi terakhir ${relative}` : `Dievaluasi ${relative}`,
        lastEvaluatedLabel: formatUserTime(lastEvaluatedAt),
    };
}

export function formatDurationMs(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "0m";
    const totalMinutes = Math.floor(ms / 60_000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
    const days = Math.floor(hours / 24);
    return `${days}h ${hours % 24}j`;
}

// Countdown hanya keterangan tampilan. Nol berarti FE menunggu keputusan backend.
export function describeValidity(expiresAt, { now = Date.now() } = {}) {
    if (!expiresAt) return { hasDeadline: false, isElapsed: false, label: "Masa berlaku belum ditentukan backend" };

    const time = new Date(expiresAt).getTime();
    if (Number.isNaN(time)) return { hasDeadline: false, isElapsed: false, label: "Masa berlaku tidak terbaca" };

    const remainingMs = time - now;
    if (remainingMs <= 0) {
        return {
            hasDeadline: true,
            isElapsed: true,
            remainingMs: 0,
            label: "Batas waktu terlewat · menunggu keputusan backend",
        };
    }

    return {
        hasDeadline: true,
        isElapsed: false,
        remainingMs,
        label: `Berlaku ${formatDurationMs(remainingMs)} lagi`,
    };
}
