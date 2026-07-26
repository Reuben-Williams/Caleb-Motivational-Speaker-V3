# Site-wide Smooth Scrolling Implementation Plan

**Spec:** `docs/superpowers/specs/2026-07-26-site-wide-smooth-scrolling-design.md`

## Target flow

The flow under test is: a non-reduced-motion visitor opens any public route ->
Lenis initializes once for the resolved desktop, tablet, or mobile mode ->
wheel, touch, and same-page anchor navigation ease smoothly -> fixed-header and
nested mobile-menu behavior remain correct -> route, breakpoint, and preference
changes replace or remove the runtime without leaks. A reduced-motion visitor
never initializes Lenis or GSAP and keeps immediate native scrolling.

## Task 1: Define the runtime policy

**Files**

- Modify: `src/lib/motion-capabilities.test.ts`
- Modify: `src/lib/motion-capabilities.ts`

**Red**

Add assertions for a pure runtime policy covering all four modes:

- `reduced`: no Lenis, synchronized touch, or enhanced effects;
- `mobile`: Lenis plus synchronized touch, without enhanced effects;
- `tablet`: Lenis plus synchronized touch, without enhanced effects;
- `enhanced`: Lenis plus enhanced effects, without synchronized touch.

Run:

`npm test -- src/lib/motion-capabilities.test.ts`

Confirm the failure is the missing policy API.

**Green**

Add the smallest typed policy function. Keep `resolveMotionMode` unchanged and
free of DOM or React dependencies.

## Task 2: Specify the Lenis lifecycle

**Files**

- Add: `src/components/motion-runtime.test.tsx`
- Modify: `src/components/motion-runtime.tsx`

**Red**

Mock the existing dynamic Lenis, GSAP, ScrollTrigger, and pathname dependencies.
Control `matchMedia` values and the root `--header-height`, then require:

- one Lenis instance in mobile, tablet, and enhanced modes;
- no Lenis or GSAP instance in reduced mode;
- exact Lenis options: `autoRaf: true`, `smoothWheel: true`, `lerp: 0.075`,
  touch-mode `syncTouch: true` and `syncTouchLerp: 0.075`, enhanced-mode
  `syncTouch: false`, and `anchors: true`;
- mobile/tablet never register the enhanced GSAP effects;
- enhanced mode registers the existing effects and synchronizes
  ScrollTrigger from Lenis scroll events;
- unmount, pathname changes, and motion-mode changes destroy the previous
  instance and detach listeners;
- the independent `900px` header breakpoint does not recreate Lenis because
  Lenis reads the responsive root scroll padding at anchor time;
- live reduced-motion changes leave the native fallback;
- stale imports cannot create another instance;
- Lenis failure skips GSAP without disabling native scroll;
- GSAP failure leaves Lenis active.

Run:

`npm test -- src/components/motion-runtime.test.tsx`

If the missing test module prevents the intended red assertion, add only the
minimal test harness necessary to observe the first missing behavior.

**Green**

Split Lenis setup from the enhanced GSAP setup inside the existing
`MotionRuntime` effect:

- dynamically load Lenis for every non-reduced mode;
- use `autoRaf` instead of the GSAP ticker;
- keep generation/disposal guards around both import stages;
- destroy Lenis and GSAP independently;
- keep native scrolling when either optional module stage fails.

Do not change the current desktop effect definitions.

## Task 3: Integrate Lenis styles and nested scrolling

**Files**

- Modify: `src/app/theme-contract.test.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/site-shell.test.tsx`
- Modify: `src/components/site-header.tsx`

**Red**

Assert:

- the root layout imports `lenis/dist/lenis.css` before project globals;
- `html.lenis` uses `scroll-behavior: auto`;
- native `html` retains smooth scrolling as the module/no-JavaScript fallback;
- the reduced-motion media query retains immediate scrolling;
- the mobile navigation has `data-lenis-prevent`.

Run:

`npm test -- src/app/theme-contract.test.ts src/components/site-shell.test.tsx`

Confirm failures identify the missing Lenis integration contract.

**Green**

Import the official Lenis stylesheet once, add only the local double-easing
override, and mark the existing mobile navigation as a protected nested scroll
region. Add `overscroll-behavior: contain` only if browser verification proves
the existing menu locking does not prevent scroll chaining.

## Task 4: Preserve skip-link focus

**Files**

- Add: `src/app/layout-accessibility.test.tsx`
- Modify: `src/app/layout.tsx`

**Red**

Require the root `<main id="main-content">` landmark to expose
`tabIndex={-1}` while remaining absent from normal sequential tab order.

Run:

`npm test -- src/app/layout-accessibility.test.tsx`

Confirm the failure is the missing focusable fragment target.

**Green**

Add only `tabIndex={-1}` to the existing main landmark. Do not add custom click,
hash, or focus handlers because Lenis 1.3.25 and the browser already preserve
the native anchor action.

## Task 5: Automated verification

After each red/green cycle, run the focused tests again. Then run:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run build:pages`

Inspect `git diff --check`. Confirm the Pages output contains the Lenis runtime
and repository-prefixed assets while preserving all static routes.

If Windows locks `src/app/api` during `build:pages`, resolve and stop only the
exact V3 dev-server processes, build the static export, and restart the local
preview.

## Task 6: Browser verification

Use the in-app Browser plugin first. If it repeats the established kernel-assets
path error, record the exact failure and use installed Microsoft Edge through
the project's `playwright-core` dependency.

Verify:

- desktop `1440 x 1000`: enhanced mode, Lenis active, wheel movement spans
  multiple frames, speaker-reel anchor eases to the 84px header offset, and
  GSAP effects remain active;
- mobile `390 x 844`: mobile mode, Lenis active, speaker-reel anchor eases to
  the 72px header offset, mobile navigation scrolls without moving the
  underlying page, and no horizontal overflow appears;
- tablet widths on both sides of `900px`: Lenis stays active, GSAP stays absent,
  the anchor offset changes from 72px to 84px, and no motion-mode
  reconfiguration occurs;
- reduced-motion emulation: no Lenis class, computed `scroll-behavior: auto`,
  and immediate anchor movement;
- same-page hashes, the skip link, a direct initial hash, a cross-route hash,
  a missing target, normal navigation, and back/forward restoration;
- pathname, reduced-motion, and breakpoint changes leave exactly one active
  runtime with no stuck scrolling;
- no relevant console errors, page errors, failed same-origin requests,
  framework overlay, or horizontal overflow.

Save any screenshots or diagnostic traces outside the repository.

## Task 7: Commit and handoff

Commit the implementation without adding the existing untracked PDF artifact.
Do not push or deploy because the approved specification explicitly keeps
publication as a separately authorized action.

Report:

- implementation commit;
- files and behavior changed;
- focused and complete test counts;
- build and static-export results;
- desktop, tablet, mobile, reduced-motion, anchor, route, and cleanup evidence;
- the physical-device touch-inertia verification limitation.
