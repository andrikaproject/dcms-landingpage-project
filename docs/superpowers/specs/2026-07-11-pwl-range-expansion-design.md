# PWL Scanner Range Expansion Design

Date: 2026-07-11
Status: Approved and implemented

## Goal

Make the PWL Proximity Scanner useful when no market is within 1% of PWL by expanding its inclusive eligibility range to 0% through 5% above PWL.

## Rules

- Market below PWL remains excluded.
- Market from exactly 0% through exactly 5% above PWL is included.
- Results remain sorted by ascending percentage distance from PWL.
- `Sangat Dekat`: distance at or below 0.35%.
- `Dekat`: distance above 0.35% through 1%.
- `Pantau`: distance above 1% through 5%.
- Current price, PWL, nominal delta, percentage distance, volume, cache, authentication, and manual-only scan behavior remain unchanged.

## UI

- Scanner context and empty-state copy change from `0–1%` to `0–5%`.
- Every result retains a text status label in addition to color.
- The existing `Sangat Dekat` badge remains visually prominent. `Dekat` and `Pantau` give context without implying an entry signal.

## Validation

- Test inclusive 5% boundary and exclusion above 5%.
- Test each status-tier boundary.
- Confirm rows still rank nearest first and markets below PWL never appear.
