# USDT.D Hybrid Context Implementation Plan

Spec: `docs/superpowers/specs/2026-06-23-usdt-dominance-hybrid-design.md`

## Objective

Implement hybrid USDT dominance scoring as a safe confirmation layer. Higher timeframe USDT.D movement influences signal score, while 15m only adds a small score when it aligns with higher timeframe direction. Missing trend data must stay neutral and never break dashboard signal generation.

## Phase 1: Scoring Module

Create `lib/market/usdt-dominance-trend.js`.

Exports:

- `calculateUsdtDominanceTrendContext(input)`
- `getNeutralUsdtDominanceTrendContext(reason)`

Input shape:

```js
{
  "4h": { changePct: -1.2 },
  "1h": { changePct: -0.4 },
  "15m": { changePct: 0.1 }
}
```

Output shape:

```js
{
  score: 2.5,
  regime: "RISK_ON",
  alignment: "BULLISH_CRYPTO",
  warnings: [],
  components: {
    "4h": { changePct: -1.2, score: 2 },
    "1h": { changePct: -0.4, score: 0.5 },
    "15m": { changePct: 0.1, score: 0, reason: "15m ignored because against HTF" }
  }
}
```

Implementation notes:

- Keep thresholds as named constants.
- Treat positive `changePct` as USDT.D rising, bearish for crypto.
- Treat negative `changePct` as USDT.D falling, bullish for crypto.
- Score 15m only when `4h score + 1h score` has same sign.
- Invalid or missing timeframe values score `0` and add warning.

## Phase 2: Unit Tests

Add `tests/unit/usdt-dominance-trend.test.js`.

Cases:

- Bullish: 4H down `1.2`, 1H down `0.4`, 15m up `0.1` returns `RISK_ON`, positive score, 15m score `0`.
- Bearish: 4H up `1.3`, 1H up `0.6`, 15m up `0.3` returns `RISK_OFF`, negative score, 15m score `-0.5`.
- 15m against HTF returns `0` for 15m and warning.
- Mixed HTF makes 15m neutral.
- Missing input returns `UNKNOWN`, score `0`, no throw.
- Invalid numbers return neutral components and warnings.

Run:

```sh
npm test -- tests/unit/usdt-dominance-trend.test.js
```

## Phase 3: Market Context Fallback

Update `lib/market/market-context.js`.

Add:

- `getUsdtDominanceTrendContext(forceRefresh = false)`

For first implementation, return neutral context:

```js
getNeutralUsdtDominanceTrendContext("USDT.D trend data unavailable")
```

Reason:

- Keeps the new contract wired without depending on a live USDT.D candle source.
- Lets scoring module and UI be tested now.
- Live candle source can be added in a separate step.

## Phase 4: Dashboard Backend Wiring

Update `lib/market-dashboard.js`.

Changes:

- Fetch `usdtDominanceTrend` beside current `usdtDominance`.
- Pass both into signal generation:

```js
marketContext: {
  usdtDomScore: usdtDominanceTrend?.score || 0,
  usdtDominanceTrend,
}
```

- Preserve current `usdtDominance` value object for dashboard metric.
- Return top-level `usdtDominanceTrend` in dashboard response.
- Add `usdtDominanceTrend` fields to each signal via `withMarketContext()`.

Fallback behavior:

- If trend context fails, use neutral context and keep current dashboard response alive.

## Phase 5: Signal Generator Metadata

Update `lib/market/signal-generator.js`.

Changes:

- Continue initializing score from `Number(marketContext.usdtDomScore || 0)`.
- Add output:

```js
usdtDominanceTrend: marketContext.usdtDominanceTrend || null
```

Regression goal:

- Existing callers with empty `marketContext` keep working.
- DEX fallback remains unaffected unless later wired separately.

## Phase 6: Dashboard UI

Update dashboard UI files only after checking current component state because worktree already has local changes.

Likely target:

- `app/dashboard/page.jsx` for top `USDT.D` metric.
- `app/dashboard/DashboardSignalBoard.jsx` for signal detail warning.

Behavior:

- Show current USDT.D percentage as today.
- Add compact regime text: `RISK_ON`, `RISK_OFF`, `MIXED`, or `UNKNOWN`.
- In signal detail, show warning text only if `signal.usdtDominanceTrend.warnings` has items.

UI constraints:

- Keep label small.
- Do not make warning affect signal direction.
- Do not redesign dashboard layout.

## Phase 7: Regression Tests

Extend existing signal generator tests.

Cases:

- Empty `marketContext` still returns signal without `usdtDominanceTrend` crash.
- Provided `usdtDominanceTrend` appears in generated signal.
- Provided `usdtDomScore` still affects score.

Run likely test set:

```sh
npm test -- tests/unit/usdt-dominance-trend.test.js tests/unit/signal-generator-regression.test.js
```

If package scripts differ, inspect `package.json` and use project test command.

## Phase 8: Manual Verification

After implementation:

1. Run unit tests.
2. Start dev server if needed.
3. Open dashboard.
4. Confirm USDT.D percentage still renders.
5. Confirm regime label renders as `UNKNOWN` while live trend source is absent.
6. Confirm signals still load.
7. Confirm no console/server error from missing trend data.

## Commit Plan

Use small commits if implementation is split:

1. `feat(market): add usdt dominance trend scoring`
2. `feat(market): wire usdt dominance trend context`
3. `feat(dashboard): show usdt dominance regime`

If changes stay small, one commit is acceptable:

```txt
feat(market): add usdt dominance hybrid context
```

## Risks

- Existing uncommitted changes in dashboard and market files may overlap with this work.
- Current USDT.D API only gives current dominance value, not multi-timeframe candles.
- UI warning placement may need adjustment after seeing current dashboard layout.

## Out of Scope

- Live USDT.D candle API integration.
- Backtesting thresholds.
- Changing bias threshold from `score >= 4` or `score <= -4`.
- Blocking signals based only on USDT.D.
