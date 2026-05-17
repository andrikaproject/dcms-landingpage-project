import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";

function normalizeBitunixUser(user) {
    if (!user) return null;

    return {
        ...user,
        id: String(user.id),
        amountUsdt: user.amountUsdt?.toString() || null,
        lastTradeAt: user.lastTradeAt?.toISOString?.() || user.lastTradeAt || null,
    };
}

export async function findBitunixUserByUid(uid) {
    const user = await prisma.bitunixUser.findUnique({
        where: { uuidBitunix: uid },
    });

    return normalizeBitunixUser(user);
}

export async function findBitunixUserByUsername(username) {
    const normalizedUsername = String(username || "").trim();

    if (!normalizedUsername) return null;

    const user = await prisma.bitunixUser.findFirst({
        where: { name: normalizedUsername },
    });

    return normalizeBitunixUser(user);
}

export async function findBitunixUserByIdentifier(identifier) {
    const normalizedIdentifier = String(identifier || "").trim();

    if (!normalizedIdentifier) return null;

    const user = await prisma.bitunixUser.findFirst({
        where: {
            OR: [
                { uuidBitunix: normalizedIdentifier },
                { name: normalizedIdentifier },
            ],
        },
    });

    return normalizeBitunixUser(user);
}

export async function findBitunixUserByEmail(email) {
    const user = await prisma.bitunixUser.findUnique({
        where: { email },
    });

    return normalizeBitunixUser(user);
}

export async function createBitunixUser({ uid, email, password, name, depositUsdtAmount, lastTradeAt }) {
    const user = await prisma.bitunixUser.create({
        data: {
            uuidBitunix: uid,
            email,
            name: name || null,
            passwordHash: hashPassword(password),
            role: "BITUNIX",
            bitunixStatus: "VERIFIED",
            amountUsdt:
                depositUsdtAmount !== undefined && depositUsdtAmount !== null
                    ? String(depositUsdtAmount)
                    : null,
            lastTradeAt: lastTradeAt ? new Date(lastTradeAt) : null,
            bitunixVerifiedAt: new Date(),
            bitunixLastCheckedAt: new Date(),
        },
    });

    return normalizeBitunixUser(user);
}

export async function listBitunixUsers() {
    const users = await prisma.bitunixUser.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            uuidBitunix: true,
            email: true,
            name: true,
            role: true,
            bitunixStatus: true,
            amountUsdt: true,
            lastTradeAt: true,
            bitunixVerifiedAt: true,
            bitunixLastCheckedAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return users.map(normalizeBitunixUser);
}

export async function findBitunixUserById(id) {
    const user = await prisma.bitunixUser.findUnique({
        where: { id: BigInt(id) },
    });

    return normalizeBitunixUser(user);
}

export async function updateBitunixUser(id, { email, name, password }) {
    const data = {};

    if (email !== undefined) data.email = email;
    if (name !== undefined) data.name = name || null;
    if (password) data.passwordHash = hashPassword(password);

    if (Object.keys(data).length === 0) {
        return findBitunixUserById(id);
    }

    const user = await prisma.bitunixUser.update({
        where: { id: BigInt(id) },
        data,
    });

    return normalizeBitunixUser(user);
}

export async function deleteBitunixUser(id) {
    try {
        await prisma.bitunixUser.delete({
            where: { id: BigInt(id) },
        });

        return true;
    } catch (error) {
        if (error.code === "P2025") return false;
        throw error;
    }
}
