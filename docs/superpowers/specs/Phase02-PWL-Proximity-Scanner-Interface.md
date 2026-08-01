# Phase 02 — PWL Proximity Scanner Interface

## Objective

Expose the manual PWL scanner in Market Analysis as a collapsible panel above the current watchlist, chart, and insight workspace.

## Scope

- Add a focused client component, for example `PwlProximityScanner.jsx`.
- Place it after `MarketAnalysisControls` and before the existing three-column workspace in `MarketAnalysisWorkspace`.
- Do not introduce a new page, route, or tab.
- Show the UTC and 4H scanner context, range `0–5% above PWL`, proximity tier, and context notice that this is not an entry signal.
- Provide a manual `Scan PWL` button; do not scan on page load or on an interval.
- Render loading, cached, empty, partial-failure, and retryable full-failure states.
- Render each row with symbol, current price, PWL price, nominal delta, percentage distance, 24-hour volume, `Sangat Dekat` status, and `Open 4H`.
- Keep prior successful data visible while a new scan runs, clearly marked as prior data.
- Adapt the list to a compact, keyboard-accessible mobile layout.

## Existing Workspace Integration

- Change Market Analysis interval state so `Open 4H` can set it to `4h`.
- When a user chooses `Open 4H`, add the symbol to the current watchlist if needed, select it, set basis to UTC, set interval to 4H, and preserve the scanner result panel.
- Continue to use the existing single-symbol key-level endpoint only for the market selected for chart inspection.

## Interaction Details

- Disable the client scan button while its request is pending.
- Display scan time and cache expiry from server metadata.
- Allow the panel to collapse after results load; retain data until the user leaves or scans again.
- Use text together with color for every status indicator.

## Completion Criteria

- The scanner is visually positioned between controls and workspace, matching the approved visual direction.
- Clicking `Open 4H` changes the chart and insight panel to the selected scanner market in UTC/4H.
- The mobile view preserves scanner readability and chart access.
- Existing manual symbol analysis, basis controls, watchlist selection, and refresh behavior continue working.
