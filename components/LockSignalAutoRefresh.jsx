"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LockSignalAutoRefresh() {
    const router = useRouter();

    useEffect(() => {
        const interval = window.setInterval(() => {
            router.refresh();
        }, 5 * 60 * 1000);

        return () => window.clearInterval(interval);
    }, [router]);

    return null;
}
