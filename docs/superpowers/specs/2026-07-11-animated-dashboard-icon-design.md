# Animated Dashboard Icon Design

Date: 2026-07-11
Status: Approved for implementation planning

## Goal

Replace the static House icon used by the Dashboard sidebar item with the supplied Bodymovin/Lottie animation at `public/icons-dashboard.json`. The animation must preserve the current sidebar layout and run only while the desktop Dashboard navigation item is hovered.

## Scope

- Apply the animated JSON only to the Dashboard navigation item.
- Preserve all existing sidebar dimensions, colors, active-route styling, labels, links, collapse behavior, and mobile navigation behavior.
- Keep the other navigation icons unchanged.
- Use `lottie-web` directly rather than a React wrapper.

## Component Design

Add a small client-side `AnimatedDashboardIcon` component with these responsibilities:

- Own the DOM container used by Lottie.
- Dynamically initialize one `lottie-web` animation instance from `/icons-dashboard.json`.
- Render at the same visual size and flex behavior as the current House icon.
- Accept a `playing` boolean from the parent navigation item.
- Play and loop while `playing` is true.
- Stop and return to frame zero when `playing` becomes false.
- Destroy its Lottie instance when unmounted.
- Respect `prefers-reduced-motion` by remaining on frame zero.
- Show the existing Phosphor House icon as a fallback if the Lottie runtime or animation data cannot load.

## Interaction Design

The entire desktop Dashboard navigation link is the hover target. Entering the link starts the loop; leaving it stops the animation and resets it to the initial frame. This behavior applies in both expanded and collapsed desktop sidebar states.

The mobile Dashboard icon remains static because touch navigation has no persistent hover. The animation also remains static for users who request reduced motion.

Keyboard focus does not start the loop because the approved trigger is desktop pointer hover. The link itself retains its existing keyboard focus and navigation behavior.

## Data and State Flow

`NavItem` owns the transient hover state for the Dashboard item. It passes that state to `AnimatedDashboardIcon`; other items continue rendering their existing Phosphor icon directly. The animation component translates changes in `playing` into Lottie `play()` and `goToAndStop(0, true)` calls.

The animation JSON remains a public static asset and is referenced by URL, so it is not copied into the JavaScript bundle.

## Failure Handling

If importing `lottie-web`, initializing the animation, or loading the JSON fails, the component switches to the existing House icon. A failure must not block sidebar rendering or navigation.

## Verification

- Run the project lint check for changed files or the available project lint command.
- Run a production build when the existing workspace state permits it.
- Verify the Dashboard icon loops only during desktop hover.
- Verify pointer leave stops and resets the icon.
- Verify expanded and collapsed desktop sidebar layouts do not shift.
- Verify the mobile icon and reduced-motion experience remain static.
- Verify active-route styling, navigation, labels, and all non-Dashboard icons remain unchanged.

## Out of Scope

- Animating Market Analysis, Ebook DCMS, Bots, or logout icons.
- Changing the sidebar visual design.
- Adding click, active-route, or keyboard-focus animation triggers.
- Editing the supplied animation JSON.
