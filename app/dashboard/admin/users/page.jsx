import { redirect } from "next/navigation";

// Review user sudah tidak dipakai; tautan lama diarahkan ke Panel admin.
export default function AdminUsersPage() {
    redirect("/dashboard/admin");
}
