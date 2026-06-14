"use server";

import { z } from "zod";
import { findBitunixUserByIdentifier } from "@/lib/bitunix-users";
import { findUserByEmail } from "@/lib/users";
import { getFirstActionError } from "@/lib/action-result";
import { comparePassword } from "@/lib/utils";
import { actionClient, PublicActionError, rateLimitAction } from "@/lib/safe-action";

const loginSchema = z.object({
    loginIdentifier: z
        .string()
        .trim()
        .min(1, "UID Bitunix atau username harus diisi.")
        .max(120, "UID Bitunix atau username terlalu panjang."),
    password: z
        .string()
        .min(1, "Password harus diisi.")
        .max(128, "Password terlalu panjang."),
});

export const validateLoginCredentials = actionClient
    .use(
        rateLimitAction({
            keyPrefix: "login-credentials",
            limit: 8,
            windowMs: 10 * 60 * 1000,
            keyFromInput: ({ clientInput, ip }) => {
                const identifier = String(clientInput?.loginIdentifier || "").trim().toLowerCase();
                return identifier ? `${ip}:${identifier}` : ip;
            },
        })
    )
    .inputSchema(loginSchema)
    .action(async ({ parsedInput }) => {
        const identifier = parsedInput.loginIdentifier;

        // Primary: Bitunix user by UID or username
        const bitunixUser = await findBitunixUserByIdentifier(identifier);
        if (bitunixUser) {
            if (!comparePassword(parsedInput.password, bitunixUser.passwordHash)) {
                throw new PublicActionError("Password salah.");
            }
            return { success: true };
        }

        // Fallback: internal User table by email (for admin/staff accounts)
        if (identifier.includes("@")) {
            const internalUser = await findUserByEmail(identifier);
            if (internalUser && internalUser.password) {
                if (!comparePassword(parsedInput.password, internalUser.password)) {
                    throw new PublicActionError("Password salah.");
                }
                return { success: true };
            }
        }

        throw new PublicActionError(
            "Username / UID belum melakukan register. Harap register terlebih dahulu."
        );
    });

export async function validateLoginCredentialsFromForm(formData) {
    const result = await validateLoginCredentials({
        loginIdentifier: formData.get("loginIdentifier"),
        password: formData.get("password"),
    });

    if (result?.data?.success) {
        return { success: true };
    }

    return { error: getFirstActionError(result, "Login gagal.") };
}
