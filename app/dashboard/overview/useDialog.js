"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Perilaku dialog modal: fokus masuk saat dibuka, Tab berputar di dalam,
// Escape menutup, scroll halaman dikunci, lalu fokus kembali ke pemicunya.
export function useDialog(panelRef, onClose, { initialFocusRef } = {}) {
    // Disimpan di ref supaya callback baru dari parent tidak memasang ulang
    // efek di bawah (yang akan memindahkan fokus setiap render).
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const trigger = document.activeElement;
        const panel = panelRef.current;

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                closeRef.current();
                return;
            }
            if (event.key !== "Tab" || !panel) return;

            const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        (initialFocusRef?.current || panel)?.focus();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (trigger instanceof HTMLElement) trigger.focus();
        };
    }, [panelRef, initialFocusRef]);
}
