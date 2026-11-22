"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import { GLASS_SURFACE } from "@/components/glassSurface";
import { useAuth } from "./AuthProvider";

// variant "nav": tombol kaca bulat di ujung navigasi mobile, setinggi kapsul tab.
export default function LogoutButton({ compact = false, variant }: { compact?: boolean; variant?: "nav" }) {
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
            className={variant === "nav"
                ? `grid size-14 shrink-0 place-items-center rounded-full ${GLASS_SURFACE} text-[#cbd5e1] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:opacity-60`
                : compact
                ? "grid size-9 place-items-center rounded-lg border border-[#36353d] bg-[#17161c] text-[#949398] transition hover:text-white disabled:opacity-50"
                : "rounded-lg border border-[#36353d] px-3 py-2 text-xs font-bold text-[#949398] transition hover:text-white disabled:opacity-50"}
            aria-label="Logout"
        >
            {variant === "nav" ? <SignOut size={20} aria-hidden /> : compact ? "↪" : loading ? "Keluar…" : "Logout"}
        </button>
    );
}
