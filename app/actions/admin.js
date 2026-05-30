"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteUserById, updateUserApprovalStatus } from "@/lib/users";
import { adminActionClient, rateLimitAction } from "@/lib/safe-action";

const adminMutationRateLimit = rateLimitAction({
    keyPrefix: "admin-user-mutation",
    limit: 60,
    windowMs: 60 * 1000,
});

const userIdSchema = z.string().trim().uuid("User ID tidak valid.");

const updateUserStatusSchema = z.object({
    userId: userIdSchema,
    newStatus: z.enum(["APPROVED", "REJECTED", "NONE", "PENDING"]),
});

export const updateUserStatus = adminActionClient
    .use(adminMutationRateLimit)
    .inputSchema(updateUserStatusSchema)
    .action(async ({ parsedInput: { userId, newStatus } }) => {
        await updateUserApprovalStatus(userId, newStatus);

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    });

export const deleteUser = adminActionClient
    .use(adminMutationRateLimit)
    .inputSchema(z.object({ userId: userIdSchema }))
    .action(async ({ parsedInput: { userId } }) => {
        await deleteUserById(userId);

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    });
