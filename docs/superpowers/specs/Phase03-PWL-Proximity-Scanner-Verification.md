# Phase 03 — PWL Proximity Scanner Verification

## Objective

Validate correctness, concurrency protection, performance, and user-visible states before releasing the scanner.

## Verification Matrix

| Area | Required checks |
| --- | --- |
| Data correctness | PWL uses the prior completed UTC week; no below-PWL or greater-than-1% results appear; ordering is nearest first. |
| Presentation | Every row displays current price, PWL price, nominal delta, percentage distance, volume, and accurate `Sangat Dekat` status. |
| Workspace handoff | `Open 4H` selects/adds the market and loads the UTC 4H chart and insights. |
| Empty and failures | Empty results, partial symbol failures, upstream failure, and retry states are understandable and preserve the existing workspace. |
| Cache and concurrency | Cache survives for five minutes; concurrent calls share one active scan; expired scans refresh once. |
| Load safety | Simulate 10–20 concurrent endpoint requests with mocked upstream calls and confirm bounded upstream work. |
| Accessibility | Button state, keyboard actions, focus order, mobile layout, and non-color status text work correctly. |

## Commands and Checks

- Run focused unit and route tests for the scanner engine.
- Run the project lint command on changed files.
- Run a production build.
- Manually verify desktop and mobile Market Analysis flows against the approved scanner placement preview.
- Record any upstream Bitunix rate-limit or data-shape differences found during integration and adjust only the scanner adapter, not shared key-level semantics.

## Release Criteria

- All Phase 01 and Phase 02 completion criteria pass.
- No regression in existing key-level analysis or the dashboard build.
- Manual scanning remains the only scanner trigger.
- Scanner output is described as market context, never as a trade recommendation.
