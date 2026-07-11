# Level Proximity Scanner — Design

Date: 2026-07-11
Status: Approved (pending spec review)

## Summary

Generalize the existing **PWL Proximity Scanner** into a **selectable-level scanner**. The
user picks a target key level from a dropdown; the scanner surfaces the most-liquid USDT
markets whose current price sits within ±5% of that level. The candidate universe shrinks
from 30 to 5 markets.

This is a proximity tool, not an entry signal — the disclaimer copy stays.

## Decisions

1. **Levels (7, dropdown):** `pwl` (default), `pwh`, `pwm`, `wo`, `pdh`, `pdl`, `pdm`.
   - Daily Open (`do`) is intentionally excluded.
2. **Proximity = absolute, two-sided:** a market qualifies when
   `Math.abs(distancePercent) <= 5`. Both above and below the level count.
   - This changes the old PWL behavior, which only accepted prices 0–5% *above* PWL.
3. **Sort order:** ascending `Math.abs(distancePercent)`, then descending `volume24h`,
   then `symbol` ascending.
4. **Candidate limit:** 30 → **5** most-liquid USDT markets (by 24h quote volume).
5. **Scan trigger:** manual only. Changing the dropdown updates the target level but does
   not scan. If displayed results belong to a different level than the current selection,
   the panel shows a "Scan untuk [LEVEL]" prompt instead of stale rows.
6. **No extra upstream requests:** every level is derived from the 40 daily candles the
   scanner already fetches per market, via `computeLevels({ basis: "utc", dailyCandles, now })`
   from `lib/market/key-levels.js`.
7. **File names & API path unchanged** (`pwl-scanner`, `pwl-proximity-scanner-*`) to
   minimize churn. Internals and user-facing labels are generalized. A rename to
   `level-scanner` is out of scope.

## Thresholds (unchanged)

- `MAX_DISTANCE_PERCENT = 5`
- `VERY_NEAR_PERCENT = 0.35`
- `NEAR_PERCENT = 1`
- `CACHE_TTL_MS = 5 * 60 * 1000`

Proximity tier is computed from `Math.abs(distancePercent)`:
`very-near` (≤0.35%), `near` (≤1%), else `watch`.

## Components & Changes

### `lib/market/pwl-proximity-scanner-core.js` (pure logic)

- `PWL_SCANNER_CANDIDATE_LIMIT`: `30` → `5`.
- Add `SCANNER_LEVELS = ["pwl", "pwh", "pwm", "wo", "pdh", "pdl", "pdm"]` and
  `SCANNER_LEVEL_LABELS` (key → display label, e.g. `pwl → "PWL"`).
- `createPwlScannerRow(candidate, levelPrice, levelKey)`:
  - Remove the `deltaPrice < 0` rejection.
  - Reject when `Math.abs(distancePercent) > MAX_DISTANCE_PERCENT`.
  - Row shape: rename `pwl` → `levelPrice`; add `level` (the key) and
    `direction` (`"above"` when `deltaPrice >= 0`, else `"below"`); keep
    `deltaPrice`, `distancePercent`, `volume24h`, `isVeryNear`, `proximityTier`.
  - `isVeryNear` / `proximityTier` use `Math.abs(distancePercent)`.
- `sortPwlScannerRows(rows)`: primary key `Math.abs(a.distancePercent) - Math.abs(b.distancePercent)`,
  then volume desc, then symbol.
- `selectPwlScannerCandidates`: default limit becomes 5 (via the constant).

### `lib/market/pwl-proximity-scanner.js` (service)

- `loadFreshScannerResult(level)`: for each candidate, compute the full UTC level set
  with `computeLevels({ basis: "utc", dailyCandles, now })`, read `levels[level]`, skip the
  market if that value is not a finite positive number, else build the row with
  `createPwlScannerRow(candidate, levels[level], level)`.
- Cache becomes **per level**: replace the single shared cache with a registry
  (`Map` stored under a `Symbol.for` key on `globalThis`) that lazily creates one
  `createSharedScannerCache` per level, each closing over its `level` in `loadFresh`.
- Public API: `scanPwlProximity(level)` and `getCachedPwlProximityScannerResult(level)`.
- Payload includes `level` alongside `candidateCount`, `skippedCount`, `results`.

### `lib/market/pwl-proximity-scanner-route.js` + `app/api/market-analysis/pwl-scanner/route.js`

- Parse `level` from the query string, validate against `SCANNER_LEVELS`, default `pwl`.
- The route handler receives the validated level and forwards it to
  `getCached(level)` / `scan(level)`.
- `X-PWL-Scanner-Cache` header stays; cache HIT/MISS is per level.
- Rate limit stays keyed per user email (unchanged); a cache HIT still bypasses the
  rate check.

### `app/dashboard/market-analysis/PwlProximityScanner.jsx` (UI)

- Add a `<select>` level dropdown in the header (7 options, default `pwl`), controlled by
  local state `selectedLevel`.
- Generalize title and copy — e.g. "Cari 5 market USDT paling liquid dalam ±5% dari [LEVEL]".
- Table: the "PWL" column label becomes the dynamic level label; distance renders
  **signed** (`+`/`−`) with an above/below indicator.
- Fetch `/api/market-analysis/pwl-scanner?level=<selectedLevel>`.
- Store `data.level`; when `selectedLevel !== data.level`, show a "Scan untuk [LEVEL]"
  prompt rather than the previous level's rows.
- Disclaimer, empty, loading, and error states remain, with copy generalized off "PWL".

## Data Flow

1. User selects a level and presses **Scan**.
2. Client `GET /api/market-analysis/pwl-scanner?level=<level>`.
3. Route: auth → per-level cache peek (HIT returns cached) → rate limit → `scan(level)`.
4. Service: fetch tickers → top 5 by volume → per candidate fetch 40 daily candles →
   `computeLevels` → pick `levels[level]` → `createPwlScannerRow` → filter → sort.
5. Response cached per level for 5 minutes; client renders rows labeled with the level.

## Error Handling

- Unchanged structurally: missing/invalid level falls back to `pwl`; upstream failure →
  502 with the existing message; per-market failures are counted in `skippedCount` and the
  scan still succeeds if at least one market resolves.

## Testing

Update `tests/unit/pwl-proximity-scanner.test.js`:

- Candidate universe now keeps **5** markets (was 30); update the concurrency/count tests.
- `createPwlScannerRow` now **accepts** prices below the level within 5% (previously
  rejected); add coverage for a `below` row and its `direction`.
- Sorting test uses `Math.abs(distancePercent)` (a below-level row at −0.2% ranks with a
  +0.2% row).
- Add a non-PWL level case (e.g. `pwh`) exercising `levels[level]` selection and labeling.
- Route test: passing `?level` selects the correct per-level cache; invalid level defaults
  to `pwl`.

## Out of Scope

- Renaming files or the API path away from `pwl-*`.
- Session-basis levels for the scanner (it stays UTC-based).
- Auto-scan on dropdown change.
- Including Daily Open (`do`).
