"use client";

import { useEffect } from "react";
import { getAppReporter } from "@/lib/monitoring/app-reporter";
import { normalizeError } from "@/lib/monitoring/client-error-reporter";

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        getAppReporter().report({ type: "CLIENT_RENDER_ERROR", ...normalizeError(error), digest: error.digest, details: { scope: "global" } });
    }, [error]);

    // Root layout (including its styles/fonts/providers) may be unavailable.
    return <html lang="id"><body style={{ margin: 0, background: "#000", color: "#fff", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, boxSizing: "border-box" }}>
            <section style={{ maxWidth: 480, border: "1px solid #27272a", borderRadius: 16, padding: 32, textAlign: "center" }}>
                <h1>Terjadi kesalahan</h1>
                <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>Halaman ini gagal dimuat. Coba lagi atau kembali ke dashboard.</p>
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16, marginTop: 24 }}>
                    <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: "8px 16px", borderRadius: 8, border: 0, background: "#B7FB5B", color: "#000", fontWeight: 700, cursor: "pointer" }}>Muat ulang</button>
                    <a href="/dashboard" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", color: "#fff" }}>Kembali ke dashboard</a>
                </div>
            </section>
        </main>
    </body></html>;
}
