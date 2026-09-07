import { API_BASE_URL, getAccessToken } from "@/lib/api/client";
import { CLIENT_LOG_ENDPOINT_PATH, createReporter, isReporterEnabled } from "./client-error-reporter";

let reporter;

export function getAppReporter() {
    if (!reporter) {
        reporter = createReporter({
            endpoint: `${API_BASE_URL}${CLIENT_LOG_ENDPOINT_PATH}`,
            getToken: getAccessToken,
            // Explicit property access lets Next.js inline public build-time variables.
            enabled: isReporterEnabled({
                NODE_ENV: process.env.NODE_ENV,
                NEXT_PUBLIC_CLIENT_LOGS_ENABLED: process.env.NEXT_PUBLIC_CLIENT_LOGS_ENABLED,
            }),
        });
    }
    return reporter;
}
