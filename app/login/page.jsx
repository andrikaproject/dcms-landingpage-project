"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthShell from "@/components/auth/AuthShell";
import {
    AuthCheckbox,
    AuthDialog,
    AuthField,
    AuthLink,
    AuthSubmitButton,
    AuthSuccessOverlay,
    AuthTabs,
} from "@/components/auth/AuthControls";

// Hanya identifier yang disimpan, tidak pernah password.
const REMEMBER_KEY = "dcms-remembered-identifier";

export default function LoginPage() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [popupMessage, setPopupMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const inputRef = useRef(null);
    const router = useRouter();
    const { login } = useAuth();

    useEffect(() => {
        let active = true;

        // Ditunda satu tick: membaca localStorage saat render awal akan berbeda
        // dari hasil render server dan memicu hydration mismatch.
        Promise.resolve().then(() => {
            if (!active) return;
            try {
                const saved = window.localStorage.getItem(REMEMBER_KEY);
                if (saved) {
                    setIdentifier(saved);
                    setRememberMe(true);
                }
            } catch {
                // Mode privat bisa menolak akses storage; form tetap dapat dipakai.
            }
        });

        return () => { active = false; };
    }, []);

    const closePopup = useCallback(() => {
        setPopupMessage("");
        inputRef.current?.focus();
    }, []);

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
            setLoadingMessage("Memvalidasi akun...");
            await login(trimmedIdentifier, password);

            try {
                if (rememberMe) window.localStorage.setItem(REMEMBER_KEY, trimmedIdentifier);
                else window.localStorage.removeItem(REMEMBER_KEY);
            } catch {
                // Gagal menyimpan preferensi tidak boleh membatalkan login.
            }

            setIsSuccess(true);
            setLoadingMessage("Menyiapkan dashboard...");
            window.setTimeout(() => router.replace("/dashboard"), 350);
        } catch (error) {
            setPopupMessage(
                error.message ||
                "Terjadi kendala saat login. Silakan coba beberapa saat lagi."
            );
            setIsLoading(false);
            setLoadingMessage("");
        }
    };

    const isSubmitting = isLoading;

    return (
        <>
            <AuthShell>
                <div className="space-y-6">
                    <div className="mx-auto w-full max-w-[360px] space-y-2 text-center">
                        <h1 className="text-xl font-bold leading-7 text-white">Sign in to Dashboard DCMS</h1>
                        <p className="text-sm font-normal leading-5 text-white">Enter your details to sign in</p>
                        <AuthTabs active="signin" />
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="space-y-2">
                        <AuthField
                            id="loginIdentifier"
                            name="loginIdentifier"
                            label="Enter UID Bitunix / Username"
                            type="text"
                            autoComplete="username"
                            placeholder="5172830912 or Panjoel"
                            aria-describedby="loginError"
                            inputRef={inputRef}
                            value={identifier}
                            onChange={(event) => {
                                setIdentifier(event.target.value);
                                if (error) setError("");
                            }}
                        />

                        <AuthField
                            id="passwordInput"
                            name="password"
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="*************"
                            aria-describedby="loginError"
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                if (error) setError("");
                            }}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
                            <AuthCheckbox
                                id="rememberMe"
                                name="rememberMe"
                                label="Remember me"
                                checked={rememberMe}
                                onChange={(event) => setRememberMe(event.target.checked)}
                            />

                            <AuthLink href="/forgot-password" className="text-sm leading-5">
                                Forgot Password?
                            </AuthLink>
                        </div>

                        <p id="loginError" role="alert" className="min-h-5 text-sm font-bold leading-5 text-[#FF8F8F]">
                            {error}
                        </p>

                        <div className="pt-4">
                            <AuthSubmitButton disabled={isSubmitting} isBusy={isSubmitting} busyLabel={loadingMessage || "Signing in..."}>
                                Sign In
                            </AuthSubmitButton>
                        </div>
                    </form>
                </div>
            </AuthShell>

            {popupMessage && <AuthDialog title="Login gagal" message={popupMessage} onClose={closePopup} />}

            {isSuccess && <AuthSuccessOverlay title="Login berhasil" message={loadingMessage || "Menyiapkan dashboard..."} />}
        </>
    );
}
