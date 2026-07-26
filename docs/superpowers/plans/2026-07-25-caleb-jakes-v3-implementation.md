# Caleb Jakes V3 Implementation Plan

**Status:** Q1 review ready  
**Design source:** `docs/superpowers/specs/2026-07-25-caleb-jakes-v3-design.md`  
**Media source:** `docs/media-manifest.md` revision 2, M1 and M2 approved  
**Framework:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4

## Working rules

- Keep the Stitch archive and all source media unchanged.
- Import only media whose exact hashes are approved in manifest revisions 1
  and 2.
- Keep content in `src/content`; animation components receive content as props.
- Use Server Components by default and isolate browser-only behavior behind
  small client boundaries.
- Follow test-first red-green-refactor for application behavior.
- Keep the initial analytics implementation provider-free.
- Do not simulate successful production inquiry delivery.
- Do not reference social images until M2 is approved.

## Phase 1 — Foundation and content contracts

1. Add the Next.js, TypeScript, Tailwind, Vitest, and ESLint configuration.
2. Write failing tests for:
   - required routes and unique metadata;
   - evidence-backed content records;
   - booking validation and conditional fields;
   - draft restoration and expiry;
   - inquiry state transitions and delivery failure behavior.
3. Implement the content/evidence registry, metadata helpers, booking schema,
   draft helpers, and provider-independent inquiry service until tests pass.
4. Add global tokens, pinned fonts, responsive typography, skip link, grain,
   focus treatment, editorial grid, buttons, and semantic primitives.

## Phase 2 — Shared shell and supporting routes

1. Write failing component tests for the audience menu, mobile menu, FAQ
   disclosures, breadcrumbs, and no-JavaScript contact fallback.
2. Implement `SiteHeader`, `AudienceMenu`, `MobileMenu`,
   `MobileBookingBar`, `CableMotif`, and `SiteFooter`.
3. Implement the reusable `PageHero`, `SectionHeading`, buttons, media frames,
   quote block, audience/topic/format/process primitives, and `FaqList`.
4. Build `/about`, `/speaking`, `/schools-colleges`, `/faith-events`,
   `/conferences-workshops`, `/book-media`, `/faq`, and `/privacy`.
5. Add canonical metadata, JSON-LD, sitemap, robots, not-found, and legacy
   redirects without Open Graph images until M2.

## Phase 3 — Homepage

1. Build the first viewport from approved H01/H02/H03 media and compare it
   against the accepted Stitch hero before continuing.
2. Add the authority rail, transformation story, audience pathways, speaker
   reel, topics, outcomes, book feature, formats, booking process, FAQ preview,
   abbreviated inquiry, and final call to action in the frozen order.
3. Keep one semantic content tree for all capabilities.
4. Add accessible video controls, captions, transcript access, missing-media
   fallbacks, and media pause behavior.

## Phase 4 — Social images and M2

1. Generate `public/og/home.jpg`, `public/og/speaking.jpg`, and
   `public/og/book-media.jpg` locally from M1-approved media.
2. Add revision 2 hashes and a social-image review sheet to the manifest.
3. Pause for M2 approval before adding those images to route metadata.

## Phase 5 — Booking flow

1. Write failing form tests for required fields, conditional “other” fields,
   error-summary links, pending state, draft handoff, restoration notices, and
   accepted navigation.
2. Implement the abbreviated and complete forms against one shared Zod schema.
3. Implement `POST /api/inquiries` with:
   - content-type and 32 KiB guards;
   - server validation;
   - Turnstile adapter;
   - trusted-client-address adapter;
   - Upstash rate/idempotency adapter;
   - Resend delivery adapter;
   - deterministic inquiry IDs;
   - provider-level idempotency keys;
   - typed status responses.
4. Add controlled local/test adapters; production remains fail-closed when
   credentials are missing.
5. Implement `/thank-you` accepted and direct-access states.

## Phase 6 — Motion and atmosphere

1. Write reduced-motion/capability tests before enhancement code.
2. Implement `MotionRuntime` and `SmoothScrollProvider` as the only global
   capability and scroll owners.
3. Add GSAP section timelines, Lenis synchronization, cable drawing, and
   Framer Motion interaction states without transform ownership conflicts.
4. Dynamically load the restrained React Three Fiber stage only for eligible
   enhanced desktop devices; retain the static image everywhere else.
5. Verify runtime teardown on capability, visibility, and route changes.

## Phase 7 — Verification

1. Run unit/component/API tests, TypeScript, ESLint, and production build.
2. Use the in-app browser for desktop, 390×844, and 320 px routes, menus,
   form paths, media playback, reduced motion, and redirects.
3. Capture the approved native-width comparison set and write
   `docs/evidence/fidelity-ledger.md`.
4. Inspect each accepted Stitch reference and latest implementation screenshot
   with `view_image`; repair every fixable mismatch.
5. Prepare final Q1 desktop/mobile renders for user approval.

## Milestone status

- M1: Approved and implemented.
- M2: Approved and implemented.
- Booking pipeline: Implemented and verified; production is fail-closed until
  provider credentials are supplied.
- Motion and 3D enhancement: Implemented with reduced-motion and device
  capability fallbacks.
- Q1: Ready for project-owner review; approval pending.
