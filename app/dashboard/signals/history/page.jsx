import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import SignalHistoryList from "./SignalHistoryList";

export const metadata = { title: "Signal History — DCMS" };

export default async function SignalHistoryPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <DashboardShell
            user={{
                name: session.user.name,
                email: session.user.email,
                uuidBitunix: session.user.uuidBitunix,
                role: session.user.role,
            }}
        >
            <SignalHistoryList />
        </DashboardShell>
    );
}
