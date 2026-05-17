"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [debugResetUrl, setDebugResetUrl] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        setDebugResetUrl("");
        setError("");

        const response = await fetch("/api/password-reset/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const result = await response.json();

        if (!response.ok || result.error) {
            setError(result.error || "Tidak bisa mengirim link reset password.");
        } else {
            setMessage(result.success);
            setDebugResetUrl(result.debugResetUrl || "");
        }

        setLoading(false);
    }

    return (
        <main className="grid min-h-dvh place-items-center bg-[linear-gradient(180deg,#23252a_0%,#111315_100%)] px-4 py-8 font-nebulica text-white">
            <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111315]/80 p-6 shadow-2xl sm:p-8">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 grid size-16 place-items-center rounded-lg border border-[#bdef7a] bg-[#b7fb5b] p-3">
                        <Image src="/images/logo-dcms.svg" alt="DCMS" width={40} height={40} className="invert" />
                    </div>
                    <h1 className="text-2xl font-bold">Lupa Password</h1>
                    <p className="mt-2 text-sm font-medium leading-6 text-zinc-400">
                        Masukkan email akun DCMS kamu. Kami akan kirim link untuk membuat password baru.
                    </p>
                </div>

                {message && (
                    <div className="mb-5 rounded-lg border border-[#B7FB5B]/30 bg-[#B7FB5B]/10 p-3 text-sm font-medium text-[#d7ffad]">
                        {message}
                        {debugResetUrl && (
                            <Link
                                href={debugResetUrl}
                                className="mt-3 block break-all rounded-md border border-[#B7FB5B]/30 bg-black/20 p-2 font-bold text-[#B7FB5B] underline underline-offset-2"
                            >
                                Buka link reset dev
                            </Link>
                        )}
                    </div>
                )}

                {error && (
                    <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm font-medium text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="text-sm font-bold text-white">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="your@email.com"
                            className="h-12 w-full rounded-lg border border-[#d5d7da] bg-white px-3 text-base font-medium text-[#181d27] outline-none transition placeholder:text-[#717680] focus:border-[#b7fb5b] focus:shadow-[0_0_0_4px_rgba(183,251,91,0.18)]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-12 w-full rounded-lg bg-[#B7FB5B] px-4 text-sm font-bold text-[#181d27] transition hover:bg-[#a8ec4c] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {loading ? "Mengirim..." : "Kirim Link Reset"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm font-medium text-zinc-400">
                    Ingat password?{" "}
                    <Link href="/login" className="font-bold text-[#B7FB5B] underline underline-offset-2">
                        Login
                    </Link>
                </p>
            </section>
        </main>
    );
}
