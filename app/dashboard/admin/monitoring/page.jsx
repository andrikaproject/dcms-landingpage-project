"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthProvider";
import MonitoringWorkspace from "./MonitoringWorkspace";

export default function MonitoringPage() {
    return <AuthGuard admin>
        <main className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-center">
                    <div>
                        <Link href="/dashboard" className="mb-2 flex min-h-11 items-center text-sm text-blue-400 hover:underline">← Back to Dashboard</Link>
                        <h1 className="font-nebulica text-[clamp(1.5rem,1.3rem+1vw,1.875rem)] font-bold">Monitoring &amp; Logs</h1>
                        <p className="mt-1 text-sm text-zinc-400">Error website dan aktivitas user, dikelompokkan per hari.</p>
                    </div>
                    <nav aria-label="Halaman admin" className="flex flex-wrap gap-2">
                        <Link href="/dashboard/admin/users" className="flex min-h-11 items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300">Management User →</Link>
                        <Link href="/dashboard/admin/api-docs" className="flex min-h-11 items-center rounded-md border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-300">API Documentation →</Link>
                        <Link href="/dashboard/admin/adaptive-gate" className="flex min-h-11 items-center rounded-md border border-[#B7FB5B]/25 bg-[#B7FB5B]/10 px-3 py-2 text-xs font-bold text-[#B7FB5B]">Adaptive Gate →</Link>
                    </nav>
                </header>
                <MonitoringWorkspace />
            </div>
        </main>
    </AuthGuard>;
}
