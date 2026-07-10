# DCMS Market Analysis Key Levels Design

Date: 2026-07-10
Status: Ready for implementation planning
Scope: Dashboard Market Analysis feature

## Goal

Replace the current under-construction Market Analysis page with a Bitunix futures key-level scanner that helps members see where price sits relative to:

- PDH: Previous Day High
- PDL: Previous Day Low
- PWH: Previous Week High
- PWL: Previous Week Low

The feature is an awareness and context tool. It does not generate entry, stop loss, take profit, buy, or sell instructions.

## Approved Direction

The approved experience is **DCMS Dark Pro with a dense candlestick chart**:

- Market Analysis lives at `/dashboard/market-analysis`.
- Default watchlist is `BTCUSDT`, `ETHUSDT`, and `SOLUSDT`.
- The selected symbol opens a large chart-first analysis view.
- The chart uses a dark DCMS-native surface.
- Candle density should feel close to an exchange chart, with visual candle spacing around 2-4px.
- PDH, PDL, PWH, and PWL appear as horizontal price lines on the chart.
- Insight copy is in Bahasa Indonesia.
- The UI includes both `UTC Exchange` and `Trading Session` level basis modes.

## Non-Goals

This design does not cover:

- Placing orders or connecting to execution.
- Giving signal entries, take profits, stop losses, or leverage suggestions.
- Replacing the existing Signal Board.
- Adding alert notifications, saved watchlists, or user-configurable session hours in the MVP.
- Supporting spot, forex, stocks, or non-Bitunix exchanges in the MVP.
- Persisting analysis history to the database.

## Users And Tone

The feature is for DCMS members who already look at crypto futures charts and want fast context before making their own trading decision.

Tone rules:

- Use direct Bahasa Indonesia.
- Explain level position clearly.
- Avoid profit promises.
- Avoid wording that sounds like trade advice.
- Use phrases like `Harga berada dekat PDL`, `Level terdekat`, and `Di dalam range mingguan`.
- Include a small reminder that the panel is context only, not an entry signal.

## Page Structure

### Header

The page header contains:

- Title: `Market Analysis`
- Short description: `Pantau posisi harga terhadap PDH, PDL, PWH, dan PWL dari Bitunix futures. Fokusnya konteks level, bukan signal entry.`
- Symbol search input.
- `Analyze` action.
- Level basis controls.

### Level Basis Controls

The controls support:

- `UTC`: default mode.
- `Session`: alternate mode.
- `Asia`
- `London`
- `New York`

When `UTC` is active, session chips are visually secondary or inactive.

When `Session` is active, one session must be selected. Default session is `New York`.

### Watchlist Cards

Default cards:

- `BTCUSDT`
- `ETHUSDT`
- `SOLUSDT`

Each card shows:

- Symbol.
- Current price.
- Alert state, such as `Dekat PDL`, `Dalam Range`, or `Di Atas PDH`.
- Nearest level and distance.
- Range state.

Clicking a card selects it and refreshes the chart and insight panel.

### Main Chart

The chart is the primary surface.

Visual requirements:

- DCMS dark surface.
- Dense candlestick series with volume histogram.
- Candle spacing visually around 2-4px.
- Right-side price scale.
- Bottom time scale.
- Horizontal level lines for `PWH`, `PDH`, `NOW`, `PDL`, and `PWL`.
- Soft weekly and daily range bands, kept subtle enough not to hide candles.
- No decorative glow that makes prices harder to read.

Implementation preference:

- Use `lightweight-charts`.
- Render candlesticks and volume histogram as real chart series.
- Render PDH, PDL, PWH, PWL, and current price through chart price lines, not manually positioned HTML.

### Insight Panel

The right-side panel shows:

- Status card.
- Weekly range card.
- Level table.
- Context-only reminder.

Example copy:

```txt
Status: Dekat PDL
Harga BTCUSDT berada 0,22% di atas PDL. Area ini layak dipantau sebagai level bawah harian.
```

```txt
Range Mingguan: Di dalam
Harga masih berada di antara PWH dan PWL. Belum ada kondisi di atas PWH atau di bawah PWL.
```

