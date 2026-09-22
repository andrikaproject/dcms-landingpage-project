"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import {
    AuthDialog,
    AuthField,
    AuthPasswordField,
    AuthSubmitButton,
    AuthSuccessOverlay,
    AuthTabs,
} from "@/components/auth/AuthControls";
import { apiRequest } from "@/lib/api/client";
import { getEmailError } from "@/lib/auth-form";

const REDIRECT_DELAY_MS = 3000;
const MIN_PASSWORD_LENGTH = 8;
// Sama dengan isValidUidFormat di lib/bitunix.js. File itu memakai modul crypto
// milik Node, jadi aturannya disalin di sini alih-alih diimpor ke bundle client.
const UID_PATTERN = /^[0-9]{5,20}$/;

const EMPTY_FORM = { username: "", uid: "", email: "", password: "" };

// Aturan dicek sesuai urutan field, jadi pesan dan fokus selalu jatuh di field
// paling atas yang belum benar.
function findFirstInvalidField(form) {
    const uid = form.uid.trim();

    if (!form.username.trim()) return { field: "username", message: "Username harus diisi." };
    if (!uid) return { field: "uid", message: "UUID Bitunix harus diisi." };
    if (!UID_PATTERN.test(uid)) return { field: "uid", message: "UUID Bitunix harus berupa angka 5 sampai 20 digit." };
    const emailError = getEmailError(form.email);
    if (emailError) return { field: "email", message: emailError };
    if (!form.password) return { field: "password", message: "Password harus diisi." };
    if (form.password.length < MIN_PASSWORD_LENGTH) {
        return { field: "password", message: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.` };
    }
    return null;
}

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState("");
    const [popupMessage, setPopupMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const usernameRef = useRef(null);
    const uidRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    const closePopup = useCallback(() => {
        setPopupMessage("");
        usernameRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!successMessage) return undefined;

        const timer = window.setTimeout(() => router.push("/login"), REDIRECT_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [successMessage, router]);

    const updateField = (name) => (event) => {
        const { value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        if (error) setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const invalid = findFirstInvalidField(form);
        if (invalid) {
            const refs = { username: usernameRef, uid: uidRef, email: emailRef, password: passwordRef };
            setError(invalid.message);
            refs[invalid.field].current?.focus();
            return;
        }

        setIsLoading(true);

        try {
            const result = await apiRequest("/auth/bitunix/register", {
                method: "POST",
                auth: false,
                retryAuth: false,
                body: {
                    name: form.username.trim(),
                    uid: form.uid.trim(),
                    email: form.email.trim(),
                    password: form.password,
                },
            });
            // Tombol tetap terkunci sampai redirect supaya akun tidak terdaftar dua kali.
            setSuccessMessage(result?.message || "Registrasi berhasil. Silakan login.");
        } catch (requestError) {
            setPopupMessage(
                requestError.message ||
                "Terjadi kendala saat registrasi. Silakan coba beberapa saat lagi."
            );
            setIsLoading(false);
        }
    };

    return (
        <>
            <AuthShell>
                <div className="space-y-6">
                    <div className="mx-auto w-full max-w-[360px] space-y-2 text-center">
                        <h1 className="text-xl font-bold leading-7 text-white">Sign Up to Dashboard DCMS</h1>
                        <p className="text-sm font-normal leading-5 text-white">Enter your details to sign up</p>
                        <AuthTabs active="signup" />
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="space-y-2">
                        <AuthField
                            id="registerUsername"
                            name="username"
                            label="Username"
                            type="text"
                            autoComplete="username"
                            placeholder="panjoel001 or Budi Santoso"
                            aria-describedby="registerError"
                            inputRef={usernameRef}
                            value={form.username}
                            onChange={updateField("username")}
                        />

                        <AuthField
                            id="registerUid"
                            name="uid"
                            label="UUID Bitunix"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="6710xxxxxx"
                            aria-describedby="registerError"
                            inputRef={uidRef}
                            value={form.uid}
                            onChange={updateField("uid")}
                        />

                        <AuthField
                            id="registerEmail"
                            name="email"
                            label="Email"
                            type="email"
                            autoComplete="email"
                            placeholder="youremail@gmail.com"
                            aria-describedby="registerError"
                            inputRef={emailRef}
                            value={form.email}
                            onChange={updateField("email")}
                        />

                        <AuthPasswordField
                            id="registerPassword"
                            name="password"
                            label="Password"
                            autoComplete="new-password"
                            placeholder="************"
                            aria-describedby="registerError"
                            inputRef={passwordRef}
                            value={form.password}
                            onChange={updateField("password")}
                        />

                        <p id="registerError" role="alert" className="min-h-5 text-sm font-bold leading-5 text-[#FF8F8F]">
                            {error}
                        </p>

                        <div className="pt-4">
                            <AuthSubmitButton disabled={isLoading} isBusy={isLoading} busyLabel="Mendaftarkan akun...">
                                Daftar Sekarang
                            </AuthSubmitButton>
                        </div>
                    </form>
                </div>
            </AuthShell>

            {popupMessage && <AuthDialog title="Registrasi gagal" message={popupMessage} onClose={closePopup} />}

            {successMessage && (
                <AuthSuccessOverlay
                    title="Registrasi berhasil"
                    message={successMessage}
                    note="Mengarahkan ke halaman login..."
                />
            )}
        </>
    );
}
