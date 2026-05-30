import { NextResponse } from "next/server";
import { z } from "zod";
import {
    createBitunixUser,
    findBitunixUserByEmail,
    findBitunixUserByUid,
    findBitunixUserByUsername,
} from "@/lib/bitunix-users";
import { validateBitunixUser } from "@/lib/bitunix";
import { checkRateLimit, getRequestIp } from "@/lib/safe-action";

const registerSchema = z.object({
    uid: z.string().trim().regex(/^[0-9]{5,20}$/, "UID harus berupa angka dengan panjang 5 sampai 20 digit."),
    email: z.string().trim().toLowerCase().email("Email tidak valid.").max(255, "Email terlalu panjang."),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128, "Password terlalu panjang."),
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120, "Nama terlalu panjang."),
});

function toPublicUser(user) {
    const publicUser = { ...user };
    delete publicUser.passwordHash;
    return publicUser;
}

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse({
        uid: body.uid || body.uuidBitunix,
        email: body.email,
        password: body.password,
        name: body.name,
    });

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || "Payload registrasi tidak valid." },
            { status: 400 }
        );
    }

    const { uid, email, password, name } = parsed.data;
    const ip = await getRequestIp();
    const rateLimit = checkRateLimit(`api-register-bitunix:${ip}:${email}`, {
        limit: 5,
        windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: `Terlalu banyak percobaan. Coba lagi dalam ${rateLimit.retryAfter} detik.` },
            { status: 429 }
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
