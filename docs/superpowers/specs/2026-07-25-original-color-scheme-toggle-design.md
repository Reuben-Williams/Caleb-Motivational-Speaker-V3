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

- Its stable visible and accessible name is `Original colors`.
- The button uses `aria-pressed="true"` when the original scheme is active and
  `aria-pressed="false"` when the cinematic scheme is active.
- The stable label names the mode controlled by the toggle, while
  `aria-pressed` communicates whether that mode is selected. The label does not
  change to an action name because doing so would make the pressed state
  ambiguous.
- It meets a minimum 44-pixel touch target without displacing the booking call
  to action.

### Mobile

At the existing `900px` responsive breakpoint, the desktop control is hidden
with `display: none` and the theme button appears inside the expanded mobile
navigation after the regular navigation links. It uses the same stable label,
pressed state, storage behavior, and touch-target requirement as the desktop
control. Above `900px`, the entire mobile navigation remains `display: none`.
These existing display rules keep the inactive duplicate out of keyboard and
assistive-technology navigation.

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

The root layout emits a minimal inline bootstrap as the first executable element
inside `<head>`, before styles can paint visible page content. It reads
`localStorage`, validates the stored value, and sets
`document.documentElement.dataset.colorScheme`.

- The server-rendered `<html>` element declares `data-color-scheme="cinematic"`
  as the deterministic default.
- The `<html>` element uses React's hydration-warning suppression specifically
  for this attribute because the bootstrap is permitted to change it before
  hydration. React does not conditionally render page content from the scheme
  and therefore does not overwrite the bootstrap value during hydration.
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

- It renders a stable `Original colors` label on the server, reserves its final
  layout space, and starts disabled with neither a selected nor an unselected
  state announced.
- On mount it reads the validated root dataset, enables the control, and sets
  the corresponding `aria-pressed` value. The unready state is visually hidden
  with `visibility: hidden`, not removed, so hydration cannot expose an
  incorrect state or cause layout shift.
- On activation it switches the root dataset, updates its `aria-pressed` state,
  and attempts to persist the new value.
- If persistence throws or is unavailable, the dataset and current-session UI
  still update.
- It does not own site navigation, palette values, or CSS selectors.

`SiteHeader` renders one instance in the desktop action group and one inside the
mobile menu. The root `data-color-scheme` attribute is the same-document source
of truth. Both controls subscribe on mount to the window event
`caleb:color-scheme-change` and remove that listener on unmount. The event is a
`CustomEvent<{ scheme: ColorScheme }>` carrying the already-validated active
scheme.

The activation sequence is fixed:

1. Parse the current root dataset.
2. Determine the other supported scheme.
3. Set the root dataset.
4. Dispatch `caleb:color-scheme-change` with the new scheme so both controls
   update.
5. Attempt the storage write.

A failed storage write does not roll back the root dataset or event, so the two
controls cannot diverge during the current document session. Cross-tab
synchronization through the browser `storage` event is explicitly out of scope.

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

The required token interface is:

| Token | Purpose |
| --- | --- |
| `--theme-page`, `--theme-page-rgb` | Root and deepest backgrounds, including alpha overlays |
| `--theme-surface`, `--theme-surface-rgb` | Elevated panels and menus |
| `--theme-surface-soft`, `--theme-surface-soft-rgb` | Secondary panels and controls |
| `--theme-text`, `--theme-text-rgb` | Strong text and alpha text treatments |
| `--theme-muted`, `--theme-muted-rgb` | Secondary text |
| `--theme-accent`, `--theme-accent-rgb` | Brand accents and primary calls to action |
| `--theme-accent-contrast`, `--theme-accent-contrast-rgb` | Text placed on the accent |
| `--theme-border` | Default rule and control border |
| `--theme-focus` | Visible keyboard focus |
| `--theme-shadow-rgb` | Shadow and depth treatments |

Alpha variations use modern CSS color syntax such as
`rgb(var(--theme-page-rgb) / 0.78)` instead of separate opacity-specific tokens.
The existing short aliases (`--ink`, `--surface`, `--surface-soft`, `--ivory`,
`--muted`, `--gold`, `--line`) may remain only as mappings to this required
interface while components are migrated.

The cinematic values preserve the current rendered appearance. A root selector
for `html[data-color-scheme="original"]` overrides those semantic properties
with navy/yellow/white/slate values. Component selectors continue consuming the
same properties, so pages do not require conditional React rendering.

Non-theme semantic colors used for error and warning meaning may remain distinct
when necessary for comprehension, but their contrast must be checked in both
schemes.

The migration boundary is every rule in `src/app/globals.css`. Outside the
`:root` cinematic declarations, the original-scheme override, data-URI artwork,
and an explicit allowlist of semantic status colors (`#ff786f` error and
`#ffb14a` warning), rules may not contain raw occurrences of the current palette
or its alpha forms: `#050505`, `#131313`, `#201f1f`, `#fdfcf8`, `#d0c5af`,
`#d4af37`, `rgba(5, ...)`, `rgba(19, ...)`, `rgba(32, ...)`,
`rgba(253, ...)`, or `rgba(212, ...)`. They must consume the token interface.
The CSS contract test enforces this boundary and allowlist.

## State and Data Flow

1. The browser receives static HTML with the cinematic dataset.
2. Before visible content, the bootstrap checks the one local storage key.
3. A valid stored value replaces the root dataset; an invalid or unavailable
   value leaves the cinematic default.
4. Toggle components mount, read the root dataset, become visible and enabled,
   and reflect it through `aria-pressed`.
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
- Keep the visible and accessible label stable as `Original colors`; pressed
  state communicates selection.
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
- Activating the control switches to the original scheme, updates the pressed
  state and root dataset, and stores the preference.
- Activating it again restores the cinematic scheme.
- A stored original choice is reflected after mount.
- A storage write exception still changes the current document scheme.
- Two mounted controls stay synchronized through the named event after a
  successful or failed storage write, and remove subscriptions on unmount.
- Header tests prove both responsive placements exist and preserve the primary
  booking action.
- A CSS contract test verifies that both root schemes define the complete named
  token interface, that the original palette values are present, and that
  disallowed raw cinematic literals do not remain outside the declared
  migration boundary and allowlist.

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
- seed the original preference before navigation and assert the root dataset and
  representative computed color at the first DOM-ready observation, before
  interacting with the hydrated control;
- confirm mobile navigation still opens and routes correctly;
- calculate contrast ratios for representative body text, muted text, primary
  calls to action, header controls, and focus treatment in both schemes;
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
- The stable `Original colors` control accurately exposes whether that mode is
  pressed.
- Both responsive controls stay synchronized.
- The preference survives route changes and full reloads when storage works.
- Storage failures degrade to current-session switching without an exception.
- No hydration, console, page, asset, layout-overflow, or accessibility
  regression is introduced.
- Normal and GitHub Pages builds pass and the public deployment is verified.
