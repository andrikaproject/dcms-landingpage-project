"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { deleteUserById, updateUserApprovalStatus } from "@/lib/users";

/**
 * Update user approval status (APPROVED/REJECTED/NONE)
 * Only accessible by ADMIN
 */
export async function updateUserStatus(userId, newStatus) {
    const session = await auth();

    // 1. Security check: Only Admin can perform this
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Hanya Admin yang bisa melakukan ini.");
    }

    if (!["APPROVED", "REJECTED", "NONE", "PENDING"].includes(newStatus)) {
        throw new Error("Invalid status.");
    }

    try {
        await updateUserApprovalStatus(userId, newStatus);

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to update user status:", error);
        return { error: "Gagal mengupdate status user." };
    }
}

/**
 * Delete a user
 * Only accessible by ADMIN
 */
export async function deleteUser(userId) {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized.");
    }

    try {
        await deleteUserById(userId);

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete user:", error);
        return { error: "Gagal menghapus user." };
    }
}
