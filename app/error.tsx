"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getAppReporter } from "@/lib/monitoring/app-reporter";
import { normalizeError } from "@/lib/monitoring/client-error-reporter";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        getAppReporter().report({ type: "CLIENT_RENDER_ERROR", ...normalizeError(error), digest: error.digest, details: { scope: "route" } });
    }, [error]);

    return <main className="grid min-h-dvh place-items-center bg-black p-4 font-chakra text-white">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center sm:p-8">
            <h1 className="font-nebulica text-2xl font-bold">Terjadi kesalahan</h1>
            <p className="mt-3 text-zinc-400">Halaman ini gagal dimuat. Coba lagi atau kembali ke dashboard.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-[#B7FB5B] px-4 font-bold text-black">Coba lagi</button>
                <Link href="/dashboard" className="flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 text-sm">Kembali ke dashboard</Link>
            </div>
        </section>
    </main>;
}
