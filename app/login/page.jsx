"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function LoginPage() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [popupMessage, setPopupMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef(null);
    const router = useRouter();

    const closePopup = () => {
        setPopupMessage("");
        inputRef.current?.focus();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setIsSuccess(false);

        const trimmedIdentifier = identifier.trim();

        if (!trimmedIdentifier) {
            setError("UID Bitunix atau username harus diisi.");
            inputRef.current?.focus();
            return;
        }

        if (!password) {
            setError("Password harus diisi.");
            return;
        }

        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                loginIdentifier: trimmedIdentifier,
                uid: trimmedIdentifier,
                password,
                redirect: false,
            });

            if (result?.ok) {
                setIsSuccess(true);
                router.replace("/dashboard");
                router.refresh();
                return;
            }

            setPopupMessage("Gagal login. Pastikan UID Bitunix atau username sudah terdaftar dan password benar.");
        } catch (error) {
            setPopupMessage(
                error.message ||
                "Terjadi kendala saat login. Silakan coba beberapa saat lagi."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#23252a_0%,#111315_100%)] font-nebulica text-white">
            <div className="mx-auto flex min-h-dvh w-full flex-col gap-6 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[minmax(560px,1.08fr)_minmax(460px,0.92fr)] lg:items-stretch lg:gap-[clamp(2rem,4.5vw,5.5rem)] lg:px-[clamp(1.5rem,2vw,2.5rem)] lg:py-6 xl:grid-cols-[minmax(680px,1.18fr)_minmax(520px,0.82fr)]">
                <section
                    aria-label="DCMS community"
                    className="relative min-h-[280px] overflow-hidden rounded-xl bg-[#262631] px-[clamp(1.5rem,4vw,4.5rem)] py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:min-h-[420px] lg:min-h-0 lg:px-[clamp(2.5rem,5vw,6rem)]"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_6%,rgba(255,255,255,0.07),transparent_16%),radial-gradient(circle_at_90%_4%,rgba(183,251,91,0.13),transparent_18%),radial-gradient(circle_at_88%_94%,rgba(183,251,91,0.12),transparent_23%),radial-gradient(circle_at_4%_96%,rgba(255,255,255,0.09),transparent_21%)]" />
                    <div className="absolute left-[clamp(1.5rem,4vw,5rem)] top-[24%] h-24 w-24 rounded-[28px] bg-white/[0.035] [clip-path:polygon(50%_0%,100%_27%,100%_73%,50%_100%,0%_73%,0%_27%)] sm:h-[124px] sm:w-[124px] xl:h-[148px] xl:w-[148px]" />
                    <div className="absolute bottom-0 left-0 right-0 h-[48%] bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.16)_1px,transparent_1.5px)] [background-size:clamp(52px,5vw,76px)_clamp(48px,4vw,64px)] opacity-25" />
                    <div className="absolute right-[clamp(1rem,3vw,4rem)] top-[42%] hidden h-28 w-28 rotate-45 border-8 border-white/[0.035] sm:block xl:h-36 xl:w-36" />
                    <Image
                        src="/images/logo-dcms.svg"
                        alt=""
                        width={420}
                        height={459}
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-[7%] right-[8%] hidden w-[min(34vw,460px)] opacity-[0.025] xl:block"
                    />
                    <div className="absolute -bottom-28 -left-28 h-[360px] w-[360px] rounded-full bg-[#b7fb5b]/5 blur-3xl xl:h-[460px] xl:w-[460px]" />
                    <div className="absolute -right-28 -top-28 h-[360px] w-[360px] rounded-full bg-[#b7fb5b]/6 blur-3xl xl:h-[460px] xl:w-[460px]" />

                    <div className="relative z-10 flex h-full min-h-[220px] items-center justify-center text-center lg:min-h-0">
                        <div className="max-w-[720px]">
                            <h2 className="font-nebulica text-[clamp(1.45rem,2.15vw,2.25rem)] font-bold leading-tight tracking-normal text-white">
                                You&apos;re In Good Community To Growing Up Together
                            </h2>
                            <p className="mx-auto mt-5 max-w-[620px] font-nebulica text-[clamp(1rem,1vw,1.125rem)] font-medium leading-7 tracking-normal text-[#717680]">
                                Thousands of other traders already joined our Community to
                                <span className="hidden sm:inline"><br /></span> change the way the world trades.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    aria-labelledby="login-title"
                    className="relative mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center py-6 lg:mx-0 lg:min-h-0 lg:max-w-none lg:py-12"
                >
                    <div className="pointer-events-none absolute inset-y-10 -left-8 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" />
                    <div className="pointer-events-none absolute right-[3%] top-[20%] hidden h-28 w-28 rounded-full bg-[#abe957]/10 blur-3xl xl:block" />
                    <div className="pointer-events-none absolute bottom-[19%] right-[9%] hidden h-28 w-28 rounded-full border-[18px] border-[#abe957]/30 opacity-70 xl:block" />

                    <div className="mx-auto flex w-full max-w-[clamp(25.25rem,34vw,34rem)] flex-col items-center gap-6">
                        <div className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-lg border border-[#bdef7a] bg-[#b7fb5b] p-3 opacity-95 shadow-[0_1px_4px_rgba(66,138,255,0.2),inset_0_-2px_4px_-1px_white]">
                            <Image
                                src="/images/logo-dcms.svg"
                                alt="DCMS"
                                width={48}
                                height={48}
                                className="h-12 w-12 invert"
                                priority
                            />
                        </div>

                        <div className="w-full text-center">
                            <h1
                                id="login-title"
                                className="font-nebulica text-[clamp(2rem,4vw,2.25rem)] font-bold leading-10 tracking-normal text-white"
                            >
                                Sign in to your account
                            </h1>
                            <p className="mt-3 font-nebulica text-lg font-medium leading-7 tracking-normal text-[#656575]">
                                Enter your details to sign in
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="loginIdentifier" className="flex items-center gap-0.5 font-nebulica text-sm font-bold leading-5 text-white">
                                    Enter UID Bitunix / Username
                                    <span className="text-[#b7fb5b]">*</span>
                                </label>
                                <input
                                    ref={inputRef}
                                    id="loginIdentifier"
                                    name="loginIdentifier"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="6728198212 or panjoel0081"
                                    aria-describedby="loginError"
                                    value={identifier}
                                    onChange={(event) => setIdentifier(event.target.value)}
                                    className="h-11 w-full rounded-lg border border-[#d5d7da] bg-white px-3 font-nebulica text-base font-medium leading-6 text-[#181d27] shadow-[0_1px_1px_rgba(10,13,18,0.05)] outline-none transition placeholder:text-[#717680] focus:border-[#b7fb5b] focus:shadow-[0_0_0_4px_rgba(183,251,91,0.18)]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <label htmlFor="passwordInput" className="flex items-center gap-0.5 font-nebulica text-sm font-bold leading-5 text-white">
                                        Password
                                        <span className="text-[#b7fb5b]">*</span>
                                    </label>
                                    <Link href="/forgot-password" className="text-sm font-bold text-[#b7fb5b] underline decoration-[#b7fb5b] underline-offset-2 transition hover:text-[#c8ff7e]">
                                        Lupa password?
                                    </Link>
                                </div>
                                <input
                                    id="passwordInput"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="*********************"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="h-11 w-full rounded-lg border border-[#d5d7da] bg-white px-3 font-nebulica text-base font-medium leading-6 text-[#181d27] shadow-[0_1px_1px_rgba(10,13,18,0.05)] outline-none transition placeholder:text-[#717680] focus:border-[#b7fb5b] focus:shadow-[0_0_0_4px_rgba(183,251,91,0.18)]"
                                />
                            </div>

                            <p id="loginError" role="alert" className="min-h-5 font-nebulica text-sm font-bold text-[#ff6b6b]">
                                {error}
                            </p>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#abe957] px-4 font-nebulica text-sm font-bold leading-5 text-[#181d27] shadow-[0_1px_2px_rgba(6,161,246,0.2),inset_0_1px_2px_rgba(255,255,255,0.24)] transition hover:bg-[#b7fb5b] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isLoading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>

                        {isSuccess && (
                            <div className="w-full rounded-lg border border-[#abe957]/30 bg-[#abe957]/10 p-3 font-nebulica text-sm text-[#d7ffad]">
                                Login berhasil. Mengarahkan ke dashboard.
                            </div>
                        )}

                        <p className="font-nebulica text-base font-medium leading-5 text-white">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="font-bold text-[#abe957] underline decoration-[#abe957] underline-offset-2 transition hover:text-[#c8ff7e]">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </section>
            </div>

            <div className="pointer-events-none absolute bottom-6 left-0 hidden w-full justify-center lg:flex">
                <p className="flex items-center gap-2 font-nebulica text-base font-medium leading-6 text-white">
                    <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full border border-white text-[10px] leading-none">
                        &copy;
                    </span>
                    2026 Diskusi Crypto Micin Saham
                </p>
            </div>

            {popupMessage && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) closePopup();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="popupTitle"
                        className="w-[min(100%,420px)] rounded-lg border border-white/10 bg-[#181d27] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
                    >
                        <h2 id="popupTitle" className="mb-2.5 font-nebulica text-2xl font-bold text-white">
                            Login gagal
                        </h2>
                        <p className="font-nebulica font-medium leading-relaxed text-[#a4a7ae]">{popupMessage}</p>
                        <button
                            type="button"
                            onClick={closePopup}
                            className="mt-6 h-[42px] w-full rounded-lg bg-[#abe957] px-5 font-nebulica text-sm font-bold text-[#181d27] transition hover:bg-[#b7fb5b] active:translate-y-px"
                        >
                            Coba lagi
                        </button>
                    </section>
                </div>
            )}
        </main>
    );
}
