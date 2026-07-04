# DCMS Landing Signal Pulse Animation Design

Date: 2026-07-04
Status: Ready for implementation planning
Scope: Landing hero animation only

## Goal

Add purposeful motion to the DCMS landing hero so the first viewport feels like a live, risk-aware crypto terminal without becoming noisy, hype-driven, or heavy on mobile.

The approved direction is **Signal Pulse + Typewriter Headline**:

- The hero headline keeps the fixed phrase `CRYPTO ITU`.
- The final headline word uses a typewriter rotation.
- Hero background, dashboard preview, PnL cards, CTA, and glass islands gain restrained motion.
- Below-the-fold sections are not part of this phase.

## Non-Goals

This design does not cover:

- Redesigning section layout below the hero.
- Rewriting the whole landing page copy.
- Adding glitch effects, fast ticker walls, meme-heavy animation, or profit-hype visuals.
- Installing new animation libraries unless implementation discovers a clear need.
- Changing dashboard application behavior.
- Changing authentication, routing, database, or user logic.

## Audience And Tone

The animation must support DCMS positioning:

- Free crypto community.
- Risk-aware and honest about market difficulty.
- Useful for learners and active traders.
- Direct, premium, technical, and slightly brutal-honest.

Avoid any motion or copy that implies easy profit, guaranteed PnL, or trading certainty.

## Approved Copy Behavior

### Typewriter Headline

Base headline:

```txt
CRYPTO ITU <ROTATING_WORD>.
BELAJAR JANGAN SENDIRIAN.
```

Approved rotating words:

```txt
KERAS
ANOMALI
BERISIKO
LIAR
```

Rules:

- Keep `CRYPTO ITU` stable.
- Animate only the rotating final word.
- Preserve a visible caret during typing/deleting.
- Keep a stable word container width so the headline does not jump.
- Include a period visually after the rotating word.
- Use uppercase words to match existing hero language.
- If motion is reduced, show `KERAS` statically.

Rationale:

- `KERAS` anchors the existing approved hero.
- `ANOMALI`, `BERISIKO`, and `LIAR` reinforce market reality.
- The rotation adds life without shifting into profit promises.

## Motion System

### 1. Hero Market Scanline

Add a subtle scanline that passes vertically through the hero grid.

Behavior:

- Runs slowly, around every 4-6 seconds.
- Uses lime tint at low opacity.
- Does not obscure headline or CTA text.
- Should feel like a terminal scanning the market, not a warning alarm.

Implementation preference:

- CSS keyframes on a pseudo-element or dedicated decorative div.

### 2. Hero Grid Drift

The existing lime grid can move or breathe very subtly.

Behavior:

- Very slow background-position drift or opacity breathe.
- No fast parallax.
- Must not distract from headline readability.

### 3. Dashboard Preview Float

Animate the dashboard preview with slow vertical float.

Behavior:

- TranslateY range around 6-10px on desktop.
- Smaller range on mobile, around 4-6px.
- Keep existing perspective/rotateX transform.
- Must not alter layout dimensions or overlap CTA.

### 4. Signal Pulse

Animate signal-like dashboard details:

- `BIAS LONG` badge gets a soft pulse.
- Signal progress zone gets lime glow.
- Progress knob gets a soft expanding halo.
- Timeframe chip may breathe subtly.

Behavior:

- Pulse is slow and low-intensity.
- Avoid flashing.
- Keep contrast readable.

### 5. PnL Card Drift

Animate decorative PnL cards with gentle drift.

Behavior:

- Left and right cards drift independently.
- Range around 8-10px vertical.
- Slight rotation change is acceptable.
- Keep cards low-opacity so they stay supporting visuals.
- Preserve visible disclaimer: `Member result, not guarantee`.

Mobile:

- PnL cards may remain hidden as currently implemented.

### 6. CTA And Glass Micro-Interactions

Animate interactive elements lightly:

- Primary CTA has soft glow/lift.
- Secondary CTA glass opacity/border breathes.
- Navbar glass islands lift/tighten on hover.
- Existing account/menu interactions should feel smoother if touched.

