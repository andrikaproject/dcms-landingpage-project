# Dashboard Performance Optimization Design

**Status:** Approved design, awaiting implementation plan

**Date:** 2026-09-18

**Repositories:** `dcms-landingpage-project` and `dcms-api`

## Repository Ownership

This optimization spans two existing projects. Every implementation task, command, test, and commit must use the correct project root below.

### Backend API

**Project root:** `/Users/andrika/Documents/ProjectDCMS/dcms-api`

All server-side market fetching, shared caching, request budgeting, response metadata, locked-signal refresh behavior, API documentation, and backend tests belong exclusively in this project.

Expected backend touchpoints:

- `/Users/andrika/Documents/ProjectDCMS/dcms-api/src/modules/market/provider.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/src/modules/market/live-prices.service.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/src/modules/market/signal.service.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/src/modules/market/market.service.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/src/modules/signals/locked-signals.service.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/src/routes/market.routes.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/src/docs/operations.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/tests/live-prices.test.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/tests/locked-signals.test.js`
- `/Users/andrika/Documents/ProjectDCMS/dcms-api/tests/http.test.js`

New cache or timing modules and their tests, if needed, must also be created under this backend root.

### Frontend Dashboard

**Project root:** `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project`

Only browser request orchestration, independent loading states, timeframe interaction, stale or error presentation, and visual verification belong in this project.

Expected frontend touchpoints:

- `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project/app/dashboard/page.jsx`
- `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project/app/dashboard/DashboardSignalWorkspace.jsx`
- `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project/app/dashboard/DashboardSignalBoard.jsx`
- `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project/lib/api/client.ts`
- `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project/tests/unit/`

### Single-execution rule

- Backend business logic must not be copied into the frontend repository.
- Frontend code must consume the existing `dcms-api` endpoints rather than implementing a second market-data pipeline.
- Backend tests and commands run once from the `dcms-api` root.
- Frontend tests and commands run once from the `dcms-landingpage-project` root.
- Performance measurements identify which root and server instance produced the result, preventing the same service from being started or benchmarked twice.

## 1. Summary

This design reduces dashboard latency during timeframe changes without changing the existing Signal Board or Locked Signal card design. The solution separates unrelated frontend requests, reduces Bitunix request fan-out, shares public market caches across users, and keeps previously loaded data visible while new data is fetched.

The accepted performance targets are:

- Warm-cache timeframe response p95 at or below 500 ms.
- Cold-cache timeframe response p95 at or below 3 seconds.
- Existing dashboard data remains visible during timeframe refresh.
- A cold dashboard request uses no more than approximately 10 upstream requests for the normal eight-symbol board.
- A warm dashboard request uses no upstream requests while its cache entries are fresh.

The cold-cache target is an SLO, not a claim that an unavailable exchange can always return data within three seconds. When the provider is slow, the dashboard must return safe stale data or a clearly marked partial response within the request budget.

## 2. Current Problem

Changing the timeframe currently reruns one frontend loader that requests the market dashboard, active locked signals, and admin users together. The UI waits for the slowest request and hides the entire dashboard behind a loading message.

A normal cold dashboard for eight symbols can fan out into:

- 1 CoinGecko dominance request.
- 1 Bitunix all-tickers request.
- 8 Bitunix candle requests.
- 8 Bitunix individual ticker requests.

This creates approximately 18 upstream requests. The individual ticker requests duplicate information already available in the all-tickers response.

The provider cache currently has a general 30-second TTL and stores only completed responses. Concurrent misses do not share an in-flight promise, so multiple users can duplicate the same exchange request. Active locked signals also run a full forced signal analysis during a list request, bypassing the cache.

Measured behavior before optimization includes:

- Cold service calls between approximately 2.4 and 5.4 seconds in normal measurements.
- A cold HTTP request reaching approximately 12.6 seconds.
- A cold 1d request issuing 18 upstream calls and taking approximately 5.7 seconds.
- Warm service calls completing in approximately 3 ms and warm HTTP calls in approximately 16 ms.
- Dashboard payload size of approximately 16 KB, showing that transfer size is not the primary bottleneck.

