"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthDialog, AuthField, AuthLink, AuthSubmitButton } from "@/components/auth/AuthControls";
import { apiRequest } from "@/lib/api/client";
import { getEmailError } from "@/lib/auth-form";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [dialog, setDialog] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const emailRef = useRef(null);

    const closeDialog = useCallback(() => {
        setDialog(null);
        emailRef.current?.focus();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const emailError = getEmailError(email);
        if (emailError) {
            setError(emailError);
            emailRef.current?.focus();
            return;
        }

        setIsLoading(true);

        try {
            const result = await apiRequest("/auth/password-reset/request", {
                method: "POST",
                auth: false,
                retryAuth: false,
                body: { email: email.trim() },
            });
            setDialog({
                type: "sent",
                message: result?.message || "Cek email kamu untuk link membuat password baru.",
                debugResetUrl: result?.debugResetUrl || "",
            });
        } catch (requestError) {
            setDialog({
                type: "failed",
                message:
                    requestError.message ||
                    "Tidak bisa mengirim link reset password. Silakan coba beberapa saat lagi.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AuthShell>
                <div className="space-y-6">
                    <div className="mx-auto w-full max-w-[333px] space-y-2 text-center">
                        <h1 className="text-xl font-bold leading-7 text-white">Lupa Password</h1>
                        <p className="text-sm font-normal leading-5 text-white">
                            Masukkan email yang terdaftar. Kami akan kirim link untuk membuat password baru.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="space-y-2">
                        <AuthField
                            id="forgotEmail"
                            name="email"
                            label="Email"
                            type="email"
                            autoComplete="email"
                            placeholder="youremail@gmail.com"
                            aria-describedby="forgotError"
                            inputRef={emailRef}
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                if (error) setError("");
                            }}
                        />

                        {/* Export Figma tidak membawa warna per bagian teks ini, jadi gayanya
                            mengikuti baris "Forgot Password?" di login: tautan hijau bold. */}
                        <p className="pt-1 text-right text-sm font-medium leading-5 text-[#94A3B8]">
                            Ingat Passwordnya? <AuthLink href="/login">LOGIN</AuthLink>
                        </p>

                        <p id="forgotError" role="alert" className="min-h-5 text-sm font-bold leading-5 text-[#FF8F8F]">
                            {error}
                        </p>

                        <div className="pt-4">
                            <AuthSubmitButton disabled={isLoading} isBusy={isLoading} busyLabel="Mengirim link...">
                                Kirim Link Reset
                            </AuthSubmitButton>
                        </div>
                    </form>
                </div>
            </AuthShell>

            {dialog?.type === "failed" && (
                <AuthDialog title="Link reset gagal dikirim" message={dialog.message} onClose={closeDialog} />
            )}

            {/* Sukses tidak redirect: pengguna mungkin salah ketik email dan perlu kirim ulang. */}
            {dialog?.type === "sent" && (
                <AuthDialog
                    title="Link reset terkirim"
                    message={dialog.message}
                    actionLabel="Kembali ke Login"
                    onAction={() => router.push("/login")}
                    onClose={closeDialog}
                >
                    {/* debugResetUrl hanya dikirim backend di development, supaya alur reset
                        bisa dicoba tanpa membuka inbox. */}
                    {dialog.debugResetUrl && (
                        <Link
                            href={dialog.debugResetUrl}
                            className="mt-4 block break-all rounded-lg border border-[#334155] p-3 text-sm font-bold leading-5 text-[#B7FB5B] underline-offset-2 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]"
                        >
                            Buka link reset (development)
                        </Link>
                    )}
                </AuthDialog>
            )}
        </>
    );
}