Rules:

- Hover/focus transitions should be quick, around 150-220ms.
- Ambient CTA animation should be slow enough to avoid feeling urgent.
- Focus states must remain visible.

## Accessibility And Performance

### Reduced Motion

Respect `prefers-reduced-motion: reduce`.

Reduced-motion behavior:

- Disable scanline, grid drift, dashboard float, PnL drift, glow loops, and typewriter rotation.
- Show headline as `CRYPTO ITU KERAS.`.
- Keep normal hover/focus feedback if it does not move content.

### Performance

Animation should use compositor-friendly properties:

- Prefer `transform`, `opacity`, `filter` only where cheap.
- Avoid animating layout properties like `top`, `left`, `width`, `height`, or expensive box-shadow changes at high frequency.
- Keep JS limited to typewriter text timing.
- Avoid scroll listeners for this phase.

### Layout Stability

Requirements:

- Typewriter word container must reserve enough width for `BERISIKO`.
- Headline must not shift as words rotate.
- Dashboard preview must not change hero min-height.
- Text and CTAs must not overlap on mobile or desktop.

## Component Scope

Expected files:

- `components/landing/LandingHero.tsx`
- `components/landing/HeroDashboardPreview.tsx`
- `components/landing/HeroPnlCards.tsx`
- `components/landing/HeroNavbar.tsx`
- `app/globals.css`

Potential new helper:

- Inline `RotatingTypewriter` component inside `LandingHero.tsx`, or
- Small local component under `components/landing/RotatingTypewriter.tsx`.

Decision guideline:

- Use inline helper if only the hero needs it.
- Extract only if it keeps `LandingHero.tsx` readable.

## Implementation Notes

### Typewriter Logic

The typewriter can use client-side React state:

- Words: `["KERAS", "ANOMALI", "BERISIKO", "LIAR"]`
- Type speed: roughly 70-90ms per character.
- Delete speed: roughly 45-60ms per character.
- Hold after full word: roughly 1000-1300ms.
- Pause after deletion: roughly 200-300ms.

Cleanup:

- Clear timers on unmount.
- Detect reduced-motion preference before starting the loop.

### CSS Naming

Use clear, DCMS-specific animation class names to avoid collisions, for example:

- `dcms-hero-scanline`
- `dcms-grid-drift`
- `dcms-dashboard-float`
- `dcms-pnl-drift-left`
- `dcms-pnl-drift-right`
- `dcms-signal-pulse`
- `dcms-cta-pulse`

## States

### Guest State

Guest hero keeps existing conversion path:

- Kicker may include live/risk language.
- Primary CTA: `Join Discord`.
- Secondary CTA: `Lihat isi komunitas`.
- Typewriter headline active.

### Logged-In State

Logged-in hero keeps dashboard-first copy:

- Primary CTA: `Buka Dashboard`.
- Secondary CTA: `Lihat komunitas`.
- Typewriter can remain active, unless implementation finds the logged-in headline reads better with static `KERAS`.

Preferred default:

- Keep typewriter active in both states for consistency.

## Testing And Verification

Required checks:

- Run lint/build command used by the project.
- Verify desktop hero at a wide viewport.
- Verify mobile hero around 390px width.
- Verify typewriter does not cause layout shift.
- Verify PnL cards remain hidden or safe on mobile.
- Verify `prefers-reduced-motion` disables looping animation.
- Verify CTA links and account dropdown still work.

Manual visual checks:

- Headline remains readable while scanline runs.
- CTA remains clearly clickable.
- Dashboard preview stays below hero copy and does not dominate.
- Motion feels alive but not hectic.

## Acceptance Criteria

The feature is complete when:

- Hero shows Signal Pulse motion on normal motion settings.
- Headline rotates `KERAS`, `ANOMALI`, `BERISIKO`, and `LIAR` with typewriter animation.
- Reduced-motion users see a stable, non-looping hero.
- Desktop and mobile layouts remain stable.
- No below-the-fold redesign occurs.
- No new profit-promise language is introduced.
- Build/lint verification passes or known unrelated failures are documented.