## 3. Goals

1. Make timeframe changes feel immediate by preserving the previous dashboard until replacement data is ready.
2. Fetch only data that depends on the selected timeframe.
3. Reduce exchange traffic and the chance of hitting API limits.
4. Share public market data across users searching the same symbol and timeframe.
5. Prevent duplicate exchange calls during concurrent cache misses.
6. Keep stale or partial data honest and visible to the user.
7. Preserve current signal formulas, locked-card placement, and visual design.
8. Make the cache implementation replaceable with Redis if the API later runs on multiple instances.

## 4. Non-Goals

- Redesigning the Signal Board or Locked Signal cards.
- Changing the trading signal formula, indicator periods, entry logic, or lifecycle rules.
- Introducing Redis in this phase.
- Adding WebSockets or high-frequency browser polling.
- Precomputing every symbol and timeframe in the background.
- Sharing locked signals, plans, history, or preferences between users.

## 5. Architecture

### 5.1 Request separation

The frontend will use three independent data flows:

1. **Market dashboard**
   - Loaded initially and whenever the timeframe or searched symbol changes.
   - The only request triggered by a timeframe change.

2. **Locked signals**
   - Loaded independently when the dashboard opens.
   - Refreshed after lock, unlock, explicit refresh, or its own controlled refresh policy.
   - Never reloaded only because the market timeframe changed.

3. **Admin summary**
   - Loaded independently for admin users after the market dashboard can render.
   - A failure must not block or clear market data.

### 5.2 Market dashboard flow

```text
User selects timeframe
  -> frontend marks pending timeframe and keeps current data visible
  -> 150 ms selection debounce
  -> cancel previous browser request
  -> GET /market/dashboard
      -> dashboard response cache
          -> fresh hit: return immediately
          -> identical request in flight: await shared promise
          -> miss: compose response from shared market services
              -> dominance cache
              -> all-ticker snapshot
              -> candle cache per symbol and timeframe
              -> analysis cache per closed candle
  -> apply response only if it belongs to the latest request
  -> update displayed timeframe and URL
```

The browser cancellation improves client behavior, but backend cache coalescing remains required because an HTTP request may continue after the browser disconnects.

### 5.3 Component boundaries

Backend responsibilities are separated into small services:

- `tickerSnapshotService`: owns all-ticker freshness, stale fallback, and in-flight sharing.
- `candleCacheService`: owns candle keys, candle-boundary expiry, stale data, and in-flight sharing.
- `signalAnalysisService`: calculates indicators from closed candles and caches stable analysis.
- `dashboardService`: composes public dashboard responses within a fixed request budget.
- `lockedSignalService`: owns per-user locked rows and overlays lightweight current prices without running forced candle analysis.

Frontend responsibilities are separated into:

- A market-dashboard request coordinator that handles debounce, cancellation, sequencing, and URL commit.
- Independent locked-signal loading and mutation handling.
- Independent admin-summary loading.
- Presentational components that receive explicit loading, stale, and error states.

## 6. Cache Policy

### 6.1 Public and private boundaries

The following data is public market data and may be shared between users:

- Tickers and live prices.
- Candles.
- USDT dominance.
- Indicator calculations.
- Market signal output for the same market inputs.

The following data remains scoped to one authenticated user:

- Locked signals.
- Pending plans.
- Signal history and exposure records.
- User and admin data.
- User preferences.

No user identifier, authorization result, or user-owned row may be stored in the public market cache.

### 6.2 Cache definitions

| Cache | Key | Fresh period | Stale allowance | In-flight sharing |
|---|---|---:|---:|---|
| Ticker snapshot | Provider and market type | 10 seconds | 30 seconds | Yes |
| Dominance | Provider | 5 minutes | 30 minutes | Yes |
| Latest candles | Provider, symbol, timeframe, limit | Until next candle boundary plus provider grace | One timeframe period | Yes |
| Signal analysis | Symbol, timeframe, last closed candle, dominance score | Until candle or dominance score changes | Same as candle source | Yes |
| Dashboard response | Timeframe and normalized searched symbol | 10 seconds | 60 seconds | Yes |

