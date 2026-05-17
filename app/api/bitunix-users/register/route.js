import { NextResponse } from "next/server";
import {
    createBitunixUser,
    findBitunixUserByEmail,
    findBitunixUserByUid,
    findBitunixUserByUsername,
} from "@/lib/bitunix-users";
import { isValidUidFormat, validateBitunixUser } from "@/lib/bitunix";

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toPublicUser(user) {
    const publicUser = { ...user };
    delete publicUser.passwordHash;
    return publicUser;
}

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const uid = String(body.uid || body.uuidBitunix || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!isValidUidFormat(uid)) {
        return NextResponse.json(
            { error: "UID harus berupa angka dengan panjang 5 sampai 20 digit." },
            { status: 400 }
        );
    }

    if (!isValidEmail(email)) {
        return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json(
            { error: "Password minimal 8 karakter." },
            { status: 400 }
        );
    }

    try {
        const [existingUid, existingEmail, existingUsername] = await Promise.all([
            findBitunixUserByUid(uid),
            findBitunixUserByEmail(email),
            name ? findBitunixUserByUsername(name) : null,
        ]);

        if (existingUid) {
            return NextResponse.json(
                { error: "UID Bitunix sudah terdaftar. Silakan login." },
                { status: 409 }
            );
        }

        if (existingEmail) {
            return NextResponse.json(
                { error: "Email sudah terdaftar." },
                { status: 409 }
            );
        }

        if (existingUsername) {
            return NextResponse.json(
                { error: "Username sudah terdaftar." },
                { status: 409 }
            );
        }

        const bitunixResult = await validateBitunixUser(uid);

        if (!bitunixResult.valid) {
            return NextResponse.json(
                { error: "UID ini tidak masuk ke partner DCMS." },
                { status: 403 }
            );
        }

        const user = await createBitunixUser({
            uid,
            email,
            password,
            name,
            depositUsdtAmount: bitunixResult.depositUsdtAmount,
            lastTradeAt: bitunixResult.lastTradeAt,
        });

        return NextResponse.json({
            success: "Registrasi berhasil. Silakan login.",
            user: toPublicUser(user),
        });
    } catch (error) {
        console.error("Bitunix Register Error:", error);

        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Terjadi kesalahan saat registrasi. Silakan coba lagi.",
            },
            { status: 500 }
        );
    }
}
