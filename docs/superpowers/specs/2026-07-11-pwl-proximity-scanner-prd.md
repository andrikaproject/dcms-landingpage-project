# PWL Proximity Scanner PRD

Date: 2026-07-11
Status: Approved design; ready for implementation planning

## 1. Purpose

Add a manual scanner to Dashboard Market Analysis that finds liquid Bitunix USDT futures trading immediately above their Previous Week Low (PWL). It gives members a compact shortlist to inspect in the existing 4H chart and insight workspace; it is market context, not an entry signal or trading recommendation.

## 2. User Outcome

A member clicks `Scan PWL` and receives a ranked list of eligible markets. Each result makes it clear where the current price sits relative to PWL, in both price and percentage terms, and provides an immediate `Open 4H` action.

## 3. Product Decisions

| Decision | Requirement |
| --- | --- |
| Market source | Bitunix USDT futures only. |
| Liquidity universe | Select the 30 markets with the highest 24-hour `quoteVol` at scan time. |
| Weekly level | PWL is the lowest low of the previous fully completed UTC calendar week, Monday 00:00 through Sunday 23:59:59 UTC. |
| Eligible price range | Current price must be at or above PWL and no more than 5.00% above PWL. |
| Proximity status | `Sangat Dekat` at or below 0.35%; `Dekat` above 0.35% through 1%; `Pantau` above 1% through 5%. |
| Breakdowns | Markets below PWL are excluded from this scanner. |
| Ranking | Ascending percentage distance from PWL; return at most 30 eligible markets. |
| Inspection chart | `Open 4H` adds/selects the result in Market Analysis and opens it using UTC basis and 4H candles. |
| Trigger | Manual `Scan PWL` only. The page must not scan automatically on load or on an interval. |

### Distance Calculation

For a current price `P` and PWL price `W`:

```text
deltaPrice = P - W
distancePercent = ((P - W) / W) × 100
```

Example: current `$0.4210`, PWL `$0.4182` gives delta `+$0.0028` and distance `+0.67%`.

## 4. User Experience

### Placement

The scanner is a collapsible panel on `/dashboard/market-analysis`, positioned after the Market Analysis controls and before the existing three-column watchlist, chart, and insight workspace. It is not a separate tab and does not replace the chart.

Before the first scan, the collapsed panel communicates the scanner's purpose, UTC/4H context, range `0–5% above PWL`, and contains the primary `Scan PWL` button. On narrow screens, the panel remains above the chart and result rows adapt into a compact layout.

### Scan State

While a scan is running, the scan button is disabled and shows progress. The prior successful result remains visible, marked as prior data, rather than being removed. The panel shows the scan timestamp and remaining cache time after a successful scan.

### Result Row

Each result row includes:

- Market symbol, for example `ARBUSDT`.
- Current price.
- PWL price.
- Positive nominal distance from PWL, for example `+$0.0028`.
- Positive percentage distance from PWL, for example `+0.67%`.
- 24-hour quote volume.
- Text status: `Sangat Dekat` at or below 0.35%, `Dekat` through 1%, or `Pantau` through 5%.
- `Open 4H` action.

Selecting `Open 4H` must preserve the scanner result panel while it adds/selects the symbol in the existing watchlist and updates the chart and insight panel.

### Empty and Error States

- If no eligible market is found among the top 30 liquid markets, show: `Belum ada market liquid dalam rentang 0–5% di atas PWL.`
- If some markets cannot be analyzed, retain successful results and show the count of skipped markets.
- If the scan cannot start or all market data fails, show a retryable, non-technical error without affecting existing chart data.

## 5. Data Flow and API

Create a dedicated authenticated scanner endpoint, separate from the single-symbol key-level endpoint. Its responsibility is limited to producing scanner rows; it must not fetch or return full chart payloads for all markets.

1. Get Bitunix futures tickers once and select the top 30 valid USDT markets by numeric `quoteVol`.
2. For every selected market, obtain current price and the daily candles required for UTC weekly-level computation.
3. Reuse existing PWL calculation logic where possible. Compute distance, filter eligibility, sort results, and format a minimal response.
4. The client renders the response and requests the existing key-level payload only after the member chooses `Open 4H`.

The response should include scanner metadata (`scannedAt`, `cacheExpiresAt`, `candidateCount`, `skippedCount`) and each result's `symbol`, `currentPrice`, `pwl`, `deltaPrice`, `distancePercent`, `volume24h`, and `isVeryNear`.

## 6. Performance and Resilience

The scanner must protect both the application and Bitunix when 10–20 members scan at once.

- Cache a successful scanner response for five minutes, shared by requests served from the same application cache scope.
- Deduplicate in-flight scans so concurrent requests reuse one scan promise rather than starting duplicate work.
- Limit concurrent per-market candle requests to a small bounded pool; do not fire 30 external candle requests at once.
- Reuse the project's existing Bitunix request caching and in-flight request deduplication.
- Apply endpoint rate limiting appropriate for manual scans. A cached response must remain available to authorized members even when a fresh scan is temporarily rate-limited.
- Partial market failures are isolated: skip failed symbols and return successful candidates.
- Do not persist user-specific scanner results, send notifications, or schedule background scanning in this release.

## 7. Accessibility and Copy

- The scan button exposes loading state and is disabled while the client request is active.
- Result rows and `Open 4H` actions remain keyboard accessible.
- Status badges use text in addition to color.
- All copy uses Indonesian, consistent with the existing Market Analysis page.
- Include a concise context notice: `Scanner menampilkan kedekatan harga dengan PWL, bukan sinyal entry.`

## 8. Acceptance Criteria

1. A member can manually run the scanner from Market Analysis.
2. The scanner evaluates the 30 highest-`quoteVol` Bitunix USDT futures available at scan time.
3. Every displayed result has a valid PWL and is between 0% and 5% above it.
4. Results are sorted nearest to furthest by percentage distance.
5. Rows show current price, PWL price, nominal delta, percentage delta, and 24-hour volume.
6. Results show `Sangat Dekat` at 0.35% or less, `Dekat` through 1%, or `Pantau` through 5%.
7. Markets below PWL never appear in the result set.
8. `Open 4H` opens the selected market in the existing UTC 4H Market Analysis experience.
9. Concurrent scans share cached or in-flight work for five minutes rather than multiplying upstream work per user.
10. Empty, partial failure, full failure, loading, and cached-result states are clear and do not break the existing chart workspace.

## 9. Out of Scope

- Automated page-load, interval, cron, or background scans.
- Push, email, Telegram, or in-app alert notifications.
- User-managed scan universes, custom thresholds, or custom PWL bases.
- Session-based PWL scanning.
- Coins below PWL, PWH, PDH, PDL, or multi-level scanners.
- Trading signals, entry, stop-loss, take-profit, or order execution.
