"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    ApiUser,
    bootstrapSession,
    login as apiLogin,
    logout as apiLogout,
    subscribeAuth,
} from "@/lib/api/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
    user: ApiUser | null;
    status: AuthStatus;
    login: (identifier: string, password: string) => Promise<ApiUser>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const publicAuthPaths = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [user, setUser] = useState<ApiUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>(() => publicAuthPaths.has(pathname) ? "unauthenticated" : "loading");

    useEffect(() => subscribeAuth((nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? "authenticated" : "unauthenticated");
    }), []);

    useEffect(() => {
        if (publicAuthPaths.has(pathname)) return;

        let active = true;
        bootstrapSession().then((session) => {
            if (!active) return;
            setUser(session?.user || null);
            setStatus(session ? "authenticated" : "unauthenticated");
        });
        return () => { active = false; };
    }, [pathname]);

    const login = useCallback(async (identifier: string, password: string) => {
        const nextUser = await apiLogin(identifier, password);
        setUser(nextUser);
        setStatus("authenticated");
        return nextUser;
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();
        setUser(null);
        setStatus("unauthenticated");
    }, []);

    const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error("useAuth harus digunakan di dalam AuthProvider.");
    return value;
}

export function AuthGuard({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
    const { user, status } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        if (status === "authenticated" && admin && user?.role !== "ADMIN") router.replace("/dashboard");
    }, [admin, pathname, router, status, user?.role]);

    if (status === "loading") {
        return <div className="grid min-h-dvh place-items-center bg-[#111315] font-chakra text-sm text-zinc-500">Memulihkan sesi…</div>;
    }
    if (!user || (admin && user.role !== "ADMIN")) return null;
    return children;
}
