import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function findUserByEmail(email) {
    return db.query.users.findFirst({
        where: eq(users.email, email),
    });
}

export async function findUserByUuidBitunix(uuidBitunix) {
    return db.query.users.findFirst({
        where: eq(users.uuidBitunix, uuidBitunix),
    });
}

export async function createPendingUser({ name, email, password, uuidBitunix }) {
    const now = new Date();

    await db.insert(users).values({
        name,
        email,
        password,
        uuidBitunix,
        role: "USER",
        statusReview: "PENDING",
        createdAt: now,
        updatedAt: now,
    });

    return findUserByEmail(email);
}

export async function listUsers() {
    return db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
    });
}

export async function countPendingUsers() {
    const [result] = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.statusReview, "PENDING"));

    return result?.value || 0;
}

export async function updateUserApprovalStatus(userId, statusReview) {
    await db
        .update(users)
        .set({
            statusReview,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

    return db.query.users.findFirst({
        where: eq(users.id, userId),
    });
}

export async function updateUserPassword(userId, passwordHash) {
    await db
        .update(users)
        .set({
            password: passwordHash,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

export async function deleteUserById(userId) {
    const [result] = await db.delete(users).where(eq(users.id, userId));

    return result?.affectedRows > 0;
}