Level table columns:

- Level label.
- Price.
- Distance from current price.

## Level Definitions

### UTC Exchange Mode

UTC Exchange mode is the default because it is easiest to validate against exchange candles.

Definitions:

- `PDH`: high of the previous completed UTC daily candle.
- `PDL`: low of the previous completed UTC daily candle.
- `PWH`: highest high from the previous completed UTC calendar week.
- `PWL`: lowest low from the previous completed UTC calendar week.

Previous week uses Monday 00:00 UTC through Sunday 23:59:59 UTC.

If Bitunix does not provide weekly futures klines for the required interval, compute PWH and PWL from daily candles.

### Trading Session Mode

Trading Session mode adjusts the level window to a selected session.

MVP session windows are fixed in UTC:

- `Asia`: 00:00-08:00 UTC.
- `London`: 07:00-16:00 UTC.
- `New York`: 13:00-22:00 UTC.

MVP deliberately does not handle daylight saving time changes. If users need DST-aware sessions later, add it as a separate enhancement.

Definitions:

- Session `PDH`: highest high from the previous completed session window.
- Session `PDL`: lowest low from the previous completed session window.
- Session `PWH`: highest high across the selected session windows in the previous completed UTC calendar week.
- Session `PWL`: lowest low across the selected session windows in the previous completed UTC calendar week.

Session labels must make the basis clear so users do not confuse session-adjusted levels with UTC exchange levels.

Display labels:

- UTC mode: `UTC Exchange`
- Session mode: `Session: Asia`, `Session: London`, or `Session: New York`

## Alert States

Alert states are descriptive, not prescriptive.

Supported MVP states:

- `Dekat PDL`
- `Dekat PDH`
- `Dekat PWL`
- `Dekat PWH`
- `Di Dalam Range Harian`
- `Di Dalam Range Mingguan`
- `Di Atas PDH`
- `Di Bawah PDL`
- `Di Atas PWH`
- `Di Bawah PWL`

Near-level threshold:

- Default threshold is within `0.35%` of a level.
- If more than one level is near, choose the nearest by absolute percentage distance.

Distance formula:

```txt
distancePercent = ((currentPrice - levelPrice) / levelPrice) * 100
```

Display distance as absolute distance for labels like `0,22% dari PDL`, and signed distance in the level table.

## Data Flow

### Existing Project Context

The project already has Bitunix futures integration in:

- `lib/market/exchange-fetchers.js`
- `lib/market-dashboard.js`
- `app/api/market-dashboard/route.js`

The new feature should reuse the existing Bitunix fetch helper and caching pattern where practical.

### Proposed Server Modules

Add a focused market-analysis module:

- `lib/market/key-levels.js`

Responsibilities:

- Normalize symbols.
- Fetch current ticker data.
- Fetch chart klines.
- Fetch daily or intraday klines needed for level calculations.
- Compute UTC Exchange levels.
- Compute Trading Session levels.
- Compute alert state and distance metrics.
- Return a view-ready payload.

### Proposed API Route

Add:

- `app/api/market-analysis/key-levels/route.js`

Query params:

- `symbol`: required, default from UI is `BTCUSDT`.
- `basis`: `utc` or `session`.
- `session`: `asia`, `london`, or `new-york`.
- `interval`: default `15m`.

API response shape:

```json
{
  "symbol": "BTCUSDT",
  "source": "BITUNIX",
  "basis": "utc",
  "session": null,
  "interval": "15m",
  "currentPrice": 62921.99,
  "updatedAt": "2026-07-10T00:00:00.000Z",
  "levels": {
    "pdh": 64120,
    "pdl": 62780,
    "pwh": 64520,
    "pwl": 61720
  },
  "distances": {
    "pdh": 1.9,
    "pdl": 0.22,
    "pwh": 2.54,
    "pwl": -1.91
  },
  "nearestLevel": "pdl",
  "alertState": "Dekat PDL",
  "rangeState": "Di dalam range mingguan",
  "candles": [],
  "volume": []
}
```

### Client Components

Expected components:

