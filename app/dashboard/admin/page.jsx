import DashboardShell from "@/components/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthProvider";
import AdminPanel from "./AdminPanel";

export const metadata = { title: "Panel admin" };

export default function AdminPanelPage() {
    return (
        <DashboardShell>
            <AuthGuard admin>
                <AdminPanel />
            </AuthGuard>
        </DashboardShell>
    );
}
