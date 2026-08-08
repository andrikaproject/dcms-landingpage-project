"use client";

import { LandingPageClient } from "@/components/LandingPageClient";
import { useAuth } from "@/components/auth/AuthProvider";

function LandingLogoutForm() {
  const { logout } = useAuth();
  return (
    <form onSubmit={async (event) => { event.preventDefault(); await logout(); }}>
      <button
        type="submit"
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left font-chakra text-sm font-bold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
      >
        <span>Logout</span>
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m16 17 5-5-5-5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12H9" />
        </svg>
      </button>
    </form>
  );
}

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <LandingPageClient
      user={user ? {
        name: user.name || null,
        email: user.email || null,
        role: user.role || null,
        uuidBitunix: user.uuidBitunix || null,
      } : null}
      logoutSlot={<LandingLogoutForm />}
    />
  );
}
