"use server";

import { hashPassword } from "@/lib/utils";
import {
    createPendingUser,
    findUserByEmail,
    findUserByUuidBitunix,
} from "@/lib/users";

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
