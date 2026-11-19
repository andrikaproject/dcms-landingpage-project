"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clampSidePanelWidth, SIDE_PANEL, widthAfterKey } from "@/lib/charting/side-panel";

const STORAGE_KEY = "dcms-chart-side-width:v1";
const listeners = new Set();

function readWidth() {
    try {
        const stored = Number(window.localStorage.getItem(STORAGE_KEY));
        return stored > 0 ? clampSidePanelWidth(stored) : SIDE_PANEL.default;
    } catch {
        return SIDE_PANEL.default;
    }
}

function writeWidth(width) {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
        // Storage diblokir: lebar tetap berlaku sampai halaman ditutup.
    }
    listeners.forEach((listener) => listener());
}

function subscribe(listener) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

// Lebar panel kanan diingat per browser. Server selalu merender lebar bawaan.
export function useSidePanelWidth() {
    return useSyncExternalStore(subscribe, readWidth, () => SIDE_PANEL.default);
}

/**
 * Pegangan geser vertikal di antara chart dan panel kanan (hanya desktop).
 * Selama digeser, lebar ditulis langsung ke variabel CSS grid supaya chart tidak
 * dirender ulang di setiap gerakan; nilainya disimpan saat pointer dilepas.
 */
export default function SidePanelResizer({ gridRef, width }) {
    const [dragging, setDragging] = useState(false);
    const [liveWidth, setLiveWidth] = useState(null);
    const dragRef = useRef(null);
    const shown = liveWidth ?? width;

    // Teks di halaman tidak ikut terseleksi selama pegangan digeser.
    useEffect(() => {
        if (!dragging) return undefined;
        document.body.style.userSelect = "none";
        return () => {
            document.body.style.userSelect = "";
        };
    }, [dragging]);

    function available() {
        return gridRef.current?.getBoundingClientRect().width;
    }

    function preview(next) {
        gridRef.current?.style.setProperty("--side-width", `${next}px`);
        setLiveWidth(next);
    }

    function commit(next) {
        setLiveWidth(null);
        writeWidth(next);
    }

    function onPointerDown(event) {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { startX: event.clientX, startWidth: width, available: available(), last: width };
        setDragging(true);
    }

    function onPointerMove(event) {
        const drag = dragRef.current;
        if (!drag) return;
        const next = clampSidePanelWidth(drag.startWidth + (drag.startX - event.clientX), drag.available);
        if (next === drag.last) return;
        drag.last = next;
        preview(next);
    }

    function endDrag() {
        const drag = dragRef.current;
        if (!drag) return;
        dragRef.current = null;
        setDragging(false);
        commit(drag.last);
    }

    function onKeyDown(event) {
        const next = widthAfterKey(event.key, width, available());
        if (next === null) return;
        event.preventDefault();
        commit(next);
    }

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Ubah lebar panel kanan"
            aria-valuemin={SIDE_PANEL.min}
            aria-valuemax={SIDE_PANEL.max}
            aria-valuenow={shown}
            tabIndex={0}
            title="Geser untuk mengubah lebar panel. Klik dua kali untuk kembali ke bawaan."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => commit(SIDE_PANEL.default)}
            onKeyDown={onKeyDown}
            data-press="none"
            className="group hidden cursor-col-resize touch-none justify-center self-stretch focus-visible:outline-none lg:flex"
        >
            {/* Pegangan mengikuti layar saat digulir, di sekitar tengah chart. */}
            <span
                aria-hidden
                className={`sticky top-[40vh] mt-40 h-10 w-1 rounded-full transition-[background-color,box-shadow] duration-150 ease-[var(--ease-out)] group-focus-visible:shadow-[0_0_0_2px_#0b0d0f,0_0_0_4px_#b8fb5c] ${dragging ? "bg-[#b8fb5c]" : "bg-[#334155] group-hover:bg-[#64748b]"}`}
            />
        </div>
    );
}
