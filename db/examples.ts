import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { users, type NewUser } from "./schema";

export async function createUser(input: Omit<NewUser, "id" | "createdAt" | "updatedAt">) {
  const now = new Date();

  await db.insert(users).values({
    ...input,
    createdAt: now,
    updatedAt: now,
  });

  return getUserByEmail(input.email);
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function getUserWithLockedSignals(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      lockedSignals: true,
    },
  });
}

export async function listUsers() {
  return db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  });
}

export async function updateUserStatus(
  userId: string,
  statusReview: "NONE" | "PENDING" | "APPROVED" | "REJECTED",
) {
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

export async function deleteUser(userId: string) {
  return db.delete(users).where(eq(users.id, userId));
}
