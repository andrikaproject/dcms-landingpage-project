# DCMS Landing Hero Phase Plan

PRD: `docs/superpowers/specs/2026-06-28-dcms-landing-hero-prd.md`

## Objective

Implement only the landing page hero redesign. Keep the rest of the landing page unchanged unless a tiny compatibility adjustment is required.

Target result:

- Guest hero: community-first, `Join Discord` primary, `Login` + `Daftar Member` in navbar.
- Logged-in hero: dashboard-first, user pill + `Dashboard` in navbar.
- Hero visual: centered Nebulica headline, liquid-glass nav, manual dashboard preview, manual PnL cards, risk disclaimer.

## Phase 0: Baseline Audit

Read current landing structure before editing:

- `app/page.tsx`
- `components/LandingPageClient.tsx`
- `components/HeroPattern.tsx`
- Existing auth/session shape used by `LandingPageClient`
- Existing `MemberStatus` and `GuestActions`
- Existing links for Discord, `/login`, `/register`, and `/dashboard`

Confirm:

- Where `user` is passed into landing.
- Whether `uuidBitunix`, `role`, `name`, and `email` are already available.
- Current hero card height and mobile behavior.
- Existing font classes or font-family usage for Nebulica and Chakra Petch.

Deliverable:

- No code change.
- Short implementation note: exact files to touch.

## Phase 1: Extract Hero Subcomponents

Refactor hero-only code from `components/LandingPageClient.tsx` into small internal components or a new hero file.

Recommended structure:

- `components/landing/LandingHero.tsx`
- `components/landing/HeroNavbar.tsx`
- `components/landing/HeroDashboardPreview.tsx`
- `components/landing/HeroPnlCards.tsx`

If project style prefers fewer files, keep them inside `LandingPageClient.tsx`, but still separate with clear component boundaries.

Component responsibilities:

- `LandingHero`: layout, copy, background, CTA decisions.
- `HeroNavbar`: guest/logged-in nav state.
- `HeroDashboardPreview`: manual dashboard visual.
- `HeroPnlCards`: manual PnL cards + disclaimer.

Guardrail:

- Do not redesign `SectionThree`, `SectionFour`, `FeedbackSection`, or footer.
- Do not change dashboard app behavior.

## Phase 2: Hero Navbar

Implement split liquid-glass navbar.

Guest state:

- Left island: logo + `DCMS`.
- Center island: `Community`, `Dashboard`, `Stories`, `FAQ`.
- Right island:
  - `Login` routes to `/login`.
  - `Daftar Member` routes to `/register`.

Logged-in state:

- Left and center islands stay same.
- Right island:
  - Avatar initial.
  - Display name from `user.name || user.email || "Member"`.
  - Detail from `user.uuidBitunix ? "UID ..." : user.role || "Member"`.
  - Dropdown caret.
  - Lime `Dashboard` button routing to `/dashboard`.

Behavior:

- Preserve existing account dropdown/logout behavior if already used.
- If dropdown complexity slows implementation, keep current `MemberStatus` logic but restyle it to match the glass island.

Mobile:

- Collapse nav links if width is tight.
- Keep logo and main CTA visible.
- Logged-in mobile should still expose dashboard access.

## Phase 3: Guest Hero Copy and CTA

Replace current guest hero content with PRD copy.

Kicker:

```txt
FREE RISK-AWARE CRYPTO COMMUNITY
```

Headline:

```txt
CRYPTO ITU KERAS.
BELAJAR JANGAN SENDIRIAN.
```

Supporting copy:

```txt
Pantau market, baca sinyal, dan cek risk dari dashboard DCMS. Free, aktif, dan tanpa janji profit instan.
```

CTA:

- Primary: `Join Discord`, opens Discord invite in new tab.
- Secondary: `Lihat isi komunitas`, smooth scroll to `#community-section`.
- Helper: `Mau akses dashboard? Daftar Member ada di kanan atas.`

Visual:

- First line bright white with `KERAS.` lime.
- Second line dim/ghost white.
- CTA group centered below copy.

## Phase 4: Logged-In Hero Copy and CTA

Add logged-in copy branch.

Kicker:

```txt
MEMBER ACCESS ACTIVE
```

Headline:

```txt
CRYPTO ITU KERAS.
CEK DASHBOARD DULU.
```

Supporting copy:

```txt
Akun kamu sudah aktif. Langsung masuk dashboard untuk pantau market, signal board, dan reminder risk.
```

