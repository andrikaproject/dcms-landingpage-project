import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword } from "@/lib/utils";

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
    const bitunixUser = await prisma.bitunixUser.findUnique({
        where: { email },
        select: { id: true, email: true },
    });

    if (bitunixUser) {
        return {
            accountType: "BITUNIX",
            userId: String(bitunixUser.id),
            email: bitunixUser.email,
        };
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
    });

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

    await prisma.passwordResetToken.create({
        data: {
            email: account.email,
            accountType: account.accountType,
            userId: account.userId,
            tokenHash,
            expiresAt,
        },
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
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
        return { ok: false, error: "Link reset password sudah tidak valid atau kedaluwarsa." };
    }

    const passwordHash = hashPassword(password);

    if (resetToken.accountType === "BITUNIX") {
        await prisma.bitunixUser.update({
            where: { id: BigInt(resetToken.userId) },
            data: { passwordHash },
        });
    } else if (resetToken.accountType === "USER") {
        await prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: passwordHash },
        });
    } else {
        return { ok: false, error: "Tipe akun reset tidak dikenali." };
    }

    await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.updateMany({
        where: {
            email: resetToken.email,
            accountType: resetToken.accountType,
            usedAt: null,
        },
        data: { usedAt: new Date() },
    });

    return { ok: true };
}