The provider grace period is a small delay after the nominal candle close to avoid requesting a candle before the exchange has finalized it. Its initial value will be three seconds and can be tuned from measured behavior.

### 6.3 In-flight coalescing

Each cache owns both completed values and active promises. When an identical miss is already running, later callers await the existing promise instead of creating another exchange request.

In-flight entries must be deleted in `finally`, whether the request succeeds or fails. Failed requests must not remain permanently cached as promises.

### 6.4 Single-instance and multi-instance behavior

The first implementation uses process memory and shares data across all users served by one Node process. Cache access will be hidden behind a small interface so the implementation can later move to Redis without changing market, signal, or route contracts.

Memory cache does not coalesce work across multiple API replicas. If production begins running more than one replica, distributed caching becomes a separate follow-up requirement.

## 7. Market Data Composition

### 7.1 Eliminate ticker duplication

`getMarketDashboard` already loads all Bitunix tickers. The selected ticker row must be passed into signal generation for each symbol. Signal generation must not make another per-symbol ticker request.

For a normal cold eight-symbol dashboard, the expected request shape becomes:

- 1 dominance request when its cache is cold.
- 1 all-tickers request when its cache is cold.
- Up to 8 candle requests when their caches are cold.

This reduces the normal cold request count from approximately 18 to approximately 10. Warm requests make no upstream calls while all required entries are fresh.

### 7.2 Closed-candle analysis

EMA, RSI, stochastic, ATR, support, resistance, and volume-profile calculations use closed candles. Their result remains stable until a new candle closes. Current price, 24-hour change, volume, entry, stop loss, and targets can be composed using the latest shared ticker snapshot without recalculating the closed-candle indicators.

The analysis cache key includes the last closed-candle identity and the dominance score because a dominance score change can change signal bias.

### 7.3 Request budget and partial results

The dashboard route has a total target budget of three seconds. Provider calls must honor the remaining budget and may not start an unbounded sequential fallback after the budget is exhausted.

Resolution order for an unavailable symbol is:

1. Fresh value.
2. Safe stale value with explicit delayed metadata.
3. Omit the failed symbol and return a partial response.

If at least one signal is available, the route returns HTTP 200 with `dataHealth: "PARTIAL"` and a list of failed symbols. If no signal and no stale dashboard are available, the route returns a retriable service error instead of presenting an empty board as a valid market state.

### 7.4 Response metadata

The existing response fields remain backward compatible. The dashboard response adds:

```json
{
  "meta": {
    "asOf": "2026-09-18T00:00:00.000Z",
    "cacheStatus": "HIT",
    "dataHealth": "OK",
    "failedSymbols": []
  }
}
```

Allowed `cacheStatus` values are `HIT`, `MISS`, `STALE`, and `PARTIAL`. Allowed `dataHealth` values for this endpoint are `OK`, `DELAYED`, and `PARTIAL`.

Timing diagnostics are returned through `Server-Timing` and cache headers, not as permanent UI fields.

## 8. Locked Signal Behavior

`GET /signals/locked` must no longer run `getSignal({ force: true })` for every active row.

The list flow becomes:

1. Read user-owned locked rows and linked lifecycle state.
2. Load or reuse the shared ticker snapshot.
3. Overlay current price and calculate lightweight distance or progress values.
4. Evaluate price-only TP or SL transitions where existing lifecycle rules allow it.
5. Persist changed price, status, and `lastCheckedAt` fields in one bounded batch while leaving indicator values untouched.
6. Preserve the last stored indicator values until the controlled evaluator refreshes them.
7. Return freshness metadata when current prices are stale.

Full indicator analysis belongs in a controlled evaluator or explicit analysis refresh, not in a routine list read. The existing Locked Signal placement and card design remain unchanged.

## 9. Frontend State and UX

### 9.1 State model

The single global dashboard loading flag is replaced with independent state:

