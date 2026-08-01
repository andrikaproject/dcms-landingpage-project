# Phase 01 — PWL Proximity Scanner Engine

## Objective

Build the authenticated server-side scanner that evaluates the 30 most liquid Bitunix USDT futures and returns only markets trading from 0% to 5% above their UTC Previous Week Low.

## Scope

- Create an isolated scanner service, for example `lib/market/pwl-proximity-scanner.js`.
- Fetch Bitunix futures tickers once and rank valid USDT pairs by numeric `quoteVol`.
- Restrict the scan universe to the top 30 liquid pairs.
- Reuse the existing daily-candle and UTC weekly-level calculation logic to obtain PWL.
- Calculate `deltaPrice` and `distancePercent` for each pair.
- Include a pair only when `currentPrice >= pwl` and `distancePercent <= 5`.
- Mark `Sangat Dekat` when `distancePercent <= 0.35`, `Dekat` through 1%, and `Pantau` through 5%.
- Sort by distance ascending and return a minimal result row: symbol, current price, PWL, nominal delta, percentage delta, 24-hour quote volume, and near status.
- Create a dedicated authenticated endpoint at `/api/market-analysis/pwl-scanner`.

## Performance Design

- Keep a five-minute scanner-result cache with `scannedAt` and `cacheExpiresAt` metadata.
- Deduplicate concurrent scans through one in-flight promise.
- Process per-market candle requests through a bounded concurrency pool rather than issuing 30 requests simultaneously.
- Reuse the existing Bitunix fetch cache and in-flight URL deduplication.
- Treat a failed pair as skipped; return partial successes plus `skippedCount`.
- Apply manual-scan rate limiting without preventing an authorized user from receiving a valid cached response.

## Tests

- Unit-test the eligibility boundary: exactly PWL, 0.35%, exactly 1%, exactly 5%, above 5%, and below PWL.
- Unit-test ranking, volume-universe selection, skipped markets, and empty results with mocked Bitunix data.
- Test cache hit, cache expiry, and concurrent-request deduplication.
- Test unauthenticated, rate-limited, upstream-failure, and partial-success API responses.

## Completion Criteria

- The endpoint returns no chart candle arrays.
- All returned rows obey UTC PWL and the inclusive 0%–5% range.
- Simultaneous calls reuse cached or in-flight work.
- Engine and route tests pass.
