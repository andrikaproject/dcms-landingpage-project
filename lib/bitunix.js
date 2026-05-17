import { createHash } from "crypto";

const bitunixBaseUrl = "https://partners.bitunix.com";

export function isValidUidFormat(uid) {
    return /^[0-9]{5,20}$/.test(uid);
}

function getParameterType(value) {
    if (/^\d/.test(value)) return 1;
    if (/^[a-z]/.test(value)) return 2;
    return 3;
}

function getAsciiSum(value) {
    return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function sortBitunixParams(params) {
    return Object.keys(params)
        .sort((a, b) => {
            const typeDiff = getParameterType(a) - getParameterType(b);
            return typeDiff || getAsciiSum(a) - getAsciiSum(b);
        })
        .reduce((sorted, key) => {
            sorted[key] = params[key];
            return sorted;
        }, {});
}

function createSignature(params, apiSecret) {
    const sortedParams = sortBitunixParams(params);
    const valueString = Object.values(sortedParams).join("");

    return createHash("sha1").update(valueString + apiSecret).digest("hex");
}

function parseBitunixDate(value) {
    if (!value) return null;

    if (typeof value === "number") {
        const timestamp = value < 10_000_000_000 ? value * 1000 : value;
        const date = new Date(timestamp);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;

        if (/^\d+$/.test(trimmed)) {
            return parseBitunixDate(Number(trimmed));
        }

        const date = new Date(trimmed);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    return null;
}

function getLastTradeAt(result = {}) {
    return parseBitunixDate(
        result.lastTradeAt ||
        result.last_trade_at ||
        result.lastTradeTime ||
        result.last_trade_time ||
        result.lastTrade ||
        result.last_trade ||
        result.lastTradeDate ||
        result.last_trade_date
    );
}

export async function validateBitunixUser(uid) {
    const apiKey = process.env.BITUNIX_API_KEY;
    const apiSecret = process.env.BITUNIX_API_SECRET;
    const normalizedUid = String(uid || "").trim();

    if (!apiKey || !apiSecret) {
        throw new Error("BITUNIX_API_KEY atau BITUNIX_API_SECRET belum diisi di file .env.");
    }

    if (!isValidUidFormat(normalizedUid)) {
        throw new Error("UID harus berupa angka dengan panjang 5 sampai 20 digit.");
    }

    const params = {
        account: normalizedUid,
        timestamp: Math.floor(Date.now() / 1000),
    };

    const response = await fetch(`${bitunixBaseUrl}/partner/api/v2/openapi/validateUser`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            apiKey,
            signature: createSignature(params, apiSecret),
        },
        body: new URLSearchParams(params),
    });

    const data = await response.json();

    if (!response.ok || data.code !== "0") {
        throw new Error(data.msg || "Bitunix menolak request validasi.");
    }

    return {
        valid: data.result?.result === true,
        depositUsdtAmount: data.result?.deposit_usdt_amount || "0",
        lastTradeAt: getLastTradeAt(data.result),
    };
}
