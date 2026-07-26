# Original Color Scheme Toggle Design

## Status

Approved by the user on 2026-07-25.

## Summary

Add an accessible color-scheme switch to every page of the Caleb Jakes V3
website. The current cinematic black-and-gold presentation remains the default.
Visitors can switch to a palette derived from Caleb's original website, switch
back at any time, and have their choice remembered in the same browser.

The alternate scheme changes color only. It preserves V3's layout, typography,
photography, animation, content, navigation, and conversion paths.

## Source Palette

The alternate palette is based on the computed styles and rendered appearance of
<https://www.calebjakesspeaks.com/> inspected on 2026-07-25:

| Role | Value | Use |
| --- | --- | --- |
| Original navy | `#02017D` | Page background, header, deep panels, image overlays |
| Original yellow | `#F1DD18` | Accents, emphasized text, active states, primary calls to action |
| White | `#FFFFFF` | Primary text on navy and dark imagery |
| Slate | `#1F2937` | Light-surface text and secondary neutral treatment |

Where translucent colors are needed, they must be derived from these palette
values rather than introducing unrelated hues.

## Goals

- Make the color-scheme switch available from every route.
- Preserve the existing cinematic scheme as the first-visit default.
- Apply the original palette consistently to major backgrounds, panels, borders,
  navigation, overlays, typography, focus treatments, and calls to action.
- Remember the visitor's selection without accounts, cookies, analytics, or a
  network request.
- Avoid a visible black-to-navy flash when a returning visitor has selected the
  original scheme.
- Remain compatible with the existing Next.js server build and GitHub Pages
  static export.
- Meet keyboard, screen-reader, contrast, touch-target, and reduced-motion
  expectations already established by the site.

## Non-goals

- Recreate the layout, typography, or component design of the original website.
- Add a third scheme, automatic system-theme mode, theme scheduling, or account
  synchronization.
- Change photographic source assets.
- Send theme preference data to the inquiry endpoint or any external service.
- Replace the current brand copy, conversion flow, or motion system.

## Interaction Design

### Desktop

A compact theme button appears in the fixed header between the primary
navigation and the existing `Book Caleb` call to action.

- In the default scheme, its visible name is `Original colors`.
- In the original scheme, its visible name is `Cinematic colors`.
- The button uses `aria-pressed="true"` when the original scheme is active and
  `aria-pressed="false"` when the cinematic scheme is active.
- Its accessible name describes the action that will occur, matching the visible
  label.
- It meets a minimum 44-pixel touch target without displacing the booking call
  to action.

### Mobile

The theme button appears inside the expanded mobile navigation after the regular
navigation links. It uses the same label, pressed state, storage behavior, and
touch-target requirement as the desktop control.

Both desktop and mobile controls represent the same global state. Only the
control appropriate to the current breakpoint is visible.

## Architecture

The implementation has four bounded units.

### 1. Color scheme model

`src/lib/color-scheme.ts` owns the stable values and storage contract:

- `ColorScheme` is the union `"cinematic" | "original"`.
- `DEFAULT_COLOR_SCHEME` is `"cinematic"`.
- `COLOR_SCHEME_STORAGE_KEY` is `"caleb-color-scheme"`.
- A parser accepts only the two supported values and falls back to the default
  for `null`, malformed, or future values.

The model contains no DOM or React dependency and is independently testable.

### 2. Early bootstrap

The root layout emits a minimal inline bootstrap before visible page content. It
reads `localStorage`, validates the stored value, and sets
`document.documentElement.dataset.colorScheme`.

- The server-rendered `<html>` element declares `data-color-scheme="cinematic"`
  as the deterministic default.
- The bootstrap catches storage/security exceptions and leaves the default
  unchanged.
- No network request, cookie, or user-identifying value is involved.
- The script must be small and self-contained so the static export behaves the
  same as the normal Next.js build.

This unit prevents a returning original-scheme visitor from seeing the cinematic
palette during first paint.

### 3. Theme toggle component

`src/components/color-scheme-toggle.tsx` is a client component responsible only
for presenting and changing the preference.

- It reads the validated scheme from the root element after mounting.
- On activation it switches the root dataset, updates its label and
  `aria-pressed` state, and attempts to persist the new value.
- If persistence throws or is unavailable, the dataset and current-session UI
  still update.
- It does not own site navigation, palette values, or CSS selectors.

`SiteHeader` renders one instance in the desktop action group and one inside the
mobile menu. The shared browser preference keeps them synchronized. A small
same-document custom event, or an equivalent single external-store subscription,
notifies both instances when either control changes. The implementation should
choose the smallest mechanism that keeps both controls accurate without adding
application-wide context.

