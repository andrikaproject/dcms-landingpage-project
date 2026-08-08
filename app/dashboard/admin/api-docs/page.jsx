"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthProvider";
import { API_BASE_URL } from "@/lib/api/client";

export default function AdminApiDocumentationPage() {
    const apiOrigin = API_BASE_URL.replace(/\/v1$/, "");
    return (
        <AuthGuard admin>
            <main className="grid min-h-dvh place-items-center bg-black p-6 font-chakra text-white">
                <section className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10">
                    <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">← Kembali ke Dashboard</Link>
                    <p className="mt-8 text-xs font-bold uppercase tracking-[0.28em] text-[#B7FB5B]">DCMS Express API</p>
                    <h1 className="mt-3 font-nebulica text-3xl font-bold">API Documentation</h1>
                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        Kontrak resmi sekarang disajikan langsung oleh backend Express agar dokumentasi, schema Zod, dan route yang berjalan tetap sinkron.
                    </p>
                    <div className="mt-8 rounded-xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-xs uppercase text-zinc-600">Base URL frontend</p>
                        <code className="mt-2 block break-all text-sm text-[#B7FB5B]">{API_BASE_URL}</code>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <a href={`${apiOrigin}/docs`} target="_blank" rel="noreferrer" className="grid min-h-11 place-items-center rounded-lg bg-[#B7FB5B] px-5 text-sm font-bold text-black">Buka dokumentasi interaktif</a>
                        <a href={`${apiOrigin}/docs/openapi.json`} target="_blank" rel="noreferrer" className="grid min-h-11 place-items-center rounded-lg border border-zinc-700 px-5 text-sm font-bold text-zinc-300">Buka OpenAPI JSON</a>
                    </div>
                </section>
            </main>
        </AuthGuard>
    );
}
