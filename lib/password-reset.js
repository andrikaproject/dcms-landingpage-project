import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bitunixUsers, passwordResetTokens } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword } from "@/lib/utils";
import { findUserByEmail, updateUserPassword } from "@/lib/users";

const RESET_TOKEN_TTL_MINUTES = 60;

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeResetToken(token) {
    const rawToken = String(token || "").trim();

    if (!rawToken) return "";

    try {
        const url = new URL(rawToken);
        return String(url.searchParams.get("token") || "").trim();
    } catch {
        return rawToken;
    }
}

function isValidPassword(password) {
    return typeof password === "string" && password.length >= 8;
}

async function findResetAccount(email) {
    const bitunixUser = await db.query.bitunixUsers.findFirst({
        columns: { id: true, email: true },
        where: eq(bitunixUsers.email, email),
    });

    if (bitunixUser) {
        return {
            accountType: "BITUNIX",
            userId: String(bitunixUser.id),
            email: bitunixUser.email,
        };
    }

    const user = await findUserByEmail(email);

    if (user) {
        return {
            accountType: "USER",
            userId: user.id,
            email: user.email,
        };
    }

    return null;
}

export async function requestPasswordReset({ email, origin }) {
    const normalizedEmail = normalizeEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { ok: false, error: "Email tidak valid." };
    }

    const account = await findResetAccount(normalizedEmail);

    if (!account) {
        return { ok: true };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await db.insert(passwordResetTokens).values({
        email: account.email,
        accountType: account.accountType,
        userId: account.userId,
        tokenHash,
        expiresAt,
        createdAt: new Date(),
    });

    const resetUrl = `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;
    const emailResult = await sendPasswordResetEmail({
        to: account.email,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    return {
        ok: true,
        debugResetUrl: emailResult?.skipped ? resetUrl : undefined,
    };
}

export async function resetPasswordWithToken({ token, password }) {
    const rawToken = normalizeResetToken(token);

    if (!rawToken) {
        return { ok: false, error: "Token reset tidak valid." };
    }

    if (!isValidPassword(password)) {
        return { ok: false, error: "Password minimal 8 karakter." };
    }

    const tokenHash = hashToken(rawToken);
    const resetToken = await db.query.passwordResetTokens.findFirst({
        where: eq(passwordResetTokens.tokenHash, tokenHash),
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
        return { ok: false, error: "Link reset password sudah tidak valid atau kedaluwarsa." };
    }

    const passwordHash = hashPassword(password);

    if (resetToken.accountType === "BITUNIX") {
        await db
            .update(bitunixUsers)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(bitunixUsers.id, BigInt(resetToken.userId)));
    } else if (resetToken.accountType === "USER") {
        await updateUserPassword(resetToken.userId, passwordHash);
    } else {
        return { ok: false, error: "Tipe akun reset tidak dikenali." };
    }

    const usedAt = new Date();

    await db
        .update(passwordResetTokens)
        .set({ usedAt })
        .where(eq(passwordResetTokens.id, resetToken.id));

    await db
        .update(passwordResetTokens)
        .set({ usedAt })
        .where(
            and(
                eq(passwordResetTokens.email, resetToken.email),
                eq(passwordResetTokens.accountType, resetToken.accountType),
                isNull(passwordResetTokens.usedAt),
            ),
        );

    return { ok: true };
}
