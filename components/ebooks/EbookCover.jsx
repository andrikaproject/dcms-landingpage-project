"use client";

import { useEffect, useState } from "react";

// Gambar ebook memakai URL bertanda tangan yang kedaluwarsa dalam 5 menit.
// next/image tidak dipakai karena optimizer Next.js akan menyimpan salinan gambar
// privat di cache publiknya.
export function PrivateImage({
    assetId,
    media,
    refresh,
    alt = "",
    className = "",
    imgClassName = "",
    loading = "lazy",
    placeholderRatio = "16 / 9",
}) {
    // Hasil refresh disimpan bersama assetId supaya respons untuk gambar lama tidak
    // tertukar ketika node berganti aset.
    const [refreshed, setRefreshed] = useState(null);
    const [refreshedOnce, setRefreshedOnce] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [failed, setFailed] = useState(false);

    const current = refreshed?.assetId === assetId ? refreshed.entry : media;
    const url = current?.url || null;

    useEffect(() => {
        if (url || !assetId || !refresh) return undefined;
        let active = true;
        refresh(assetId)
            .then((entry) => {
                if (!active) return;
                if (entry?.url) setRefreshed({ assetId, entry });
                else setFailed(true);
            })
            .catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, [assetId, refresh, url]);

    function requestFreshUrl() {
        if (!refresh) {
            setFailed(true);
            return;
        }
        setRefreshing(true);
        setRefreshedOnce(true);
        refresh(assetId)
            .then((entry) => {
                if (entry?.url && entry.url !== url) {
                    setRefreshed({ assetId, entry });
                    setFailed(false);
                } else {
                    setFailed(true);
                }
            })
            .catch(() => setFailed(true))
            .finally(() => setRefreshing(false));
    }

    // Error pertama biasanya URL kedaluwarsa: minta URL baru satu kali sebelum
    // menampilkan fallback.
    function handleError() {
        if (refreshedOnce || refreshing) setFailed(true);
        else requestFreshUrl();
    }

    const aspectRatio = current?.width && current?.height ? `${current.width} / ${current.height}` : placeholderRatio;

    if (failed && !refreshing) {
        return (
            <div className={`flex flex-col items-center justify-center gap-3 border border-dashed border-white/15 bg-black/30 p-4 text-center ${className}`} style={{ aspectRatio }}>
                <p className="text-sm text-zinc-300">Gambar tidak dapat dimuat.</p>
                {refresh && (
                    <button
                        type="button"
                        onClick={requestFreshUrl}
                        className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7FB5B]"
                    >
                        Muat ulang gambar
                    </button>
                )}
            </div>
        );
    }

    if (!url || refreshing) {
        return (
            <div className={`animate-pulse bg-white/[0.06] ${className}`} style={{ aspectRatio }} role="img" aria-label={alt ? `Memuat gambar: ${alt}` : "Memuat gambar"} aria-busy="true" />
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element -- URL privat berumur pendek, lihat komentar di atas.
        <img
            key={url}
            src={url}
            alt={alt}
            width={current?.width || undefined}
            height={current?.height || undefined}
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleError}
            className={`${className} ${imgClassName}`}
        />
    );
}

// Cover tanpa aset tampil sebagai sampul tipografis dari judul, bukan gambar rekaan.
export default function EbookCover({ cover, refresh, title = "", className = "rounded-xl", loading = "lazy" }) {
    if (!cover?.assetId) {
        return (
            <div className={`flex aspect-[4/3] flex-col justify-end overflow-hidden border border-white/10 bg-[#0d0f13] p-4 ${className}`}>
                <span className="mb-3 block h-0.5 w-8 bg-[#B7FB5B]" aria-hidden />
                <p className="line-clamp-3 break-words font-nebulica text-lg font-bold leading-tight text-white/85">{title || "Tanpa judul"}</p>
                <p className="mt-2 text-xs text-zinc-400">Belum ada cover</p>
            </div>
        );
    }
    return (
        <PrivateImage
            assetId={cover.assetId}
            media={cover.media}
            refresh={refresh}
            alt=""
            loading={loading}
            placeholderRatio="4 / 3"
            className={`aspect-[4/3] w-full object-cover ${className}`}
        />
    );
}
