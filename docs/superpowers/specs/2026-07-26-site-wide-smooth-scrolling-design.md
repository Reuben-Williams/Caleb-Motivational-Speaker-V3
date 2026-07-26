# Site-wide Smooth Scrolling Design

## Status

Approved by the user on 2026-07-26.

## Summary

Extend the existing Lenis momentum-scrolling experience from wide,
fine-pointer desktops to every desktop, tablet, and mobile visitor who has not
requested reduced motion. Keep the existing desktop-only GSAP parallax and
scroll-linked effects restricted to enhanced desktop mode.

The result is one smooth scrolling system across the public site without
forcing the heavier desktop animation stack onto touch devices.

## Existing Behavior

The site currently has three related behaviors:

- `html` uses native `scroll-behavior: smooth` and a fixed-header
  `scroll-padding-top`.
- `MotionRuntime` resolves the visitor into `reduced`, `mobile`, `tablet`, or
  `enhanced` mode.
- Lenis and the GSAP scroll effects are loaded together only when the resolved
  mode is `enhanced`.

As a result, wide fine-pointer desktops receive momentum scrolling while
tablet, mobile, and coarse-pointer devices receive native browser scrolling.

## Goals

- Run Lenis on desktop, tablet, mobile, and coarse-pointer devices.
- Preserve immediate native scrolling when
  `prefers-reduced-motion: reduce` is active.
- Smooth wheel input on devices that provide wheel events.
- Synchronize touch scrolling with Lenis inertia on tablet and mobile modes.
- Keep in-page anchor targets visible below the fixed site header.
- Preserve native scrolling inside the expanded mobile navigation.
- Keep the existing GSAP parallax and scroll-linked effects desktop-only.
- Reconfigure and clean up the runtime when the route or motion capability
  changes.
- Honor the responsive fixed-header offset at anchor time without recreating
  the runtime when only the `900px` navigation breakpoint changes.
- Preserve compatibility with the normal Next.js build and GitHub Pages static
  export.

## Non-goals

- Add scroll snapping, horizontal scrolling, section locking, or automatic
  section advancement.
- Add a visitor-facing scrolling preference separate from the operating-system
  reduced-motion setting.
- Enable desktop parallax, image scaling, reveal clipping, or cable scrubbing on
  mobile and tablet devices.
- Animate cross-route navigation from the previous page position to the top of
  the next page.
- Change page layout, content, color schemes, typography, or conversion paths.
- Replace Lenis or add another scrolling dependency.
- Guarantee synchronized-touch behavior on legacy iOS versions older than the
  support level documented by Lenis.
- Push, deploy, or change the public GitHub Pages environment. Deployment
  remains a separately authorized operation; this feature is accepted against
  the local production and static-export builds.

## Approaches Considered

### 1. Enable the complete enhanced runtime on every device

This would reuse the existing branch with minimal structural change, but it
would also load GSAP and run desktop parallax effects on touch devices. The
additional work and motion could harm mobile performance and accessibility.

### 2. Keep native scrolling on touch devices

This is the current behavior. It is lightweight and accessible, but it does not
provide the approved consistent momentum experience throughout the site.

### 3. Split smooth scrolling from enhanced effects

This is the selected approach. Lenis becomes the common non-reduced scrolling
engine, while GSAP remains an optional enhancement used only by the existing
`enhanced` mode.

## Architecture

The implementation has three bounded units.

### 1. Motion runtime policy

A small pure policy in `src/lib/motion-capabilities.ts` maps a resolved
`MotionMode` to the runtime features it is allowed to use:

| Mode | Lenis | Synchronized touch | GSAP effects |
| --- | --- | --- | --- |
| `reduced` | No | No | No |
| `mobile` | Yes | Yes | No |
| `tablet` | Yes | Yes | No |
| `enhanced` | Yes | No | Yes |

The policy contains no browser or React dependency and is independently
testable. `resolveMotionMode` remains the single source of truth for mode
precedence.

### 2. Lenis scrolling runtime

`src/components/motion-runtime.tsx` owns the Lenis lifecycle.

For every mode except `reduced`, it dynamically imports Lenis and creates one
instance with:

- `autoRaf: true` so Lenis owns its animation-frame loop on every device.
- `smoothWheel: true` for wheel and trackpad input.
- `syncTouch: true` only in `mobile` and `tablet` modes.
- `syncTouch: false` in `enhanced` mode.
- `lerp: 0.075` in every enabled mode.
- `syncTouchLerp: 0.075` in mobile and tablet modes.
- `anchors: true` so Lenis handles same-page links and reads the root
  `scroll-padding-top`.

