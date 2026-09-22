"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// Kontrol form auth, nilainya diambil dari token export Figma: input slate-900
// dengan garis slate-700 radius 8, tombol utama primary-300 radius 24, label
// primary-50. Tinggi kontrol dinaikkan di layar sempit supaya target sentuh
// tetap 44px, lalu turun ke ukuran Figma mulai lg.

const FIELD_BASE =
    "h-11 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 text-sm font-normal leading-5 text-white shadow-[0_1px_2px_0_rgba(9,15,13,0.1)] outline-none transition placeholder:text-[#94A3B8] focus:border-[#9BF12A] focus:shadow-[0_0_0_3px_rgba(155,241,42,0.25)] disabled:cursor-not-allowed disabled:opacity-60 lg:h-9";

const PRIMARY_BUTTON =
    "h-12 w-full rounded-[24px] bg-[#B7FB5B] px-[18px] text-sm font-semibold leading-5 text-[#173102] transition hover:bg-[#9BF12A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7FFE6] active:translate-y-px lg:h-10";

export function AuthField({ id, label, hint, inputRef, trailing, className = "", ...inputProps }) {
    const input = <input id={id} ref={inputRef} className={`${FIELD_BASE} ${className}`} {...inputProps} />;

    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-sm font-bold leading-5 text-[#F7FFE6]">
                {label}
            </label>
            {trailing ? (
                <div className="relative">
                    {input}
                    {trailing}
                </div>
            ) : (
                input
            )}
            {hint && <p className="text-xs font-medium leading-4 text-[#94A3B8]">{hint}</p>}
        </div>
    );
}

