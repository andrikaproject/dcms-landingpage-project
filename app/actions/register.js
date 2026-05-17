"use server";

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";

export async function registerUser(formData) {
    const name = formData.get("name");
    const email = formData.get("email") || `dummy-${Date.now()}@dcms.com`; // Fallback dummy email as requested
    const password = formData.get("password");
    const uuidBitunix = formData.get("uuidBitunix");

    if (!name || !password || !uuidBitunix) {
        return { error: "Semua field harus diisi!" };
    }

    try {
        // 1. Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        });

        if (existingEmail) {
            return { error: "Email sudah terdaftar!" };
        }

        // 2. Check if UUID already exists
        const existingUUID = await prisma.user.findUnique({
            where: { uuidBitunix },
        });

        if (existingUUID) {
            return { error: "UUID Bitunix sudah terdaftar!" };
        }

        // 3. Hash Password
        const hashedPassword = hashPassword(password);

        // 4. Create User
        // Default role: USER, statusReview: PENDING
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                uuidBitunix,
                role: "USER",
                statusReview: "PENDING",
            },
        });

        return { success: "Registrasi berhasil! Tunggu verifikasi admin." };
    } catch (error) {
        console.error("Registration Error:", error);
        return { error: "Terjadi kesalahan pada server. Silakan coba lagi." };
    }
}
