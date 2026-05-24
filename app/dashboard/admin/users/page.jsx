import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/users";
import { updateUserStatus, deleteUser } from "@/app/actions/admin";
import Link from "next/link";

export default async function AdminUsersPage() {
    const session = await auth();

    // Proteksi: Hanya Admin
    if (!session || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    // Ambil semua user (bisa ditambahkan pagination nanti)
    const users = await listUsers();

    const pendingUsers = users.filter(u => u.statusReview === "PENDING");
    const otherUsers = users.filter(u => u.statusReview !== "PENDING" && u.role !== "ADMIN");

    return (
        <div className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-zinc-800 pb-5 sm:mb-10 sm:flex-row sm:items-center">
                    <div>
                        <Link href="/dashboard" className="mb-2 flex min-h-11 items-center gap-2 text-sm text-blue-500 hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                            Back to Dashboard
                        </Link>
                        <h1 className="font-nebulica text-[clamp(1.5rem,1.3rem+1vw,1.875rem)] font-bold">Management User</h1>
                        <p className="text-sm text-zinc-500">Review dan Kelola status member DCMS.</p>
                    </div>
                </header>

                {/* SECTION: PENDING USERS */}
                <section className="mb-12">
                    <h2 className="mb-6 flex items-center gap-3 text-[clamp(1.125rem,1rem+0.625vw,1.25rem)] font-bold">
                        Pending Verification
                        <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
                    </h2>

                    {pendingUsers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-zinc-600 sm:p-10">
                            Tidak ada user yang menunggu verifikasi.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {pendingUsers.map(user => (
                                <UserRow key={user.id} user={user} isPending={true} />
                            ))}
                        </div>
                    )}
                </section>

                {/* SECTION: OTHER USERS */}
                <section>
                    <h2 className="mb-6 text-[clamp(1.125rem,1rem+0.625vw,1.25rem)] font-bold text-zinc-500">Member List</h2>
                    <div className="grid gap-4">
                        {otherUsers.map(user => (
                            <UserRow key={user.id} user={user} isPending={false} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

function UserRow({ user, isPending }) {
    return (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 sm:p-5 md:flex-row md:items-center">
            <div className="min-w-0 flex flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span className="max-w-full truncate font-bold text-white">{user.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${user.statusReview === 'APPROVED' ? 'bg-green-500/10 text-green-500 border border-green-500/50' :
                            user.statusReview === 'REJECTED' ? 'bg-red-500/10 text-red-500 border border-red-500/50' :
                                'bg-blue-500/10 text-blue-500 border border-blue-500/50'
                        }`}>
                        {user.statusReview}
                    </span>
                </div>
                <div className="flex min-w-0 flex-col text-sm text-zinc-500">
                    <span className="break-all">Email: {user.email}</span>
                    <span className="mt-1 break-all font-mono text-xs text-zinc-400">UUID Bitunix: <span className="text-blue-400">{user.uuidBitunix || "N/A"}</span></span>
                </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
                {isPending ? (
                    <>
                        <form action={async () => {
                            "use server";
                            await updateUserStatus(user.id, "APPROVED");
                        }} className="min-w-0 md:flex-none">
                            <button className="min-h-11 w-full rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-green-900/20 transition-all hover:bg-green-500">
                                APPROVE
                            </button>
                        </form>
                        <form action={async () => {
                            "use server";
                            await updateUserStatus(user.id, "REJECTED");
                        }} className="min-w-0 md:flex-none">
                            <button className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 transition-all hover:bg-red-900/50 hover:text-red-500">
                                REJECT
                            </button>
                        </form>
                    </>
                ) : (
                    <form action={async () => {
                        "use server";
                        await deleteUser(user.id);
                    }} className="col-span-2 min-w-0 md:flex-none">
                        <button className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-600 transition-all hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-500">
                            DELETE
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
