# BTCUSDT 4H Pullback-Gated Entry Design

## Context

The current TradingView backtest strategy is based on the DCMS market analyzer signal model. It builds a long or short bias from EMA trend, StochRSI, POC/value area, trendline, support/resistance, volume nodes, and an optional USDT dominance score.

Initial BTCUSDT 4H testing shows a low win rate. The observed pattern is that many trades move slightly into profit, usually around 0.5 to 1 ATR, then reverse back into breakeven or stop-loss territory. The strongest working hypothesis is late entry: the score becomes strong only after several confirmations align, so the strategy often enters after BTC has already moved away from the ideal entry area.

This design keeps exits unchanged at first. The goal is to isolate whether better entry timing improves win rate before changing TP, SL, breakeven, or partial-exit logic.

## Goal

Improve BTCUSDT 4H win rate by preventing late market entries after extended candles or overextended moves, while preserving the existing DCMS score model as the directional permission layer.

The first success metric is higher win rate with fewer "late entry then retrace" losses. Net profit and profit factor remain important, but they are secondary during this phase.

## Non-Goals

- Do not rewrite the DCMS score model.
- Do not change TP1, TP2, SL, partial allocation, or breakeven behavior in the first experiment.
- Do not optimize parameters across many assets yet.
- Do not add new external data requirements to Pine Script.

## Recommended Approach

Use a Pullback-Gated Entry model:

1. DCMS score still determines bias permission.
2. A long or short trade is allowed only if price is still in a reasonable entry area.
3. If score is strong but price is overextended, the strategy waits for a pullback instead of entering immediately.
4. If the pullback does not happen within a limited number of candles, the setup expires.

This is preferred over simply raising the score threshold because a higher threshold can make entries even later. It is also preferred over changing exits first because the user identified "late entry" as the most visible chart behavior.

## Entry Components

### Bias Permission

The existing score threshold remains the first gate:

- Long permission: score is greater than or equal to the configured long threshold.
- Short permission: score is less than or equal to the negative threshold.
- The strategy still respects `allowLong`, `allowShort`, confirmed bars, valid SL/TP ordering, and history readiness.

### Pullback Zone

For BTCUSDT 4H, the first pullback zone should be ATR-based and EMA-aware:

- Long zone: current price must be no more than a configurable ATR distance above the fast EMA or entry reference.
- Short zone: current price must be no more than a configurable ATR distance below the fast EMA or entry reference.
- Suggested starting parameter: maximum extension of 0.6 ATR from the chosen anchor.

The anchor can be tested in two modes:

- EMA anchor: distance from EMA fast.
- Entry reference anchor: distance from previous candle close, matching the current analyzer entry reference.

The first implementation should expose this as an input so BTC 4H can be tested without changing code repeatedly.

### Candle Extension Filter

Skip immediate entries when the signal candle is too large relative to ATR:

- Define candle range as high minus low.
- Define candle body as absolute close minus open.
- A setup is considered extended when range or body exceeds a configurable ATR multiple.
- Suggested starting parameter: range greater than 1.2 ATR blocks immediate entry.

This prevents entries directly after large BTC 4H impulse candles where retracement risk is high.

### Wait-for-Pullback State

When score gives permission but the price is too extended:

- Mark a pending long or short setup.
- Store the setup direction, score, SL/TP levels, and setup age.
- Allow entry later only if price returns to the pullback zone while bias is still valid.
- Expire the setup after a small number of candles.

Suggested starting parameter: expire after 3 candles on BTCUSDT 4H.

## Data Flow

1. Calculate the existing indicators and DCMS score.
2. Determine long or short bias permission.
3. Calculate current extension from the selected pullback anchor.
4. Check whether the signal candle is extended.
5. If bias is valid and price is not extended, enter normally.
6. If bias is valid but price is extended, create or refresh a pending setup.
7. On each following candle, enter only if price pulls back into the allowed zone and the bias remains valid.
8. Expire pending setup when age exceeds the configured candle limit or bias becomes neutral/opposite.
9. Manage exits with the existing TP1, TP2, SL, and breakeven logic.

## Parameters To Expose

- Enable Pullback-Gated Entry: default true for this experiment.
- Pullback anchor: EMA fast or previous close.
- Maximum extension from anchor: default 0.6 ATR.
- Maximum signal candle range: default 1.2 ATR.
- Pending setup expiry candles: default 3.
- Require bias to remain valid during pending setup: default true.

## Error Handling And Guardrails

- If ATR is unavailable or invalid, fall back to the existing entry behavior only after history readiness is satisfied.
- If EMA fast is unavailable, use previous close as the pullback anchor.
- If a new opposite bias appears, clear the pending setup.
- Do not enter if stored SL/TP ordering is invalid.
- Do not pyramid; keep the current single-position behavior.

## Testing Plan

Use TradingView Strategy Tester on BTCUSDT 4H and compare:

- Baseline script with no pullback gate.
- Pullback gate enabled with EMA anchor.
- Pullback gate enabled with previous-close anchor.
- Different maximum extensions: 0.4 ATR, 0.6 ATR, 0.8 ATR.
- Different pending expiries: 2, 3, 4 candles.

Track these outputs:

- Win rate.
- Total number of trades.
- Profit factor.
- Max drawdown.
- Average trade.
- Number of skipped immediate entries.
- Number of pending setups that eventually entered.
- Number of pending setups that expired.

The expected healthy result is fewer trades, higher win rate, and fewer visible late-entry losses. If win rate rises but profit factor collapses, the entry filter is too restrictive or exits need a second design pass.

## Open Decisions

The first implementation should keep both anchor options configurable because BTCUSDT 4H may respond differently to EMA distance versus previous-close distance. After backtesting, choose the anchor that improves win rate without collapsing trade count.

## Approval Status

User approved using Pullback-Gated Entry as the initial specification direction on 2026-07-01.
