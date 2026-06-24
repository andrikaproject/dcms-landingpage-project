"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LockSignalAutoRefresh() {
    const router = useRouter();

    useEffect(() => {
        // Auto-refresh every 5 minutes
        const interval = window.setInterval(() => {
            router.refresh();
        }, 5 * 60 * 1000);

        // Refresh immediately when user returns to this tab (e.g. after locking from history)
        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                router.refresh();
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [router]);

    return null;
}
