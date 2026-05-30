"use client";

import { useEffect } from "react";

const toastStyles = {
    success: "border-[#B7FB5B]/30 bg-[#B7FB5B]/15 text-[#D9FF9A]",
    error: "border-red-500/30 bg-red-500/15 text-red-100",
};

function DashboardToastItem({ toast, onDismiss }) {
    useEffect(() => {
        const timer = window.setTimeout(() => {
            onDismiss(toast.id);
        }, toast.action ? 6500 : 3500);

        return () => window.clearTimeout(timer);
    }, [onDismiss, toast.action, toast.id]);

    function handleAction() {
        toast.action?.onClick?.();
        onDismiss(toast.id);
    }

    return (
        <div
            role="status"
            className={`pointer-events-auto flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 font-chakra text-sm font-semibold shadow-2xl backdrop-blur ${toastStyles[toast.type] || toastStyles.success}`}
        >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
                <button
                    type="button"
                    onClick={handleAction}
                    className="shrink-0 rounded-lg border border-current/25 px-3 py-1 text-xs font-bold transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-current/40"
                >
                    {toast.action.label}
                </button>
            )}
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
