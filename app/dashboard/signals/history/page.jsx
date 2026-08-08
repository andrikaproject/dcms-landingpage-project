import DashboardShell from "@/components/DashboardShell";
import SignalHistoryList from "./SignalHistoryList";

export const metadata = { title: "Signal History — DCMS" };

export default function SignalHistoryPage() {
    return (
        <DashboardShell>
            <SignalHistoryList />
        </DashboardShell>
    );
}