Lenis 1.3.25 reads the root element's computed `scroll-padding-top` each time it
resolves an element target. The existing CSS variable resolves to `84px` on
desktop and `72px` at the mobile navigation breakpoint. No numeric Lenis
`offset` is supplied: combining one with `scroll-padding-top` would double the
visible gap. Crossing `900px` therefore updates the next anchor target without
recreating a still-valid `tablet` runtime.

The runtime destroys the active Lenis instance before replacing it, on
component unmount, when a media query changes the mode, and when the pathname
changes. Stale dynamic imports must not create a second active instance after a
new configuration generation has started.

If the Lenis module cannot load, the site remains usable through the existing
native CSS scrolling behavior. The failure must not leave a partial instance
or disable document scrolling. Enhanced GSAP effects are skipped for that
generation because their Lenis synchronization source is unavailable.

### 3. Optional enhanced effects

Only `enhanced` mode dynamically imports GSAP and ScrollTrigger. The current
desktop parallax, story-image scale, audience-heading reveal, reel clipping,
and booking-process cable effects remain unchanged.

The GSAP context subscribes to Lenis scroll updates so ScrollTrigger stays in
sync. Lenis no longer depends on the GSAP ticker because `autoRaf` owns the
scroll loop.

GSAP setup and teardown remain independent from Lenis setup and teardown. A
failure or cancellation while loading the enhanced modules must not destroy a
valid Lenis instance for the current generation. If GSAP or ScrollTrigger fails
to load, Lenis remains active and the desktop-only effects are skipped for that
generation.

## CSS and Nested Scrolling

The root layout imports `lenis/dist/lenis.css` once before the project global
styles. The project stylesheet adds only the local rules needed to integrate
Lenis:

- Active Lenis documents use `scroll-behavior: auto` to avoid double easing.
- The existing reduced-motion media query continues to force immediate
  scrolling.
- The existing native `scroll-behavior: smooth` remains the no-JavaScript and
  module-load fallback.

The expanded mobile navigation is a nested scroll region. Its `<nav>` element
receives `data-lenis-prevent` so swipes inside a long menu scroll the menu
instead of the page. The attribute does not alter desktop navigation.

## Anchor Behavior

Lenis handles same-page links such as:

- `Skip to content`
- `Scroll to enter`
- `Watch the Speaker Reel`

The target stops below the fixed header using the runtime header offset. The
Lenis 1.3.25's built-in anchor listener does not cancel the link's default
action. The browser therefore remains responsible for updating the URL hash
and applying native fragment focus behavior while Lenis supplies the animated
scroll position. A missing target keeps normal browser hash behavior and must
not throw.

The skip-link target remains the semantic `<main id="main-content">` and gains
`tabIndex={-1}` so native fragment navigation transfers programmatic focus to
the main landmark. Browser verification must confirm that activating the skip
link updates the hash, places the main content at the header-adjusted position,
and focuses `#main-content` without adding it to normal sequential tab order or
trapping keyboard focus.

Initial-load and cross-route hashes are not animated from the top of the
destination page. The browser and Next.js perform their normal fragment
navigation using the existing CSS `scroll-padding-top`; Lenis initializes from
the resulting real `window.scrollY` and does not replay the journey.

When reduced motion is active, Lenis is absent and the existing native anchor
behavior uses `scroll-padding-top` with `scroll-behavior: auto`.

## Route and History Behavior

Normal Next.js route navigation keeps the framework's default immediate
destination-page top behavior. `MotionRuntime` does not call `scrollTo(0, 0)`
and never animates from the previous page's scroll position.

On a pathname change, the old Lenis instance is destroyed before the new one is
created. The replacement initializes from the browser's actual current scroll
position after the route commit:

- Normal forward navigation starts from the framework-selected top position.
- Back and forward navigation retains browser/Next.js scroll restoration.
- Cross-route and initial-load fragments retain the browser-selected target
  position.

No scroll position is copied from the destroyed instance. Hash-only changes on
the same pathname are handled by the active Lenis anchor integration and do not
recreate the runtime.

## Accessibility

- `prefers-reduced-motion: reduce` always has first priority and prevents Lenis
  and GSAP initialization.
- Skip-link focus and target semantics remain native; the feature changes only
  scroll movement.
- Keyboard scrolling remains available.
- Form fields, video controls, and the mobile navigation retain native
  interaction.
- No scroll hijacking, mandatory snapping, locked sections, or hidden
  scrollbars are introduced.

## Error Handling and Lifecycle

