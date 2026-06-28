# PRD: DCMS Landing Hero Redesign

Date: 2026-06-28
Scope: Hero section only
Status: Ready for review

## Goal

Redesign the DCMS landing page hero so first viewport feels premium, serious, and specific to DCMS. The hero must make visitors understand three things fast:

1. DCMS is a free, active crypto community.
2. DCMS is risk-aware and does not promise instant profit.
3. Logged-in members can access a dashboard experience, while new visitors are guided toward Discord first.

## Non-Goals

This PRD does not cover full landing page implementation, feedback section redesign, FAQ redesign, footer, dashboard page changes, or production installation of `@ogtirth/liquid-glass-oss`. Those are later phases.

## Audience

The hero must work for two main visitor types:

1. New crypto learners who need trust, clarity, and low-pressure entry.
2. Active traders who want signals, market context, and dashboard access without hype.

Tone: direct, premium, risk-aware, and a little brutal-honest. Avoid fake luxury, fake profit promises, and generic SaaS hero language.

## Primary Hero Concept

Use the approved direction from the visual companion:

- Centered, large Nebulica typography.
- Dark DCMS background with subtle grid/dashed technical frame.
- Liquid-glass floating navbar.
- Dashboard preview under the main typography, semi-visible and partly below the fold.
- Manual PnL cards as low-opacity visual sweeteners around the headline.
- Strong risk disclaimer framing around PnL.

## Guest State

Guest means user is not logged in.

### Navbar

Use split glass islands:

- Left island: DCMS logo + `DCMS`.
- Center island: navigation links.
- Right island:
  - `Login` as secondary glass/text action.
  - `Daftar Member` as lime primary action.

Recommended nav links:

- `Community`
- `Dashboard`
- `Stories`
- `FAQ`

### Hero Copy

Kicker:

`FREE RISK-AWARE CRYPTO COMMUNITY`

Headline:

`CRYPTO ITU KERAS.`

Second line:

`BELAJAR JANGAN SENDIRIAN.`

Supporting copy:

`Pantau market, baca sinyal, dan cek risk dari dashboard DCMS. Free, aktif, dan tanpa janji profit instan.`

Primary CTA:

`Join Discord`

Secondary CTA:

`Lihat isi komunitas`

Small helper text:

`Mau akses dashboard? Daftar Member ada di kanan atas.`

## Logged-In State

Logged-in means user session exists.

### Navbar

Keep split glass islands. Replace `Login` and `Daftar Member` with member actions:

- User pill:
  - Avatar initial.
  - Display name, using available user name or email fallback.
  - UID or role detail when available.
  - Dropdown caret for account menu.
- Lime CTA: `Dashboard`.

### Hero Copy

Use member-aware hero copy when logged in:

Kicker:

`MEMBER ACCESS ACTIVE`

Headline:

`CRYPTO ITU KERAS.`

Second line:

`CEK DASHBOARD DULU.`

Supporting copy:

`Akun kamu sudah aktif. Langsung masuk dashboard untuk pantau market, signal board, dan reminder risk.`

Primary CTA:

`Buka Dashboard`

Secondary CTA:

`Lihat komunitas`

## Visual Requirements

### Typography

Use existing project typography:

- Display/headline: Nebulica.
- Body/UI: Chakra Petch.

No viewport-width font scaling. Use responsive breakpoints and clamp only if needed for safe fit.

### Background

Hero background should be dark and technical:

- Base: near-black / existing DCMS dark gradient.
- Subtle lime radial glow behind lower hero area.
- Very subtle cyan/blue accent glow if needed.
- Grid line pattern with low opacity.
- Dashed rectangular frame around core hero area.

Avoid decorative blobs/orbs. Keep the design technical, not decorative.

### Liquid Glass Usage

Use liquid-glass styling in a restrained way:

- Navbar islands.
- Secondary hero CTA.
- Manual PnL cards.
- Optional small disclaimer pill.

