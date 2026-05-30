import { NextResponse } from "next/server";
import { isValidUidFormat, validateBitunixUser } from "@/lib/bitunix";
import { checkRateLimit, getRequestIp } from "@/lib/safe-action";

export const runtime = "nodejs";

export async function POST(request) {
    const { uid: rawUid } = await request.json().catch(() => ({}));
    const uid = String(rawUid || "").trim();
    const ip = await getRequestIp();
    const rateLimit = checkRateLimit(`api-validate-bitunix:${ip}:${uid || "empty"}`, {
        limit: 20,
        windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                valid: false,
                message: `Terlalu banyak percobaan. Coba lagi dalam ${rateLimit.retryAfter} detik.`,
            },
            { status: 429 }
        );
    }

    if (!isValidUidFormat(uid)) {
        return NextResponse.json(
            {
                valid: false,
                message: "UID harus berupa angka dengan panjang 5 sampai 20 digit.",
            },
            { status: 400 }
        );
    }

    try {
        return NextResponse.json(await validateBitunixUser(uid));
    } catch (error) {
        return NextResponse.json(
            {
                valid: false,
                message: error.message || "Tidak bisa menghubungi Bitunix saat ini.",
            },
            { status: 502 }
        );
    }
}