- Dynamic imports are guarded by the existing disposed and generation checks.
- Lenis is destroyed exactly once for each active configuration.
- Scroll listeners are removed before their owning instance is destroyed.
- GSAP contexts and ScrollTrigger integration are reverted independently.
- Media-query listeners are removed on component unmount.
- The native CSS fallback remains active until Lenis has initialized.
- A Lenis import or initialization failure leaves native scrolling active and
  skips GSAP for that generation.
- A GSAP or ScrollTrigger import failure leaves the active Lenis instance
  running.

## Testing

### Automated tests

Tests must be written before implementation and must demonstrate the missing
behavior before production code changes.

1. Extend the motion-capability tests to assert the runtime policy for all four
   modes.
2. Add `MotionRuntime` tests with mocked dynamic modules and controlled media
   queries:
   - mobile initializes Lenis with synchronized touch and no GSAP effects;
   - tablet initializes Lenis with synchronized touch and no GSAP effects;
   - enhanced initializes Lenis and the existing GSAP effects;
   - reduced motion initializes neither runtime;
   - `anchors: true` delegates the responsive offset to computed
     `scroll-padding-top`;
   - exact options include `autoRaf: true`, `smoothWheel: true`,
     `lerp: 0.075`, touch-mode `syncTouch: true` and
     `syncTouchLerp: 0.075`, and enhanced-mode `syncTouch: false`;
   - unmount and mode changes destroy the previous Lenis instance;
   - pathname changes destroy the old instance without forcing a scroll
     position;
   - live reduced-motion changes replace Lenis with the native fallback;
   - crossing `900px` does not recreate the runtime and the next anchor uses
     the updated computed scroll padding;
   - scroll listeners are detached before Lenis destruction;
   - a stale dynamic import cannot create an additional instance;
   - Lenis import or construction failure falls back to native scrolling and
     skips GSAP;
   - GSAP import failure leaves Lenis active.
3. Extend the site-header test to require `data-lenis-prevent` on the mobile
   navigation.
4. Add a stylesheet/layout contract assertion for the Lenis base import, active
   Lenis scroll-behavior override, and reduced-motion fallback.
5. Add browser-level anchor assertions for hash updates, skip-link focus
   behavior, initial-load hashes, cross-route hashes, and missing targets.

### Build verification

Run:

- the focused motion and header tests;
- lint;
- TypeScript checking;
- the complete test suite;
- the normal Next.js production build;
- the GitHub Pages static export.

### Browser verification

Use the local site in installed Edge if the in-app browser controller is
unavailable.

- Desktop viewport: confirm Lenis is active, wheel input eases over multiple
  frames, the speaker-reel anchor lands below the fixed header, and the existing
  GSAP effects remain active.
- Mobile viewport: confirm Lenis is active in `mobile` mode, the speaker-reel
  anchor eases to the correctly offset target, the mobile menu remains
  independently scrollable, and no horizontal overflow appears.
- Tablet or coarse-pointer emulation: confirm Lenis is active without the
  desktop GSAP effects and anchors use 72px below `900px` and 84px above it
  without a mode reconfiguration.
- Reduced-motion emulation: confirm Lenis is absent, computed
  `scroll-behavior` is `auto`, and anchor navigation is immediate.
- Route/history loop: navigate normally, use back and forward restoration, load
  a direct hash URL, and follow a cross-route hash without retaining the prior
  page's scroll state.
- On each viewport, confirm there are no console errors, page errors, failed
  same-origin requests, or stuck scrolling states.

Physical iOS and Android validation is recommended because desktop emulation
cannot reproduce native touch inertia perfectly, but it is not required for
this local implementation acceptance gate.

## Acceptance Criteria

- Every non-reduced motion mode initializes exactly one Lenis instance.
- Mobile and tablet modes enable synchronized touch scrolling.
- Enhanced mode preserves the existing GSAP effects without loading them in
  mobile or tablet mode.
- Reduced-motion mode initializes neither Lenis nor GSAP.
- In-page anchors land below the current fixed-header height.
- Crossing the `900px` header breakpoint updates the next anchor offset through
  computed scroll padding without recreating Lenis.
- The expanded mobile navigation scrolls independently.
- Route, breakpoint, preference, and unmount transitions clean up their prior
  runtime.
- Normal navigation, browser restoration, initial hashes, cross-route hashes,
  same-page hashes, skip-link focus, and missing hash targets follow the route
  and anchor contracts above.
- Lenis failure preserves native scrolling and skips GSAP; GSAP failure
  preserves Lenis.
- Automated tests, lint, typecheck, both builds, and browser verification pass.