Baseline implementation can use CSS glass styling first:

- translucent background
- border
- backdrop blur
- inner highlight
- soft shadow

`@ogtirth/liquid-glass-oss` is optional for later enhancement. Do not block hero implementation on it.

### Dashboard Preview

Dashboard preview must visually resemble the existing `app/dashboard/` design, not a generic SaaS mockup.

Required dashboard cues:

- Left sidebar in near-black.
- Dark dashboard main surface.
- `Dashboard` title.
- BTC/ETH summary cards.
- Timeframe chip, e.g. `15M`.
- Signal card with `BIAS LONG`.
- Price/risk progress bar.
- Lime and slate accents matching current dashboard.

Position:

- Centered below headline and CTAs.
- Slight 3D perspective tilt.
- Partly below the fold.
- Current approved adjustment: higher and clearer than previous draft.

Target style values:

- Position around `bottom: -92px` on desktop hero.
- Opacity around `0.66`.
- Background around `rgba(17, 24, 32, 0.58)`.
- Keep a bottom fade so it does not overpower the headline.

### Manual PnL Cards

PnL cards are built manually in HTML/CSS, not image assets.

Use two low-opacity cards:

- Left: `SOLUSDT`, `LONG`, `+182%`, `member result`.
- Right: `BTCUSDT`, `SWING`, `+47.8%`.

Add visible disclaimer:

`Member result, not guarantee`

PnL cards must not become the primary proof. They are decorative/supportive only.

## Interaction Requirements

Guest:

- `Join Discord` opens Discord invite in a new tab.
- `Lihat isi komunitas` scrolls to community section when later implemented.
- `Login` routes to `/login`.
- `Daftar Member` routes to `/register`.

Logged-in:

- `Dashboard` and `Buka Dashboard` route to `/dashboard`.
- User pill opens existing account dropdown behavior.
- `Lihat komunitas` scrolls to community section when later implemented.

## Responsive Requirements

Desktop:

- Full split glass navbar.
- Large centered headline.
- Dashboard preview visible below typography.
- PnL cards visible but subtle.

Tablet:

- Keep split nav if space allows.
- Reduce nav link gap.
- Dashboard preview remains visible but narrower.
- PnL cards can move closer to edges or reduce opacity.

Mobile:

- Nav becomes compact:
  - Logo island.
  - Main CTA.
  - Menu/account icon.
- Headline must fit without text overlap.
- Dashboard preview can be simplified, smaller, and more hidden below fold.
- PnL cards may be hidden if they create clutter.

## Accessibility Requirements

- CTA labels must be clear and unique.
- Links/buttons must have visible focus states.
- Text contrast must remain readable against glass surfaces.
- PnL cards must not be the only proof or message.
- Respect reduced motion if future animation is added.

## Performance Requirements

- Do not load large screenshot assets for dashboard preview in the hero.
- Build dashboard preview with CSS/HTML primitives.
- Keep any glass effect CSS-first for initial implementation.
- If a WebGL liquid-glass package is added later, lazy-load it and preserve CSS fallback.

## Acceptance Criteria

Hero is accepted when:

1. Guest navbar shows `Login` and `Daftar Member`.
2. Logged-in navbar shows user pill and `Dashboard`.
3. Guest hero keeps `Join Discord` as primary CTA.
4. Logged-in hero uses dashboard-oriented CTA.
5. Dashboard preview resembles current DCMS dashboard.
6. Dashboard preview is higher and more visible than the earlier muted version.
7. Manual PnL cards exist without image assets.
8. PnL disclaimer is visible.
9. Hero remains readable on desktop, tablet, and mobile.
10. No production changes outside hero-related files are required for this phase.

## Open Decisions Locked for This PRD

- Register CTA placement: navbar right side for guest.
- Dashboard CTA placement: navbar right side for logged-in.
- Hero remains community-first for guest.
- Hero becomes dashboard-first for logged-in.
- Liquid-glass package is deferred; CSS glass is baseline.