```text
initialDashboardLoading
timeframeRefreshing
lockedSignalsLoading
adminSummaryLoading
pendingTimeframe
dashboardError
lockedSignalsError
```

The request coordinator also owns an abort controller and a monotonically increasing request sequence. A response is applied only when its sequence is still current.

### 9.2 Initial load

- Market content renders as soon as its request succeeds.
- Locked Signal and admin summary can continue loading independently.
- Failure in either secondary request does not clear market content.
- Loading messages identify the data being loaded.

### 9.3 Timeframe change

When a timeframe is selected:

1. The existing board remains visible.
2. The selected control immediately shows a pending state such as `Memuat 4H...`.
3. Network execution begins after a 150 ms debounce so rapid intermediate clicks do not all reach the API.
4. Any previous browser request is aborted.
5. The board exposes `aria-busy="true"` while refreshing.
6. Keyboard focus remains on the selected timeframe control.
7. A successful latest response updates the board atomically.
8. The URL is committed only after the corresponding data is successfully displayed.

Other timeframe controls remain operable during refresh. This allows the user to change their selection without waiting for a slow request.

### 9.4 Error and stale states

If a timeframe request fails, the existing data remains visible and the interface states both the requested and displayed timeframe. Example:

```text
Data 4H gagal diperbarui. Data 1H masih ditampilkan.
```

The error includes a functional retry action. It does not clear Locked Signal or admin data.

Stale data includes visible text such as:

```text
Data tertunda, diperbarui 24 detik lalu.
```

Status must not rely on color alone. Loading and error changes use an appropriate live region without repeatedly announcing unchanged board content.

### 9.5 Workspace preservation

The workspace must not use the timeframe as a React `key` for the entire component. It receives new market data through props and synchronizes only state that genuinely depends on the timeframe. Local UI state unrelated to timeframe must survive the refresh.

## 10. Accessibility and Visual Constraints

- Preserve the existing Signal Board and Locked Signal card structures.
- Do not add decorative animations, perpetual pulses, or a new visual system.
- Keep focus indicators visible and verify at least 3:1 non-text contrast.
- Keep normal text at WCAG AA contrast of at least 4.5:1.
- Make timeframe controls reachable and operable by keyboard.
- Use explicit loading, error, empty, delayed, and partial states.
- Ensure status is communicated through text, not color alone.
- Verify the dashboard at 200 percent zoom and mobile widths without horizontal overflow.

The purpose of the pending treatment is to preserve context during data replacement. It must reuse the established dashboard palette and component language rather than redesigning the controls.

## 11. Observability

Before behavior changes, record a repeatable baseline. The optimized backend logs or exposes:

- Total dashboard duration.
- Dominance duration and cache status.
- Ticker duration and cache status.
- Candle duration, hit count, miss count, stale count, and failed count.
- Analysis cache hit and miss counts.
- Upstream request count.
- Number of returned and failed symbols.

The dashboard route adds `Server-Timing` entries and a cache-status response header. Logs must use bounded labels such as timeframe and status. Do not add user email or arbitrary symbol lists as high-cardinality metric labels.

The existing frontend API telemetry remains active. Verification compares cold and warm request duration before and after each implementation phase.

## 12. Testing Strategy

### 12.1 Backend unit tests

- Concurrent ticker requests produce one upstream call.
- Concurrent identical candle requests produce one upstream call.
- Different candle keys do not incorrectly share results.
- Candle expiry follows the next timeframe boundary plus grace.
- Failed in-flight promises are removed.
- Safe stale data is returned after upstream failure.
- Stale data beyond its allowance is rejected.
- Signal analysis is reused for the same closed candle and dominance score.
- A dominance score or closed-candle change invalidates the analysis key.
- Dashboard generation does not call a per-symbol ticker endpoint.
- Dashboard deadline returns stale or partial data within its budget.
- Public cache entries contain no user-owned fields.
- Locked list reads do not trigger forced candle analysis.

### 12.2 Backend HTTP tests

