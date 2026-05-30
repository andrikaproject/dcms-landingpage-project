"use server";

import { z } from "zod";
import { getFirstActionError } from "@/lib/action-result";
import { actionClient, PublicActionError, rateLimitAction } from "@/lib/safe-action";
import {
    createBitunixUser,
    findBitunixUserByEmail,
    findBitunixUserByUid,
    findBitunixUserByUsername,
} from "@/lib/bitunix-users";
import { isValidUidFormat, validateBitunixUser } from "@/lib/bitunix";
import { hashPassword } from "@/lib/utils";
import {
    createPendingUser,
    findUserByEmail,
    findUserByUuidBitunix,
} from "@/lib/users";

const registerBitunixSchema = z.object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120, "Nama terlalu panjang."),
    uuidBitunix: z
        .string()
        .trim()
        .regex(/^[0-9]{5,20}$/, "UID harus berupa angka dengan panjang 5 sampai 20 digit."),
    email: z.string().trim().toLowerCase().email("Email tidak valid.").max(255, "Email terlalu panjang."),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128, "Password terlalu panjang."),
});

export const registerBitunixUser = actionClient
    .use(
        rateLimitAction({
            keyPrefix: "register-bitunix",
            limit: 5,
            windowMs: 10 * 60 * 1000,
            keyFromInput: ({ clientInput, ip }) => {
                const email = String(clientInput?.email || "").trim().toLowerCase();
                return email ? `${ip}:${email}` : ip;
            },
        })
    )
    .inputSchema(registerBitunixSchema)
    .action(async ({ parsedInput }) => {
        const { name, uuidBitunix, email, password } = parsedInput;

        if (!isValidUidFormat(uuidBitunix)) {
            throw new PublicActionError("UID harus berupa angka dengan panjang 5 sampai 20 digit.");
        }

        const [existingUid, existingEmail, existingUsername] = await Promise.all([
            findBitunixUserByUid(uuidBitunix),
            findBitunixUserByEmail(email),
            findBitunixUserByUsername(name),
        ]);

        if (existingUid) {
            throw new PublicActionError("UID Bitunix sudah terdaftar. Silakan login.");
        }

        if (existingEmail) {
            throw new PublicActionError("Email sudah terdaftar.");
        }

        if (existingUsername) {
            throw new PublicActionError("Username sudah terdaftar.");
        }

        const bitunixResult = await validateBitunixUser(uuidBitunix);

        if (!bitunixResult.valid) {
            throw new PublicActionError("UID ini tidak masuk ke partner DCMS.");
        }

        await createBitunixUser({
            uid: uuidBitunix,
            email,
            password,
            name,
            depositUsdtAmount: bitunixResult.depositUsdtAmount,
            lastTradeAt: bitunixResult.lastTradeAt,
        });

        return { success: "Registrasi berhasil. Silakan login." };
    });

export async function registerUser(formData) {
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || `dummy-${Date.now()}@dcms.com`).trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const uuidBitunix = String(formData.get("uuidBitunix") || "").trim();

    if (!name || !password || !uuidBitunix) {
        return { error: "Semua field harus diisi!" };
    }

    try {
        const existingEmail = await findUserByEmail(email);

        if (existingEmail) {
            return { error: "Email sudah terdaftar!" };
        }

        const existingUUID = await findUserByUuidBitunix(uuidBitunix);

        if (existingUUID) {
            return { error: "UUID Bitunix sudah terdaftar!" };
        }

        const hashedPassword = hashPassword(password);

        await createPendingUser({
            name,
            email,
            password: hashedPassword,
            uuidBitunix,
        });

        return { success: "Registrasi berhasil! Tunggu verifikasi admin." };
    } catch (error) {
        console.error("Registration Error:", error);
        return { error: "Terjadi kesalahan pada server. Silakan coba lagi." };
    }
}

export async function registerBitunixUserFromForm(formData) {
    const result = await registerBitunixUser({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        uuidBitunix: formData.get("uuidBitunix"),
    });

    if (result?.data?.success) {
        return { success: result.data.success };
    }

    return { error: getFirstActionError(result, "Registrasi gagal.") };
}