- `app/dashboard/market-analysis/page.jsx`
- `app/dashboard/market-analysis/MarketAnalysisWorkspace.jsx`
- `app/dashboard/market-analysis/MarketAnalysisControls.jsx`
- `app/dashboard/market-analysis/MarketWatchlist.jsx`
- `app/dashboard/market-analysis/KeyLevelChart.jsx`
- `app/dashboard/market-analysis/InsightPanel.jsx`

`KeyLevelChart.jsx` should be a client-only component because chart rendering depends on DOM measurement.

If `lightweight-charts` is not already installed, add it during implementation:

```bash
npm install lightweight-charts
```

## UI States

### Loading

Use skeletons shaped like the final layout:

- Watchlist card skeletons.
- Chart skeleton with grid-like surface.
- Insight panel skeleton rows.

Avoid generic circular spinners as the main loading state.

### Empty

If a symbol is not found:

- Keep the page structure visible.
- Show a clear empty message near the chart area.
- Copy: `Symbol tidak ditemukan di Bitunix futures. Coba gunakan format seperti BTCUSDT.`

### Error

If Bitunix fetch fails:

- Show an inline error in the chart surface.
- Keep controls usable.
- Include a `Coba lagi` action.
- Copy: `Data market belum bisa dimuat. Coba lagi dalam beberapa saat.`

### Stale Data

If cached data is shown after a failed refresh:

- Keep the chart visible.
- Show a small stale-data label: `Data terakhir`.
- Do not hide the levels unless there is no usable data at all.

## Visual Rules

Use the existing DCMS dashboard language:

- Dark surfaces.
- Lime accent `#B7FB5B` for selected states and positive emphasis.
- Cool gray surfaces and borders.
- Tabular numeric rendering.
- Tight chart density.
- Rounded containers, with larger outer radius and tighter inner radius.

Avoid:

- Purple or blue decorative gradients as the main style.
- Large empty chart spacing.
- Oversized text in the chart area.
- Floating decorative labels that cover candles.
- Copy that sounds like a trade instruction.

## Accessibility

Requirements:

- Controls must be keyboard reachable.
- Active basis and active session must be visible through more than color alone.
- Chart must have an accessible text summary outside the canvas.
- Error and empty states must be readable by screen readers.
- Color contrast should stay readable on dark surfaces.

Suggested chart summary text:

```txt
BTCUSDT berada dekat PDL. Harga saat ini 62.921,99. PDL 62.780, PDH 64.120, PWL 61.720, PWH 64.520.
```

## Performance

Requirements:

- Fetch market-analysis data through the server API, not directly from the browser to Bitunix.
- Cache public market data briefly using existing project patterns.
- Avoid re-rendering the chart on every React state update.
- Resize the chart through `ResizeObserver`.
- Clean up chart instances on unmount.

Suggested refresh behavior:

- Initial load fetches selected symbol.
- Changing basis, session, interval, or symbol refetches.
- Manual refresh can be added later.
- Auto-refresh is not required for MVP.

## Testing

Unit tests should cover:

- UTC daily level calculation.
- UTC weekly level calculation from daily candles.
- Session window filtering.
- Session weekly aggregation.
- Distance calculation.
- Nearest level detection.
- Alert state selection.
- Invalid or missing kline data handling.

UI verification should cover:

- Default load with BTCUSDT.
- Switching watchlist symbols.
- Searching a symbol.
- Switching UTC and Session modes.
- Selecting Asia, London, and New York sessions.
- Loading, empty, and error states.
- Mobile layout collapse.

## Implementation Boundaries

This feature should be implemented as a focused Market Analysis slice.

Do not modify:

- Authentication logic.
- Bitunix user registration.
- Signal Board signal generation.
- Locked signal logic.
- Signal history.
- Landing page behavior.

Shared helpers may be reused, but the key-level calculations should live in their own module so they can be tested independently.

## Implementation Notes

No product decisions are left open for MVP.

Implementation may decide exact component file split if it preserves these boundaries:

- Data calculation stays server-side or in pure shared helpers.
- Chart rendering stays in a client leaf component.
- UI copy stays Bahasa Indonesia.
- The feature remains context-only and does not become a signal generator.
