import { NextResponse } from "next/server";
import { isValidUidFormat, validateBitunixUser } from "@/lib/bitunix";

export const runtime = "nodejs";

export async function POST(request) {
    const { uid: rawUid } = await request.json().catch(() => ({}));
    const uid = String(rawUid || "").trim();

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
