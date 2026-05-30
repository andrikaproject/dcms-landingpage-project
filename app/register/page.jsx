"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import gsap from "gsap";
import { registerBitunixUser } from "@/app/actions/register";
import { getFirstActionError } from "@/lib/action-result";

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { executeAsync, isExecuting } = useAction(registerBitunixUser);

    useEffect(() => {
        gsap.from(".register-card", {
            y: 20,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
        });
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        const formData = new FormData(e.target);
        const result = await executeAsync({
            name: formData.get("name"),
            uuidBitunix: formData.get("uuidBitunix"),
            email: formData.get("email"),
            password: formData.get("password"),
        });

        if (result?.data?.success) {
            setSuccess(result.data.success);
            setTimeout(() => {
                router.push("/login");
            }, 3000);
            return;
        }

        setError(getFirstActionError(result, "Registrasi gagal."));
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background pattern similar to landing page */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
            </div>

            <div className="register-card w-full max-w-md relative z-10">
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-10">
                        <Image
                            src="/images/logo-dcms.svg"
                            alt="DCMS Logo"
                            width={64}
                            height={64}
                            className="mb-4"
                        />
                        <h1 className="font-nebulica text-3xl font-bold text-white tracking-widest uppercase">DCMS</h1>
                        <p className="font-chakra text-zinc-500 mt-2 text-sm">Registrasi Member Baru</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
                            <span className="text-lg">⚠️</span>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
                            <span className="text-lg">✅</span>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
                            <input
                                name="name"
                                type="text"
                                required
                                placeholder="Masukkan nama lengkap"
                                className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">UUID Bitunix</label>
                            <input
                                name="uuidBitunix"
                                type="text"
                                required
                                placeholder="Contoh: 12345678"
                                className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="your@email.com"
                                className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                placeholder="••••••••"
                                className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isExecuting}
                            className="w-full bg-[#B7FB5B] text-black py-3 rounded-xl font-bold mt-6 hover:bg-[#a8ec4c] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(183,251,91,0.2)]"
                        >
                            {isExecuting ? "Sabar ya..." : "Daftar Sekarang"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-zinc-500 text-sm">
                            Sudah punya akun?{" "}
                            <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium ml-1">
                                Login di sini
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
