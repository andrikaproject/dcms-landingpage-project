import { subscribeAuth } from "@/lib/api/client";
import { createIdentityCache, identityOf } from "./reader-state";

// Katalog dan detail disimpan per akun agar navigasi kembali tampil instan; data
// tetap divalidasi ulang ke BE setiap kali halaman dibuka.
export const readerCache = createIdentityCache();

if (typeof window !== "undefined") {
    // Logout atau pergantian akun mengosongkan cache sebelum halaman berikutnya membaca.
    subscribeAuth((user) => readerCache.syncIdentity(identityOf(user)));
}

export const catalogKey = () => "catalog";
export const detailKey = (slug) => `detail:${slug}`;