CTA:

- Primary: `Buka Dashboard`, route to `/dashboard`.
- Secondary: `Lihat komunitas`, smooth scroll to `#community-section`.

Guardrail:

- Keep layout identical to guest state so visual does not jump between auth states.

## Phase 5: Background and Liquid Glass Styling

Implement CSS-first liquid glass.

Create reusable class names or Tailwind utility composition for:

- Glass island.
- Glass CTA.
- Glass PnL card.
- Small glass disclaimer pill.

Hero background:

- Near-black base.
- Subtle lime radial glow from lower center.
- Optional faint cyan glow.
- Low-opacity grid pattern.
- Dashed rectangular frame around hero core.
- Bottom fade over dashboard preview.

Do not install `@ogtirth/liquid-glass-oss` in this phase.

## Phase 6: Manual Dashboard Preview

Build dashboard visual with HTML/CSS primitives.

Must resemble existing `app/dashboard/`:

- Near-black sidebar.
- Dark gradient main surface.
- `Dashboard` title.
- BTC/ETH cards.
- `15M` chip.
- `BIAS LONG` signal card.
- Price/risk progress bar.
- Lime and slate accents.

Desktop target:

- Centered under CTAs.
- Width around `850px`.
- Height around `300px`.
- `bottom: -92px`.
- `opacity: 0.66`.
- Slight perspective tilt.
- Bottom fade masks lower part.

Responsive:

- Tablet: scale width down, keep visible.
- Mobile: simplify or hide some inner details if cramped.
- Avoid text overlap with headline/CTA.

## Phase 7: Manual PnL Cards

Add two decorative PnL cards around hero text.

Card 1:

- `SOLUSDT`
- `LONG`
- `+182%`
- `member result`

Card 2:

- `BTCUSDT`
- `SWING`
- `+47.8%`

Disclaimer:

```txt
Member result, not guarantee
```

Rules:

- Cards are manual HTML/CSS.
- No image assets.
- Opacity low enough that headline remains dominant.
- Hide cards on mobile if they crowd the layout.

## Phase 8: Responsive Pass

Check three viewport groups:

- Desktop: `1440x900` or similar.
- Tablet: `768x1024`.
- Mobile: `390x844`.

Fix:

- Hero text wrapping.
- Navbar overflow.
- CTA button fit.
- Dashboard preview overlap.
- PnL card clutter.
- Bottom fold composition.

No viewport-width font scaling. Use breakpoints, max-widths, and safe line-height.

## Phase 9: Accessibility and State QA

Validate:

- Links have clear accessible names.
- Focus states visible.
- Keyboard tab order is sensible.
- Contrast readable on glass.
- Guest routes correct.
- Logged-in routes correct.
- User dropdown remains usable if included.
- Reduced motion is respected if animations are added.

Manual checks:

- Guest visitor sees `Join Discord` primary.
- Logged-in visitor sees `Buka Dashboard` primary.
- Logged-in navbar does not show `Login` or `Daftar Member`.
- Guest navbar does not show user pill.

## Phase 10: Verification

Run project checks:

```sh
npm run lint
```

If available and fast:

```sh
npm run build
```

Run local dev server:

```sh
npm run dev
```

Use browser/Playwright screenshot checks for:

- Desktop guest.
- Mobile guest.
- Logged-in state if local auth/session can be simulated.

If logged-in state cannot be tested through real auth quickly, temporarily inspect component state path or use existing authenticated local account.

## Suggested Commit Plan

Use small commits:

1. `refactor(landing): extract hero components`
2. `feat(landing): add glass hero navbar states`
3. `feat(landing): add dashboard hero preview`
4. `feat(landing): add hero pnl accents`
5. `fix(landing): polish hero responsive states`

If implementation stays compact, one commit is acceptable:

```txt
feat(landing): redesign hero section
```

## Risks

- Current `LandingPageClient.tsx` may already be large, so careful extraction matters.
- Logged-in dropdown may conflict with new glass island layout.
- Dashboard preview can overpower headline if opacity/position drifts.
- Mobile hero can get cluttered if PnL cards stay visible.
- `.superpowers/` visual files are untracked and should not be committed.

## Out of Scope

- Full landing page redesign.
- Feedback/story section redesign.
- FAQ/footer changes.
- Dashboard app redesign.
- Installing `@ogtirth/liquid-glass-oss`.
- Replacing dashboard preview with screenshot assets.
