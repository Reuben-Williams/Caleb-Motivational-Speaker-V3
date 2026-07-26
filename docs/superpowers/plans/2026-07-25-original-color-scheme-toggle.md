# Original Color Scheme Toggle Implementation Plan

**Spec:** `docs/superpowers/specs/2026-07-25-original-color-scheme-toggle-design.md`

## Target flow

The flow under test is: any public route loads in the cinematic scheme by
default -> the visitor activates `Original colors` -> the complete site adopts
the original navy/yellow palette -> the selection remains active across route
navigation and reload -> the visitor can switch back without errors.

## Task 1: Establish the UI boundary

**Files**

- Modify: `src/components/site-shell.test.tsx`
- Add: `src/components/color-scheme-toggle.tsx`
- Modify: `src/components/site-header.tsx`

**Red**

Add header assertions for two responsive `Original colors` toggle instances,
stable accessible names, a disabled/unready initial state, and preservation of
the `Book Caleb` action. Run:

`npm test -- src/components/site-shell.test.tsx`

Confirm the failure is the missing theme controls.

**Green**

Add the smallest static client component and render desktop/mobile instances in
the approved header locations. Add only enough CSS for visibility and reserved
layout space to satisfy the initial component contract.

## Task 2: Implement and test the color-scheme model

**Files**

- Add: `src/lib/color-scheme.test.ts`
- Add: `src/lib/color-scheme.ts`

**Red**

Test the supported union values, versioned storage key, default, malformed-value
fallback, root dataset application, event detail, and storage-failure behavior.
If the initial missing-module error occurs, add only a compileable stub, rerun,
and confirm the intended behavioral assertion fails before implementing it.

**Green**

Implement the pure parser and the minimal DOM application function using the
root dataset as source of truth and
`CustomEvent<{ scheme: ColorScheme }>("caleb:color-scheme-change")`.

## Task 3: Implement synchronized interactive controls

**Files**

- Add: `src/components/color-scheme-toggle.test.tsx`
- Modify: `src/components/color-scheme-toggle.tsx`

**Red**

Cover mount readiness, correct `aria-pressed`, switching both directions,
versioned persistence, two-instance synchronization, subscription cleanup, and
continued current-document switching when storage writes throw.

**Green**

Implement the smallest client component using a stable `Original colors` label,
one event subscription per mounted control, and direct event-handler updates.
No provider, context, network request, or third-party state dependency.

## Task 4: Prevent first-paint theme flash

**Files**

- Modify: `src/lib/color-scheme.test.ts`
- Modify: `src/lib/color-scheme.ts`
- Modify: `src/app/layout.tsx`

**Red**

Evaluate the bootstrap script in JSDOM and prove it applies a valid stored
original value while ignoring invalid values and storage exceptions.

**Green**

Expose a small bootstrap string, inject it with a stable Next.js `Script` ID and
`beforeInteractive` strategy from the root layout, set the server root dataset
to `cinematic`, and suppress only the expected root-attribute hydration
difference.

## Task 5: Migrate the visual palette to semantic tokens

**Files**

- Add: `src/app/theme-contract.test.ts`
- Modify: `src/app/globals.css`

**Red**

Read `globals.css` and assert the complete token interface, exact original
palette mapping, declared aliases, and absence of forbidden raw theme literals
outside the declaration/allowlist boundary.

**Green**

Define the cinematic and original token blocks. Preserve current cinematic
computed values, convert raw alpha colors to RGB-token syntax, and style the
desktop/mobile controls. Keep the V3 typography, composition, image assets, and
motion unchanged.

## Task 6: Automated verification

Run focused tests after every green step, then:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run build:pages`

Inspect `git diff --check` and confirm the generated Pages artifact contains the
theme script, both palette values, and repository-prefixed assets.

## Task 7: Local rendered verification

Use the Browser plugin first. If its runtime repeats the previously observed
kernel-asset path failure, record that exact failure and use installed Microsoft
Edge through the existing `playwright-core` dependency.

Verify:

- desktop `1440 x 1000`;
- responsive boundaries `899px`, `900px`, and `901px`;
- mobile `390 x 844`;
- cinematic -> original -> route navigation -> reload -> cinematic;
- root dataset, `aria-pressed`, persistence, representative computed colors,
  and AA contrast;
- page identity, meaningful content, no framework overlay, no overflow, no
  relevant console/page/HTTP errors;
- screenshots saved outside the repository.

## Task 8: Publish and verify

Commit the implementation, push `main`, monitor the existing GitHub Pages
workflow to successful build and deploy jobs, then repeat the target flow on:

`https://reuben-williams.github.io/Caleb-Motivational-Speaker-V3/`

Report the commit, workflow run, automated checks, exact interaction proof,
remaining risks, and consecutive desktop/mobile screenshots.
