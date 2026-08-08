"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
    const { logout } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    return (
        <button
            type="button"
            disabled={loading}
            onClick={async () => {
                setLoading(true);
                await logout();
                router.replace("/login");
            }}
            className={compact
                ? "grid size-9 place-items-center rounded-lg border border-[#36353d] bg-[#17161c] text-[#949398] transition hover:text-white disabled:opacity-50"
                : "rounded-lg border border-[#36353d] px-3 py-2 text-xs font-bold text-[#949398] transition hover:text-white disabled:opacity-50"}
            aria-label="Logout"
        >
            {compact ? "↪" : loading ? "Keluar…" : "Logout"}
        </button>
    );
}
