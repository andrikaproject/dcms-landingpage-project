import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { bitunixUsers } from "@/db/schema";
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
    const user = await db.query.bitunixUsers.findFirst({
        where: eq(bitunixUsers.uuidBitunix, uid),
    });

    return normalizeBitunixUser(user);
}

export async function findBitunixUserByUsername(username) {
    const normalizedUsername = String(username || "").trim();

    if (!normalizedUsername) return null;

    const user = await db.query.bitunixUsers.findFirst({
        where: eq(bitunixUsers.name, normalizedUsername),
    });

    return normalizeBitunixUser(user);
}

export async function findBitunixUserByIdentifier(identifier) {
    const normalizedIdentifier = String(identifier || "").trim();

    if (!normalizedIdentifier) return null;

    const user = await db.query.bitunixUsers.findFirst({
        where: or(
            eq(bitunixUsers.uuidBitunix, normalizedIdentifier),
            eq(bitunixUsers.name, normalizedIdentifier),
        ),
    });

    return normalizeBitunixUser(user);
}

export async function findBitunixUserByEmail(email) {
    const user = await db.query.bitunixUsers.findFirst({
        where: eq(bitunixUsers.email, email),
    });

    return normalizeBitunixUser(user);
}

export async function createBitunixUser({ uid, email, password, name, depositUsdtAmount, lastTradeAt }) {
    const now = new Date();

    await db.insert(bitunixUsers).values({
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
        bitunixVerifiedAt: now,
        bitunixLastCheckedAt: now,
        createdAt: now,
        updatedAt: now,
    });

    return findBitunixUserByUid(uid);
}

export async function listBitunixUsers() {
    const users = await db.query.bitunixUsers.findMany({
        columns: {
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
        orderBy: [desc(bitunixUsers.createdAt)],
    });

    return users.map(normalizeBitunixUser);
}

export async function findBitunixUserById(id) {
    const user = await db.query.bitunixUsers.findFirst({
        where: eq(bitunixUsers.id, BigInt(id)),
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

    data.updatedAt = new Date();

    await db
        .update(bitunixUsers)
        .set(data)
        .where(eq(bitunixUsers.id, BigInt(id)));

    return findBitunixUserById(id);
}

export async function deleteBitunixUser(id) {
    const [result] = await db
        .delete(bitunixUsers)
        .where(eq(bitunixUsers.id, BigInt(id)));

    return result?.affectedRows > 0;
}