// Ikon mata dari frame SignUp. Area tekannya setinggi input (44px di layar sempit,
// 36px mulai lg), bukan hanya ikon 20px. Label tetap "Show password" dan statusnya
// dibawa aria-pressed, karena label yang ikut berganti membuat pembaca layar
// mengumumkan dua hal yang saling bertentangan.
export function AuthPasswordField({ id, ...fieldProps }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <AuthField
            {...fieldProps}
            id={id}
            type={isVisible ? "text" : "password"}
            className="pr-11 lg:pr-9"
            trailing={
                <button
                    type="button"
                    onClick={() => setIsVisible((visible) => !visible)}
                    aria-label="Show password"
                    aria-controls={id}
                    aria-pressed={isVisible}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-[#94A3B8] transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#B7FB5B] lg:w-9"
                >
                    {isVisible ? <EyeSlash aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
                </button>
            }
        />
    );
}

// Checkbox bawaan browser tampil putih dan lepas dari palet gelap, jadi kotaknya
// digambar sendiri. Input aslinya tetap dipakai agar Tab dan Space tetap jalan.
export function AuthCheckbox({ id, label, ...inputProps }) {
    return (
        <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm font-bold leading-5 text-[#F7FFE6]">
            <span className="relative grid size-4 shrink-0 place-items-center">
                <input
                    id={id}
                    type="checkbox"
                    className="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-[#334155] bg-[#0F172A] transition checked:border-[#9BF12A] checked:bg-[#9BF12A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]"
                    {...inputProps}
                />
                <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="pointer-events-none absolute size-3 opacity-0 transition peer-checked:opacity-100"
                >
                    <path d="M2.5 6.2 4.8 8.5 9.5 3.8" fill="none" stroke="#173102" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            {label}
        </label>
    );
}

// Frame login dan signup di Figma berbeda kapitalisasi dan warna tab aktif. Satu
// komponen dipakai di keduanya supaya tab tidak berubah rupa saat pindah halaman.
export function AuthTabs({ active }) {
    const tabs = [
        { key: "signin", label: "Sign In", href: "/login" },
        { key: "signup", label: "Sign Up", href: "/register" },
    ];

    return (
        <div className="flex h-[54px] w-full items-center gap-1 rounded-[10px] border border-[#334155] bg-[#0F172A] p-1 lg:h-[46px]">
            {tabs.map((tab) => {
                const isActive = tab.key === active;

                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`grid h-full flex-1 place-items-center rounded-md px-2.5 text-sm leading-5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B] ${
                            isActive
                                ? "bg-[#9BF12A] font-bold text-[#173102] shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1),0_1px_3px_0_rgba(0,0,0,0.1)]"
                                : "font-normal text-[#94A3B8] hover:bg-white/5 hover:text-white"
                        }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}

export function AuthSubmitButton({ children, isBusy = false, busyLabel, ...props }) {
    return (
        <button
            type="submit"
            aria-busy={isBusy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[24px] bg-[#B7FB5B] px-[18px] text-sm font-semibold leading-5 text-[#173102] shadow-[0_1px_1px_0_rgba(0,0,0,0.12),0_0_0_1px_rgba(103,110,118,0.16),0_2px_5px_0_rgba(103,110,118,0.08)] transition hover:bg-[#9BF12A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7FFE6] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 lg:h-10"
            {...props}
        >
            {isBusy ? (
                <>
                    <span className="size-4 rounded-full border-2 border-[#173102]/30 border-t-[#173102] motion-safe:animate-spin" />
                    {busyLabel}
                </>
            ) : (
                children
            )}
        </button>
    );
}

// Respons server tampil sebagai dialog, bukan teks inline, karena isinya bukan
// soal satu field tertentu. Escape dan klik latar selalu menutup; tombol utama
// menjalankan onAction, atau ikut menutup kalau onAction tidak diberikan.
export function AuthDialog({ title, message, actionLabel = "Coba lagi", onAction, onClose, children }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape") onClose();
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="authDialogTitle"
                aria-describedby="authDialogMessage"
                className="w-[min(100%,420px)] rounded-3xl border border-[#334155] bg-[#0F172A] p-7 font-nebulica shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
            >
                <h2 id="authDialogTitle" className="mb-2.5 text-xl font-bold leading-7 text-white">
                    {title}
                </h2>
                <p id="authDialogMessage" className="text-sm font-normal leading-5 text-[#94A3B8]">
                    {message}
                </p>
                {children}
                <button type="button" onClick={onAction ?? onClose} autoFocus className={`mt-6 ${PRIMARY_BUTTON}`}>
                    {actionLabel}
                </button>
            </section>
        </div>
    );
}

export function AuthSuccessOverlay({ title, message, note }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-50 grid place-items-center bg-[#0A0A0A]/95 p-6 font-nebulica backdrop-blur-md"
        >
            <div className="flex w-[min(100%,360px)] flex-col items-center gap-5 text-center">
                <div className="relative grid size-16 place-items-center rounded-2xl border border-[#BDEF7A] bg-[#B7FB5B]">
                    <Image src="/images/logo-dcms.svg" alt="" width={38} height={38} aria-hidden="true" className="size-10 invert" />
                    <span className="absolute inset-0 rounded-2xl border border-[#B7FB5B]/50 motion-safe:animate-ping" />
                </div>
                <div>
                    <p className="text-xl font-bold leading-7 text-white">{title}</p>
                    <p className="mt-2 text-sm font-normal leading-5 text-[#94A3B8]">{message}</p>
                    {note && <p className="mt-1 text-sm font-normal leading-5 text-[#94A3B8]">{note}</p>}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-2/3 rounded-full bg-[#B7FB5B] motion-safe:animate-[loadingBar_1.2s_ease-in-out_infinite]" />
                </div>
            </div>
        </div>
    );
}

export function AuthFootNote({ children }) {
    return <p className="text-center text-sm font-normal leading-5 text-[#94A3B8]">{children}</p>;
}

// inline-block supaya py-3 benar-benar menghasilkan area tekan 44px. Pada elemen
// inline tingginya dihitung dari tinggi font, jadi hanya 42px. -my-3 menjaga
// baris teks di sekitarnya tetap setinggi 20px.
export function AuthLink({ href, children, className = "" }) {
    return (
        <Link
            href={href}
            className={`-my-3 inline-block rounded py-3 font-bold text-[#B7FB5B] underline-offset-2 transition hover:text-[#9BF12A] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B] ${className}`}
        >
            {children}
        </Link>
    );
}
