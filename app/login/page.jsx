"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage("Gagal Login: " + error.message);
        } else {
            // Jika berhasil, lempar user ke Dashboard
            router.push("/dashboard");
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-[#050505] text-white">

            {/* LEFT SECTION - LOGIN FORM */}
            <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
                <div className="w-full max-w-md mx-auto">
                    {/* Header */}
                    <div className="mb-10">
                        <Link href="/" className="inline-block text-sm font-bold tracking-widest text-blue-500 uppercase mb-6">
                            DCMS • Community
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                            Selamat Datang Kembali
                        </h1>
                        <p className="text-gray-400">
                            Masuk untuk mengakses dashboard dan sinyal eksklusif.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="nama@email.com"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-gray-900 border-gray-800 focus:border-blue-500"
                        />
                        <div className="space-y-1">
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-gray-900 border-gray-800 focus:border-blue-500"
                            />
                            <div className="text-right">
                                <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                                    Lupa Password?
                                </Link>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-blue-900/20">
                                Masuk Sekarang
                            </Button>
                        </div>
                    </form>

                    {/* Error Message */}
                    {message && (
                        <div className="mt-6 p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-200 text-sm text-center">
                            {message}
                        </div>
                    )}

                    {/* Footer / Register Link */}
                    <p className="mt-8 text-center text-gray-400">
                        Belum punya akun?{' '}
                        <Link href="/register" className="font-semibold text-white hover:text-blue-400 transition-colors">
                            Daftar Member Baru
                        </Link>
                    </p>
                </div>
            </div>

            {/* RIGHT SECTION - PLACEHOLDER / ART */}
            <div className="hidden lg:flex flex-col justify-center items-center relative overflow-hidden bg-gray-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-gray-900 to-black border-l border-white/5">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]"></div>

                <div className="relative z-10 text-center px-12 max-w-lg">
                    <h2 className="text-4xl font-bold mb-6 leading-tight bg-gradient-to-br from-white to-gray-500 bg-clip-text text-transparent">
                        “Trading itu 90% Menunggu, 10% Eksekusi.”
                    </h2>
                    <p className="text-gray-400 text-lg font-light leading-relaxed">
                        Bergabunglah dengan ribuan trader lainnya yang memprioritaskan manajemen risiko di atas segalanya.
                    </p>
                </div>
            </div>

        </div>
    );
}