### 4. Semantic theme tokens

`src/app/globals.css` remains the source of visual styling. Existing raw
black/ivory/gold translucent colors that participate in theming are consolidated
into semantic custom properties for:

- page and elevated surfaces;
- strong, muted, and inverse text;
- primary accent and accent contrast;
- borders and focus outlines;
- fixed and translucent header/mobile navigation backgrounds;
- image overlays, gradients, shadows, and highlight glows;
- form controls, notices, and status treatments.

The cinematic values preserve the current rendered appearance. A root selector
for `html[data-color-scheme="original"]` overrides those semantic properties
with navy/yellow/white/slate values. Component selectors continue consuming the
same properties, so pages do not require conditional React rendering.

Non-theme semantic colors used for error and warning meaning may remain distinct
when necessary for comprehension, but their contrast must be checked in both
schemes.

## State and Data Flow

1. The browser receives static HTML with the cinematic dataset.
2. Before visible content, the bootstrap checks the one local storage key.
3. A valid stored value replaces the root dataset; an invalid or unavailable
   value leaves the cinematic default.
4. Toggle components mount and reflect the root dataset.
5. A visitor activates either toggle.
6. The component updates the root dataset immediately, updates both controls,
   and attempts to save the value.
7. CSS variables recalculate the complete visible palette without navigation or
   page reload.
8. Next.js route changes preserve the root element and current scheme. A full
   reload restores it through the bootstrap.

## Error Handling

- Invalid stored values resolve to `cinematic`.
- `localStorage.getItem` failures preserve the server default.
- `localStorage.setItem` failures do not undo the visible switch.
- The component must not throw when `window`, `document`, or storage is
  unavailable during server rendering or tests.
- Hydration must complete without mismatch warnings.
- The feature has no loading, error, or offline state because it has no remote
  dependency.

## Accessibility

- Use a semantic `button` with `type="button"`.
- Expose the selected state with `aria-pressed`.
- Keep visible and accessible action labels aligned.
- Preserve the site's existing visible focus treatment in both palettes.
- Maintain at least WCAG AA contrast for normal text and controls.
- Do not rely on color alone to communicate which scheme is active.
- Keep both responsive controls keyboard reachable only when visible.
- Theme changes do not introduce animation, so reduced-motion behavior is
  unchanged.

## Test Strategy

Implementation follows a red-green-refactor sequence.

### Unit and component tests

- The parser accepts `cinematic` and `original`.
- Missing, malformed, and unsupported values return `cinematic`.
- The toggle initially exposes the active root scheme and correct
  `aria-pressed` value.
- Activating the control switches to the original scheme, changes the action
  label, updates the root dataset, and stores the preference.
- Activating it again restores the cinematic scheme.
- A stored original choice is reflected after mount.
- A storage write exception still changes the current document scheme.
- Header tests prove both responsive placements exist and preserve the primary
  booking action.
- A CSS contract test verifies that both root schemes define the required
  semantic properties and the original palette values.

Each new behavior must first be demonstrated by an expected failing test before
production code is added.

### Automated project gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run build:pages`

### Browser verification

Test the local build and the deployed GitHub Pages URL at approximately:

- Desktop: `1440 x 1000`
- Mobile: `390 x 844`

For each viewport:

- verify the expected control placement and label;
- switch from cinematic to original and back;
- confirm `aria-pressed`, root dataset, and representative computed colors;
- navigate to another route and confirm the scheme persists;
- reload and confirm the stored scheme is applied before the visible page;
- confirm mobile navigation still opens and routes correctly;
- check for horizontal overflow, blank content, framework overlays, console
  errors, page errors, and HTTP 4xx/5xx responses;
- capture screenshots of both schemes, including a mobile state.

## Deployment

After all gates and browser checks pass:

1. Commit the implementation to `main`.
2. Push to `Reuben-Williams/Caleb-Motivational-Speaker-V3`.
3. Monitor the existing GitHub Pages workflow through successful build and
   deploy jobs.
4. Repeat the switch, persistence, navigation, console, and responsive checks on
   the public Pages URL.

## Acceptance Criteria

- The current black/gold design remains the first-visit default.
- Every route offers access to the switch through its shared header.
- The alternate scheme visibly and consistently uses `#02017D`, `#F1DD18`,
  white, and slate across the site's primary themed surfaces.
- The control accurately names the available action and exposes pressed state.
- Both responsive controls stay synchronized.
- The preference survives route changes and full reloads when storage works.
- Storage failures degrade to current-session switching without an exception.
- No hydration, console, page, asset, layout-overflow, or accessibility
  regression is introduced.
- Normal and GitHub Pages builds pass and the public deployment is verified.
