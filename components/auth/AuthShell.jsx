"use client";

import Image from "next/image";
import Link from "next/link";

// Kerangka dua panel untuk seluruh halaman auth, diturunkan dari frame Figma
// [login]SignInAccount (1440x900): panel form 733 dan panel brand 639 dengan
// jarak 20. Rasio itu dipertahankan lewat grid fr, bukan lebar tetap, supaya
// ikut menyusut di layar sempit. Grid sengaja tidak diberi max-width: di Figma
// kedua panel mengisi frame sampai gutter 20, jadi di monitor lebar pun panel
// yang melebar, bukan latar kosong di kiri kanan. Lebar form tetap dikunci 511.

const RIBBON_WIDTH_RATIO = "211%";
const RIBBON_LEFT_OFFSET = "-108%";
// Lengkung pita ada di 34% tinggi render dan pita kuningnya habis di 48%. Tinggi
// render = 211% lebar x 9/16 = 118.7cqw, jadi 48% darinya = 57cqw. Pita diposisikan
// supaya tepi bawah area pita selalu jatuh di titik itu: naik di panel lebar dan
// pendek, turun di panel tinggi (form signup di HP) agar pita magenta di bawahnya
// tidak ikut tampil. Tepi atas render yang turun tertutup scrim yang hampir hitam.
const RIBBON_TOP = "calc(100cqh - 57cqw)";

function BrandMark() {
    return (
        <Link
            href="/"
            aria-label="Beranda DCMS"
            className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-lg p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B] sm:left-[22px] sm:top-[22px]"
        >
            <span className="grid size-9 place-items-center rounded-lg border border-[#BDEF7A] bg-white/[0.02] opacity-[0.92] shadow-[0_1px_4px_rgba(66,138,255,0.2),inset_0_-2px_4px_-1px_#FFFFFF]">
                {/* SVG logonya sudah putih; jangan di-invert di atas kotak gelap. */}
                <Image src="/images/logo-dcms.svg" alt="" width={20} height={20} className="size-5" priority />
            </span>
            <span className="text-[20px] font-bold leading-[26px] text-[#F7FFE6]">DCMS</span>
        </Link>
    );
}

// Render pita adalah karya brand milik produk. Di Figma ia jauh lebih lebar dari
// panelnya dan menembus tepi kiri bawah, jadi yang terlihat hanya potongan itu.
// Scrim di atasnya menjaga teks form tetap lolos kontras WCAG AA.
function RibbonWash() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[38%] overflow-hidden [container-type:size] sm:h-1/2">
            <Image
                src="/images/auth-ribbons-wash.webp"
                alt=""
                width={3840}
                height={2160}
                // Pita dirender 211% dari lebar panel, jadi sizes memakai lebar nyata
                // itu; kalau tidak, preload mengambil berkas yang salah ukuran. Panel
                // form kira-kira 53vw di lg dan 100vw di bawahnya.
                sizes="(min-width: 1024px) 113vw, 211vw"
                className="absolute max-w-none opacity-60"
                style={{ width: RIBBON_WIDTH_RATIO, left: RIBBON_LEFT_OFFSET, top: RIBBON_TOP }}
                // Pita ini terukur sebagai elemen LCP di desktop, jadi dimuat eager.
                priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.88)_45%,#000_92%)]" />
        </div>
    );
}

export function AuthBrandPanel() {
    return (
        <aside className="relative order-2 overflow-hidden rounded-3xl bg-black lg:order-none">
            {/* Di panel tinggi (lg) teks berdiri di atas render seperti di Figma. Di
                layar sempit panelnya pendek dan logo 3D yang putih terang persis jatuh
                di belakang wordmark, kontrasnya terukur 1.0:1. Karena itu di bawah lg
                gambar dan teks dipisah, bukan ditumpuk. */}
            <div className="relative h-[220px] sm:h-[280px] lg:absolute lg:inset-0 lg:h-auto">
                <Image
                    src="/images/auth-tiles-render.webp"
                    alt="Render tiga dimensi deretan tombol gelap dengan satu tombol hijau bertanda logo DCMS"
                    width={2200}
                    height={3000}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    // Tombol logo hijau ada di sekitar 52% / 38% render. Di panel yang
                    // lebar dan pendek, crop tengah memotong bagian atas tombol itu.
                    className="absolute inset-0 size-full object-cover object-[52%_38%]"
                    priority
                />
                <div className="absolute inset-0 hidden bg-[linear-gradient(to_top,#000_0%,rgba(0,0,0,0.88)_22%,rgba(0,0,0,0.45)_42%,rgba(0,0,0,0)_62%)] lg:block" />
            </div>
            <div className="relative p-5 lg:absolute lg:inset-x-5 lg:bottom-5 lg:max-w-[424px] lg:p-0">
                <p className="text-[clamp(1.5rem,2vw,1.875rem)] font-bold leading-9 tracking-[-0.2px] text-white">DCMS</p>
                <p className="text-[clamp(1.5rem,2vw,1.875rem)] font-bold leading-9 tracking-[-0.2px] text-white">
                    Diskusi Crypto Micin Saham
                </p>
                <p className="mt-2 text-xs font-medium leading-4 text-[#94A3B8]">
                    You&apos;re In Good Community To Growing Up Together, Thousands of other traders already joined our
                    Community to change the way the world trades.
                </p>
            </div>
        </aside>
    );
}

export default function AuthShell({ children, withRibbon = true }) {
    return (
        <main className="min-h-dvh bg-[#0A0A0A] p-5 font-nebulica text-white">
            <div className="grid w-full gap-5 lg:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[minmax(0,733fr)_minmax(0,639fr)]">
                {/* Di lg panel form masih sempit, heading bisa sekolom dengan logo dan
                    form signup cukup tinggi untuk menabraknya, jadi pt-24 menahannya di
                    bawah logo. Mulai xl heading sudah berada di kanan logo. */}
                <section className="relative order-1 overflow-hidden rounded-3xl bg-black px-5 pb-12 pt-24 sm:px-10 lg:order-none lg:px-14 lg:pb-16 lg:pt-24 xl:pt-16">
                    <BrandMark />
                    {withRibbon && <RibbonWash />}
                    <div className="relative z-10 flex min-h-full items-center justify-center">
                        <div className="w-full max-w-[511px]">{children}</div>
                    </div>
                </section>

                <AuthBrandPanel />
            </div>
        </main>
    );
}
