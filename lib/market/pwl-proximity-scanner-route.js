export function createPwlScannerRouteHandler({
    requireSession,
    enforceLimit,
    getCached,
    scan,
    json,
    error,
    logError = console.error,
}) {
    return async function handlePwlScannerRequest(level) {
        const auth = await requireSession();
        if (auth.response) return auth.response;

        const cached = getCached(level);
        if (cached) return json(cached, { cacheStatus: "HIT" });

        const rateLimit = await enforceLimit(auth.session.user.email);
        if (rateLimit.response) {
            const lateCache = getCached(level);
            return lateCache
                ? json(lateCache, { cacheStatus: "HIT" })
                : rateLimit.response;
        }

        try {
            const data = await scan(level);
            return json(data, { cacheStatus: "MISS" });
        } catch (cause) {
            logError("PWL Proximity Scanner Error:", cause);
            return error(
                "Scanner PWL belum bisa dijalankan. Coba lagi dalam beberapa saat.",
                502
            );
        }
    };
}
