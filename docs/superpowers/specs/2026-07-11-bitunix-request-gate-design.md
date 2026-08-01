# Bitunix Request Gate Design

Date: 2026-07-11
Status: Approved and implemented

## Goal

Prevent Bitunix `request too frequently` responses caused by simultaneous Market Analysis chart and PWL scanner requests.

## Scope

- Apply one shared outbound-request gate inside `lib/market/exchange-fetchers.js`.
- Preserve existing URL-based in-flight deduplication and Next fetch caching.
- Begin at most one new Bitunix request every 400ms in one application runtime.
- Retry Bitunix frequency errors up to three times with increasing delays: 1s, 2s, then 4s.
- Do not retry aborted requests or non-frequency API errors.

## Behavior

- All consumers of `bitunixFetch` share the gate: Market Analysis chart, PWL scanner, dashboard market data, and other existing Bitunix calls.
- Requests for the same URL still reuse the same in-flight promise before queueing duplicate outbound work.
- Scanner remains manual. It may take roughly 15–25 seconds for 30 markets, and the existing loading state stays visible during that time.
- A successfully cached response does not initiate a new Bitunix request and therefore does not consume a queue slot.
- If all retries fail, existing per-feature error handling remains responsible for the user-facing message.

## Validation

- Unit-test request-start spacing and FIFO queue behavior.
- Unit-test frequency-error retries and non-retry cases.
- Confirm duplicate URLs retain one outbound request.
- Run scanner concurrency tests, lint, and production build.
