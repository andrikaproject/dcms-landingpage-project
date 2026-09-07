"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthProvider";
import { apiRequest } from "@/lib/api/client";

export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await apiRequest("/admin/users", { query: { page: 1, limit: 100 } });
            setUsers(data.items || []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Daftar user gagal dimuat.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    async function updateStatus(userId, statusReview) {
        await apiRequest(`/admin/users/${encodeURIComponent(userId)}/status`, { method: "PATCH", body: { statusReview } });
        setUsers((items) => items.map((item) => item.id === userId ? { ...item, statusReview } : item));
    }

    async function removeUser(userId) {
        await apiRequest(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
        setUsers((items) => items.filter((item) => item.id !== userId));
    }

    const pendingUsers = users.filter((user) => user.statusReview === "PENDING");
    const otherUsers = users.filter((user) => user.statusReview !== "PENDING" && user.role !== "ADMIN");

    return (
        <AuthGuard admin>
            <main className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
                <div className="mx-auto max-w-6xl">
                    <header className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-zinc-800 pb-5 sm:mb-10 sm:flex-row sm:items-center">
                        <div>
                            <Link href="/dashboard" className="mb-2 flex min-h-11 items-center gap-2 text-sm text-blue-500 hover:underline">← Back to Dashboard</Link>
                            <h1 className="font-nebulica text-[clamp(1.5rem,1.3rem+1vw,1.875rem)] font-bold">Management User</h1>
                            <p className="text-sm text-zinc-500">Review dan kelola status member DCMS.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/dashboard/admin/monitoring" className="rounded-md border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300">Monitoring &amp; Logs →</Link>
                            <Link href="/dashboard/admin/api-docs" className="rounded-md border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-300">API Documentation →</Link>
                            <Link href="/dashboard/admin/adaptive-gate" className="rounded-md border border-[#B7FB5B]/25 bg-[#B7FB5B]/10 px-3 py-2 text-xs font-bold text-[#B7FB5B]">Adaptive Gate Observability →</Link>
                        </div>
                    </header>

                    {loading && <p className="py-16 text-center text-zinc-500">Memuat user…</p>}
                    {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error} <button type="button" onClick={loadUsers} className="underline">Coba lagi</button></div>}
                    {!loading && !error && <>
                        <UserSection title="Pending Verification" users={pendingUsers} empty="Tidak ada user yang menunggu verifikasi." onStatus={updateStatus} onDelete={removeUser} pending />
                        <UserSection title="Member List" users={otherUsers} empty="Belum ada member." onStatus={updateStatus} onDelete={removeUser} />
                    </>}
                </div>
            </main>
        </AuthGuard>
    );
}

function UserSection({ title, users, empty, onStatus, onDelete, pending = false }) {
    return <section className="mb-12">
        <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-zinc-300">{title}<span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] text-white">{users.length}</span></h2>
        {users.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-600">{empty}</div> : <div className="grid gap-4">{users.map((user) => <UserRow key={user.id} user={user} onStatus={onStatus} onDelete={onDelete} pending={pending} />)}</div>}
    </section>;
}

function UserRow({ user, pending, onStatus, onDelete }) {
    const [busy, setBusy] = useState(false);
    async function act(callback) { setBusy(true); try { await callback(); } finally { setBusy(false); } }
    return <article className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 md:flex-row md:items-center">
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3"><strong>{user.name || "Member"}</strong><span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-bold">{user.statusReview}</span></div>
            <p className="break-all text-sm text-zinc-500">Email: {user.email}</p>
            <p className="break-all font-mono text-xs text-zinc-400">UUID Bitunix: <span className="text-blue-400">{user.uuidBitunix || "N/A"}</span></p>
        </div>
        <div className="flex gap-2">
            {pending ? <>
                <button type="button" disabled={busy} onClick={() => act(() => onStatus(user.id, "APPROVED"))} className="min-h-11 rounded-xl bg-green-600 px-4 text-xs font-bold disabled:opacity-50">APPROVE</button>
                <button type="button" disabled={busy} onClick={() => act(() => onStatus(user.id, "REJECTED"))} className="min-h-11 rounded-xl border border-zinc-700 px-4 text-xs font-bold text-zinc-400 disabled:opacity-50">REJECT</button>
            </> : <button type="button" disabled={busy} onClick={() => act(() => onDelete(user.id))} className="min-h-11 rounded-xl border border-red-900/50 px-4 text-xs font-bold text-red-500 disabled:opacity-50">DELETE</button>}
        </div>
    </article>;
}
