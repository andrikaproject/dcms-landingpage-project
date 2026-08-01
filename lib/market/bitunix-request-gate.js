export const BITUNIX_REQUEST_SPACING_MS = 400;
export const BITUNIX_FREQUENCY_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

function abortError() {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    return error;
}

function throwIfAborted(signal) {
    if (signal?.aborted) throw abortError();
}

export function waitWithSignal(delayMs, signal) {
    throwIfAborted(signal);
    if (delayMs <= 0) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const timer = setTimeout(done, delayMs);

        function done() {
            signal?.removeEventListener("abort", cancel);
            resolve();
        }

        function cancel() {
            clearTimeout(timer);
            signal?.removeEventListener("abort", cancel);
            reject(abortError());
        }

        signal?.addEventListener("abort", cancel, { once: true });
    });
}

/**
 * Spaces request starts without serializing their full network duration.
 * Every Bitunix caller in one runtime shares this gate.
 */
export function createBitunixRequestGate({
    minSpacingMs = BITUNIX_REQUEST_SPACING_MS,
    now = Date.now,
    sleep = waitWithSignal,
} = {}) {
    let nextStartAt = 0;
    let queue = Promise.resolve();

    async function run(request, signal = undefined) {
        const slot = queue.then(async () => {
            throwIfAborted(signal);
            const delay = Math.max(0, nextStartAt - now());
            if (delay > 0) await sleep(delay, signal);
            throwIfAborted(signal);
            nextStartAt = now() + minSpacingMs;
        });

        // A rejected request must not block later queued requests.
        queue = slot.catch(() => undefined);
        await slot;
        return request();
    }

    return { run };
}

export function isBitunixFrequencyError(error) {
    return error?.status === 429 || /request too frequently/i.test(String(error?.message || ""));
}

export async function withBitunixFrequencyRetries({
    request,
    signal = undefined,
    retryDelaysMs = BITUNIX_FREQUENCY_RETRY_DELAYS_MS,
    sleep = waitWithSignal,
} = {}) {
    for (let attempt = 0; ; attempt += 1) {
        throwIfAborted(signal);
        try {
            return await request();
        } catch (error) {
            const delay = retryDelaysMs[attempt];
            if (signal?.aborted || !isBitunixFrequencyError(error) || delay === undefined) {
                throw error;
            }
            await sleep(delay, signal);
        }
    }
}
