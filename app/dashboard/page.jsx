"use client";
import Link from "next/link";
import { Button } from "../../components/Button";

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden px-4">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#B7FB5B]/5 rounded-full blur-[128px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
                {/* Logo */}
                <div className="mb-12">
                    <img
                        src="/images/logo-dcms.svg"
                        alt="Logo DCMS"
                        className="w-24 h-24 md:w-32 md:h-32 opacity-90"
                    />
                </div>

                {/* Main Message */}
                <h1
                    className="text-4xl md:text-6xl font-bold mb-6 tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent"
                    style={{ fontFamily: 'Nebulica, serif' }}
                >
                    Page ini dalam Pembangunan
                </h1>

                {/* Subtext */}
                <p
                    className="text-xl md:text-2xl text-gray-400 mb-12 font-light"
                    style={{ fontFamily: 'Chakra Petch, serif' }}
                >
                    stay tuned ya
                </p>

                {/* Action */}
                <Link href="/">
                    <Button className="px-8 h-12 text-md hover:scale-105 transition-transform">
                        Kembali ke Beranda
                    </Button>
                </Link>

                {/* Footer Badge */}
                <div className="mt-16 pt-8 border-t border-white/5 w-full">
                    <span className="text-sm tracking-[0.2em] text-[#B7FB5B]/60 font-mono uppercase">
                        DCMS • Elite Trading Community
                    </span>
                </div>
            </div>
        </div>
    );
}