- Dashboard validation and authentication behavior remain unchanged.
- Response metadata and cache headers follow the documented contract.
- A partial dashboard returns HTTP 200 with failed symbols.
- A dashboard with no usable signal returns a retriable service error.
- Rate limits remain enforced.
- Locked signal responses remain scoped to the authenticated user.

### 12.3 Frontend tests

- Timeframe selection requests only the market dashboard.
- Existing market data remains available while a refresh is pending.
- A superseded request cannot replace a newer response.
- Aborted requests do not show an error toast.
- A failed latest request preserves the previous board.
- The URL commits only after successful replacement data.
- Locked signals are not reloaded on a timeframe change.
- Admin summary is not reloaded on a timeframe change.
- Workspace state is not reset by a timeframe prop change.
- Delayed and partial states produce visible text.

### 12.4 Manual and performance verification

- Run frontend and backend unit suites.
- Run backend HTTP tests.
- Run frontend and backend lint.
- Run the frontend production build.
- Click `15m`, `1h`, `4h`, and `1d` rapidly and confirm only the final response is applied.
- Test keyboard-only timeframe changes and retry behavior.
- Test fresh, warm, stale, partial, timeout, and complete-failure scenarios.
- Run concurrent requests representing multiple users selecting the same timeframe.
- Record warm and cold p50 and p95 plus upstream request counts.
- Verify the accepted performance targets before production rollout.

Performance acceptance is measured against one staging API instance in the same region and configuration intended for production. Warm measurements use at least 20 authenticated requests after one priming request. Cold measurements use at least 20 authenticated requests, clearing only process market caches between samples. The reported duration is the end-to-end dashboard HTTP duration, with `Server-Timing` used to separate backend work from network overhead.

## 13. Implementation Sequence

Implementation is divided into reversible stages:

1. **Baseline and diagnostics**
   - Add timing and upstream-count instrumentation without changing behavior.
   - Capture repeatable before measurements.

2. **Backend cache foundation**
   - Implement ticker, candle, analysis, and dashboard cache interfaces.
   - Add in-flight sharing and stale policy tests.

3. **Dashboard fan-out reduction**
   - Reuse the all-ticker snapshot.
   - Remove per-symbol ticker requests.
   - Apply the request budget and response metadata.

4. **Locked Signal separation**
   - Remove forced signal analysis from list reads.
   - Overlay lightweight prices from the ticker snapshot.

5. **Frontend request orchestration**
   - Split loading and error state.
   - Add debounce, abort, sequence protection, and URL commit behavior.
   - Preserve workspace and existing cards.

6. **Verification and tuning**
   - Run automated and manual checks.
   - Compare measurements with the baseline.
   - Tune grace and stale periods only from observed data.

Each stage should be committed separately. A stage that misses its correctness checks must not be rolled into the next stage merely because its average latency improved.

## 14. Rollout and Rollback

The changes move through development, staging, and production. Staging must exercise both cold and warm caches and include concurrent users.

Rollback is performed by implementation stage. The existing API response fields remain intact, so the frontend can tolerate backend rollback while ignoring absent `meta` fields. Backend code must also accept a frontend that does not yet render the new metadata.

Redis is introduced only if deployment topology or measured load requires cache sharing between API replicas. It is not required to complete this optimization.

## 15. Acceptance Criteria

The optimization is complete only when all of the following are true:

- Warm dashboard p95 is at or below 500 ms in the agreed test environment.
- Cold dashboard p95 is at or below 3 seconds, using stale or partial degradation when necessary.
- A normal cold eight-symbol dashboard makes no more than approximately 10 upstream calls.
- Warm dashboard requests make no upstream calls while caches are fresh.
- Timeframe changes do not request locked signals or admin users.
- Timeframe changes do not replace the dashboard with a full-page loading state.
- Rapid selections cannot apply an older response over a newer selection.
- Routine locked-list reads do not force full market analysis.
- Public cache entries are reusable across users and contain no private data.
- Stale and partial data is visibly identified.
- Existing card design and locked-signal placement remain unchanged.
- Automated tests, lint, production build, keyboard checks, and responsive checks pass.
