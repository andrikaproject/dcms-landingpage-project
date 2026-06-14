"use client";

import { useEffect, useRef, useState } from "react";

const toastStyles = {
    success: "border-[#B7FB5B]/30 bg-[#B7FB5B]/15 text-[#D9FF9A]",
    error: "border-red-500/30 bg-red-500/15 text-red-100",
};
const TOAST_AUTO_DISMISS_MS = 10_000;
const SWIPE_DISMISS_THRESHOLD = 96;

function CloseIcon() {
    return (
        <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function DashboardToastItem({ toast, onDismiss }) {
    const dragStartXRef = useRef(null);
    const dragOffsetRef = useRef(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            onDismiss(toast.id);
        }, TOAST_AUTO_DISMISS_MS);

        return () => window.clearTimeout(timer);
    }, [onDismiss, toast.id]);

    function handleAction() {
        toast.action?.onClick?.();
        onDismiss(toast.id);
    }

    function handlePointerDown(event) {
        dragStartXRef.current = event.clientX;
        setIsDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    function handlePointerMove(event) {
        if (dragStartXRef.current === null) return;
        const nextOffset = event.clientX - dragStartXRef.current;
        dragOffsetRef.current = nextOffset;
        setDragOffset(nextOffset);
    }

    function handlePointerUp(event) {
        if (dragStartXRef.current === null) return;

        const shouldDismiss = Math.abs(dragOffsetRef.current) >= SWIPE_DISMISS_THRESHOLD;
        dragStartXRef.current = null;
        dragOffsetRef.current = 0;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);

        if (shouldDismiss) {
            onDismiss(toast.id);
            return;
        }

        setDragOffset(0);
    }

    function handlePointerCancel() {
        dragStartXRef.current = null;
        dragOffsetRef.current = 0;
        setIsDragging(false);
        setDragOffset(0);
    }

    return (
        <div
            role="status"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className={`pointer-events-auto relative flex w-full touch-pan-y select-none items-center justify-between gap-3 overflow-hidden rounded-xl border px-4 py-3 font-chakra text-sm font-semibold shadow-2xl backdrop-blur transition-[opacity,transform] ${isDragging ? "" : "duration-200 ease-out"} ${toastStyles[toast.type] || toastStyles.success}`}
            style={{
                transform: `translateX(${dragOffset}px)`,
                opacity: Math.max(0.35, 1 - Math.abs(dragOffset) / 260),
            }}
        >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
                <button
                    type="button"
                    onClick={handleAction}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="shrink-0 rounded-lg border border-current/25 px-3 py-1 text-xs font-bold transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-current/40"
                >
                    {toast.action.label}
                </button>
            )}
            <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                onPointerDown={(event) => event.stopPropagation()}
                className="grid size-7 shrink-0 place-items-center rounded-lg border border-current/20 text-current/80 transition hover:bg-white/10 hover:text-current focus:outline-none focus:ring-2 focus:ring-current/40"
                aria-label="Tutup notifikasi"
            >
                <CloseIcon />
            </button>
            <span
                className="absolute bottom-0 left-0 h-1 w-full origin-left bg-current/70 motion-safe:animate-[toast-progress_10s_linear_forwards]"
                aria-hidden="true"
            />
        </div>
    );
}

export default function DashboardToast({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
            {toasts.map((toast) => (
                <DashboardToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
}
