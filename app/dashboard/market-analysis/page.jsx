import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import MarketAnalysisWorkspace from "./MarketAnalysisWorkspace";

export const metadata = {
    title: "Market Analysis | DCMS",
    description: "Konteks level PDH, PDL, PWH, dan PWL dari Bitunix futures.",
};

function LogoutForm() {
    return (
        <form
            action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/login" });
            }}
        >
            <button
                className="grid size-10 place-items-center rounded-lg border border-[#36353d] bg-gradient-to-b from-[#25242a] to-[#17161c] text-[#949398] transition hover:text-white"
                aria-label="Logout"
            >
                <svg
                    className="size-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                </svg>
            </button>
        </form>
    );
}

export default async function MarketAnalysisPage() {
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
            logoutSlot={<LogoutForm />}
        >
            <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
                <MarketAnalysisWorkspace />
            </div>
        </DashboardShell>
    );
}
