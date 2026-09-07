"use client";

import { useEffect } from "react";
import { getAppReporter } from "@/lib/monitoring/app-reporter";

export function ClientErrorReporter() {
    useEffect(() => getAppReporter().installGlobalListeners(window), []);
    return null;
}
