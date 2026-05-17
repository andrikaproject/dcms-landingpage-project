import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

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

export default async function DashboardUnderConstruction({ title, description }) {
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
            <main className="mx-auto flex min-h-dvh w-full max-w-[1200px] items-center px-4 py-8 sm:px-6 lg:px-8">
                <section className="w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="font-chakra text-xs font-bold uppercase tracking-[0.3em] text-[#B7FB5B]">
                                Under Construction
                            </p>
                            <h1 className="mt-4 font-nebulica text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight text-white">
                                {title}
                            </h1>
                            <p className="mt-4 font-chakra text-base leading-7 text-zinc-400 sm:text-lg">
                                {description || "Halaman ini masih dalam tahap pengembangan. Tim DCMS sedang menyiapkan fitur ini supaya nanti bisa dipakai dengan nyaman dan stabil."}
                            </p>
                        </div>

                        <div className="grid min-h-36 shrink-0 place-items-center rounded-2xl border border-[#B7FB5B]/20 bg-[#B7FB5B]/10 px-8 py-6 text-[#B7FB5B]">
                            <svg
                                className="size-16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4" />
                                <path d="M11 7 7 3 3 7l4 4" />
                                <path d="m13 17 4 4 4-4-4-4" />
                                <path d="M9.3 17.7a4 4 0 0 0 5.4-5.4" />
                            </svg>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/dashboard"
                            className="grid min-h-11 place-items-center rounded-lg bg-[#B7FB5B] px-5 font-chakra text-sm font-bold text-[#111315] transition hover:bg-[#a8ec4c] active:scale-95"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </section>
            </main>
        </DashboardShell>
    );
}
