# USDT.D Hybrid Context Design

## Summary

Add a hybrid USDT dominance context for the market signal engine. USDT.D should act as extra confirmation, not the main direction maker. The engine will use higher timeframe USDT.D movement for score context and treat 15m movement as a small confirmation only when it aligns with higher timeframes.

## Goals

- Use USDT.D as market regime confirmation for crypto risk-on and risk-off conditions.
- Reduce noise from 15m USDT.D movement.
- Keep signal generation resilient when USDT.D trend data is unavailable.
- Preserve current signal generator shape: `marketContext.usdtDomScore` remains the score input.
- Expose enough metadata for dashboard labels and warnings.

## Non-Goals

- Do not make USDT.D the only source of long or short bias.
- Do not block all signals based only on USDT.D.
- Do not require a live USDT.D candle API before the scoring rules can be tested.
- Do not refactor unrelated market indicators.

## Architecture

Create a focused module:

```txt
lib/market/usdt-dominance-trend.js
```

The module receives normalized multi-timeframe USDT.D change inputs and returns a trend context:

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

`market-context.js` remains responsible for USDT.D value and data fetching. It can later add a real candle source. Until trend data exists, it returns a neutral trend context.

`market-dashboard.js` passes the computed trend score into `generateSignalFromCandles()` through `marketContext.usdtDomScore`.

`signal-generator.js` continues adding `marketContext.usdtDomScore` to the signal score, and returns trend metadata for UI use.

## Scoring Rules

Interpretation:

- USDT.D down means crypto risk-on and is bullish confirmation for crypto.
- USDT.D up means crypto risk-off and is bearish confirmation for crypto.

### 4H

- Down at least `1.0%`: `+2`
- Down from `0.4%` to `0.99%`: `+1`
- Up at least `1.0%`: `-2`
- Up from `0.4%` to `0.99%`: `-1`
- Smaller movement: `0`

### 1H

- Down at least `0.4%`: `+0.5`
- Up at least `0.4%`: `-0.5`
- Smaller movement: `0`

### 15M

15m is noise-prone. It only contributes when it aligns with the combined 4H and 1H direction.

- Down at least `0.2%` and higher timeframes are risk-on: `+0.5`
- Up at least `0.2%` and higher timeframes are risk-off: `-0.5`
- Movement against higher timeframes: `0` and add warning
- Smaller movement: `0`

Higher timeframe direction is based on the sign of `4h score + 1h score`.

## Regime Labels

- `score >= 1.5`: `RISK_ON`
- `score <= -1.5`: `RISK_OFF`
- Otherwise: `MIXED`
- If data is unavailable: `UNKNOWN`

Suggested alignment labels:

- `BULLISH_CRYPTO` for `RISK_ON`
- `BEARISH_CRYPTO` for `RISK_OFF`
- `MIXED` for mixed or weak score
- `UNKNOWN` for unavailable data

## Data Flow

1. Dashboard request calls `getMarketDashboard()`.
2. `getMarketDashboard()` gets current USDT.D value as it does today.
3. `getMarketDashboard()` also requests `getUsdtDominanceTrendContext()`.
4. If trend data is available, trend context returns hybrid score and metadata.
5. If trend data fails or is missing, trend context returns score `0`, regime `UNKNOWN`, and a warning.
6. Signal fetchers pass `marketContext.usdtDomScore` and `marketContext.usdtDominanceTrend` into `generateSignalFromCandles()`.
7. Generated signals include `usdtDominanceTrend` for dashboard labels and detail warnings.

## Error Handling

- Missing trend data: return neutral score `0` and warning `USDT.D trend data unavailable`.
- Invalid timeframe value: that timeframe contributes `0` and records a warning.
- Partial data: valid timeframes still score; missing timeframes are neutral.
- External API failure: dashboard still returns signals using neutral USDT.D trend score.
- Existing dominance value failures keep current fallback behavior.

## UI Behavior

Dashboard keeps showing current `USDT.D` percentage. Add a compact regime label beside it:

- `RISK_ON`
- `RISK_OFF`
- `MIXED`
- `UNKNOWN`

Signal detail can show warnings when useful, especially when 15m moves against higher timeframes. This warning should not flip the signal direction.

## Testing

Add focused unit tests for `usdt-dominance-trend.js`:

- Bullish scenario: 4H down `1.2%`, 1H down `0.4%`, 15m up `0.1%` returns positive score and ignores 15m.
- Bearish scenario: 4H up `1.3%`, 1H up `0.6%`, 15m up `0.3%` returns negative score and includes 15m.
- 15m against higher timeframes returns `0` for 15m and adds warning.
- Missing or invalid data returns neutral components without throwing.

Add regression coverage for signal generation:

- `generateSignalFromCandles()` still works when `marketContext` is empty.
- `generateSignalFromCandles()` includes `usdtDominanceTrend` when provided.

## Rollout

1. Implement scoring module with static input support.
2. Wire neutral trend fallback into market context.
3. Wire score and metadata through dashboard and signal generator.
4. Add dashboard label and detail warning.
5. Add live USDT.D candle data source later, after scoring behavior is validated.

## Open Decisions

- Exact external source for live USDT.D candles remains separate from this design.
- Threshold values are initial defaults and should be kept configurable for tuning.
