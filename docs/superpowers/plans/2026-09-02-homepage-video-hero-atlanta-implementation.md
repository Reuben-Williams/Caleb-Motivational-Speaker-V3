# Homepage Video, Hero, and Atlanta Implementation Plan

**Status:** Pending implementation-plan approval  
**Design source:** `docs/superpowers/specs/2026-09-02-homepage-video-audio-and-mobile-hero-design.md`  
**Framework:** Next.js 16 App Router, React 19, TypeScript, Vitest 4  
**Release boundary:** Local implementation only; no push, deployment, DNS change, provider mutation, form submission, or commerce order

## Outcome

Ship one locally verified change set that:

1. gives the homepage desktop `WATCH CALEB SPEAK` player its existing landscape
   picture and the complete approved 46.613-second `Pain Comes To Develop`
   soundtrack;
2. retains the current portrait mobile player and the 3:21 `/book-media` reel;
3. replaces the homepage hero only after the user explicitly approves one
   identity-preserving Higgsfield candidate derived from the exact `IMG_1168.jpg`
   source; and
4. changes current public base-location copy from Rochester/New York to
   Atlanta, Georgia without rewriting historical evidence or the Eastern-time
   `America/New_York` IANA identifier.

## Working rules

- Preserve the existing dirty worktree files: `next-env.d.ts`,
  `.builder/hosting-handoff-acknowledgement.json`, the two root MP4 files, and
  `output/`.
- Use test-first red-green-refactor for application behavior.
- Never modify `D:\Motivational Speaker Caleb\V1\media-ready\images\IMG_1168.jpg`
  in place.
- Do not spend Higgsfield credits until the live model schema, per-attempt
  estimate, optional retry estimate, and maximum possible total have been
  shown to and explicitly authorized by the user.
- A completed Higgsfield job is not an approved asset. Show the exact candidate
  and pause for explicit visual approval before downloading it into the repo or
  referencing it from application code.
- Generate at most one initial candidate and one user-authorized targeted
  retry. If identity, clothing, stripes, anatomy, or pose still drifts, retain
  the current production hero and stop that part of the change.
- Commit only scoped files. Push and production deployment require separate
  authorization after local verification and visual acceptance.

## Task 1 — Establish the clean implementation baseline

**Read:**

- `git status --short`
- `docs/media-manifest.md`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/components/accessible-video.tsx`
- `src/content/site.ts`

**Steps:**

1. Reconfirm the source SHA-256 is
   `70182ECB8FF32BAD17BA0132E42C9D603F415B7BE218C3E38C9D014E0FC0ABDE`.
2. Record the current hashes and `ffprobe` stream metadata for the desktop and
   mobile videos before creating derivatives.
3. Run the existing focused tests for the video component, site content,
   footer, metadata, booking schema, and theme contract.
4. Stop if the baseline fails for a reason related to this scope; do not absorb
   unrelated dirty files into the work.

**Commands:**

```powershell
Get-FileHash 'D:\Motivational Speaker Caleb\V1\media-ready\images\IMG_1168.jpg' -Algorithm SHA256
npx vitest run src/components/accessible-video.test.tsx src/content/site.test.ts src/components/site-footer.test.tsx src/lib/metadata.test.ts src/lib/booking-schema.test.ts src/app/theme-contract.test.ts
```

## Task 2 — Run the Higgsfield preflight and obtain spend authorization

**Files changed:** none

**Steps:**

1. Query the installed Higgsfield MCP for the live `soul_2` model schema and
   confirm that reference-image editing and the approved 3:2 output remain
   available.
2. Upload and confirm the exact local `IMG_1168.jpg` source through the
   provider's confirmed-media flow; compare the confirmed source identity with
   the local checksum.
3. Request a read-only estimate for one candidate and for the single optional
   retry.
4. Present the model ID, relevant schema constraints, first-attempt cost,
   retry cost, available credits, and maximum possible total.
5. Pause for explicit authorization of that maximum. If the live model,
   schema, availability, or price differs from the approved estimate later,
   stop and request fresh authorization.

## Task 3 — Generate and visually approve the hero candidate

**Files changed before approval:** none

**Steps:**

1. Submit one 3:2 Soul 2.0 reference-image edit using the prompt and negative
   constraints frozen in the approved design.
2. Wait for completion and show the exact provider result in the Higgsfield
   gallery.
3. Inspect face, expression, hair, anatomy, pose, navy shirt, every white
   stripe, skin texture, right-side composition, and left-side negative space.
4. Pause for explicit user approval. If rejected for bounded drift, describe
   the defect and request authorization for the one allowed targeted retry.
5. Do not place an unapproved result in the repository or render it on the
   website.

## Task 4 — Freeze the approved hero asset and provenance

**Create:**

- `media-review/higgsfield/H04-caleb-home-hero-editorial.png`
- `public/media/people/caleb-home-hero-editorial.webp`

**Modify:**

- `docs/media-manifest.md`

**Steps:**

1. Download the approved provider output without altering the provider master
   and save it as the H04 review master.
2. Create one color-managed 3:2 WebP production derivative without generative
   additions, baked text, or a baked bottom fade.
3. Verify decoded dimensions, color mode, alpha behavior, and source/output
   hashes.
4. Add a new manifest revision recording the original local source and hash,
   confirmed Higgsfield media ID, job ID, model, restrictions, review-master
   hash, production-derivative hash, dimensions, classification, intended use,
   and explicit user decision.
5. Leave H01-H03 and all previously approved manifest records unchanged.

## Task 5 — Add failing location and hero contracts

**Create:**

- `src/app/homepage-hero-contract.test.tsx`
- `src/components/structured-data.test.tsx`
- `src/app/homepage-hero-style-contract.test.ts`
- `docs/evidence/atlanta-location-correction-2026-09-02.md`

**Modify:**

- `src/content/site.test.ts`
- `src/components/site-footer.test.tsx`

**Red tests must prove:**

1. `contact.location` is exactly `Atlanta, Georgia`.
2. The compact hero line is exactly
   `Based in Atlanta, GA • Available for engagements worldwide`.
3. The footer renders Atlanta from the centralized content object and does not
   retain a separate Rochester literal.
4. rendered `Person.homeLocation.name` structured data is `Atlanta, Georgia`.
5. the homepage uses `/media/people/caleb-home-hero-editorial.webp` with
   truthful portrait alt text and preserves the existing headline and CTA
   hierarchy;
6. the mobile hero rules include both `mask-image` and
   `-webkit-mask-image`, while the mask/position override is confined to
   `max-width: 767px`; and
7. the additive evidence note records that the Atlanta value comes from the
   user's 2026-09-02 correction, not the older Rochester evidence.

**Red command:**

```powershell
npx vitest run src/content/site.test.ts src/components/site-footer.test.tsx src/components/structured-data.test.tsx src/app/homepage-hero-contract.test.tsx src/app/homepage-hero-style-contract.test.ts
```

## Task 6 — Implement the Atlanta correction and hero integration

**Modify:**

- `src/content/site.ts`
- `src/components/site-footer.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `tests/booking-fixture.ts`
- `scripts/q1-playwright.mjs`
- `src/lib/booking-schema.test.ts`

**Steps:**

1. Change the centralized long and compact base-location values to their
   approved Atlanta forms.
2. Make the footer's bottom line consume `contact.location` so it cannot drift
   from the contact block again.
3. Change only current booking fixtures and QA sample data that use Rochester
   as the site's base. Rename the booking-schema test prose from `New York
   date` to `Eastern date`, retaining `America/New_York` and the test's date
   behavior.
4. Render the approved H04 WebP as the hero media layer with truthful alt text.
   Retain the existing copy, buttons, credentials, atmosphere, glow, noise,
   stage backdrop, and cable hierarchy.
5. Use responsive object positioning and a progressive CSS transparency mask
   at widths up to 767px. Keep the default overlay fallback readable when
   masking is unsupported; remove the mask-specific overrides at 768px.
6. Run the Task 5 tests until green. Confirm no historical evidence,
   University of Rochester reference, caption/transcript wording,
   `src/content/evidence.ts`, archived spec, or raw Stitch file changed.

## Task 7 — Create and verify the homepage-only desktop video

**Create:**

- `public/media/video/caleb-pain-comes-to-develop-desktop.mp4`
- `docs/evidence/homepage-video-verification-2026-09-02.json`

**Modify:**

- `docs/media-manifest.md`

**Steps:**

1. Use `ffmpeg` stream mapping with `-c copy` to take H.264 picture packets
   from `caleb-speaker-reel-720.mp4` and the complete AAC stream from
   `caleb-pain-comes-to-develop-mobile.mp4`, producing a fast-start MP4.
2. Do not re-encode the picture or soundtrack. Stop if stream copy cannot make
   a seekable output within the approved one-frame endpoint tolerance.
3. Use `ffprobe` packet output to compare source/output video packet hashes for
   the selected opening segment and source/output AAC packet/sample counts,
   timestamps, durations, sizes, and hashes.
4. Decode corresponding picture frames from both desktop files and compare
   their frame hashes. Verify every approved AAC packet/sample is preserved
   without trimming, padding, inserted silence, or replacement audio.
5. Verify H.264/AAC mappings, 1280×720 dimensions, fast-start metadata, the
   exact approved audio endpoint, and a final video/container endpoint within
   `1001/24000` seconds of it.
6. Save secret-free machine-readable results in the evidence JSON and add the
   new video plus the dual-use V03 caption/transcript relationship to a new
   media-manifest revision.

## Task 8 — Add failing video-boundary contracts, then implement them

**Modify:**

- `src/components/accessible-video.test.tsx`
- `src/components/accessible-video.tsx`

**Red tests must prove:**

1. homepage desktop selects the new landscape derivative, the approved V03
   captions, and a neutral `Pain Comes To Develop` transcript label;
2. homepage mobile keeps the existing portrait derivative with the same
   captions and transcript;
3. `/book-media`/compact mode keeps the original 3:21 reel package;
4. the responsive server render emits neither video source before hydration;
5. the no-JavaScript fallback links to the new landscape derivative and
   matching transcript; and
6. missing `matchMedia` falls back to the new homepage desktop package.

**Steps:**

1. Split the current shared `DESKTOP_VARIANT` into explicit homepage-desktop,
   homepage-mobile, and book/media variants.
2. Change the transcript label only; do not edit the approved caption or
   transcript files.
3. Keep the poster, controls, `playsInline`, preload policy, and 767px
   breakpoint unchanged.
4. Run the focused component suite to green.

## Task 9 — Run complete automated verification

**Commands:**

```powershell
npm run check:no-highlevel
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```

**Acceptance:**

- no HighLevel runtime is introduced;
- all focused and full suites pass;
- the production build succeeds;
- a targeted repository scan finds no current public Rochester base-location
  claims outside explicitly preserved historical/evidentiary material; and
- `git diff --check` is clean and the final diff contains only scoped files.

## Task 10 — Browser and media acceptance

**Viewports:** 1440×900, 768×900, 767×844, 390×844, and 375×844  
**Color schemes:** default cinematic and original

**Steps:**

1. Start the verified production build locally and use true browser viewport
   emulation.
2. At 1440px, confirm Caleb stays right, copy remains readable, the hero has no
   generated text/invented scene, the homepage requests the new landscape
   46-second video, native seeking reaches the complete audio end, and the
   transcript/captions are correct.
3. At 768px, confirm the mobile mask and mobile object position no longer
   apply.
4. At 767px, 390px, and 375px, confirm the head, face, hands, and upper torso
   remain visible above the headline; the lower edge dissolves smoothly; CTAs
   remain usable; and the portrait mobile video remains selected.
5. In both color schemes, confirm no rectangular hero edge, tonal band,
   horizontal overflow, broken asset, framework overlay, relevant console
   error, or failed media request.
6. Open `/book-media` directly and confirm its 3:21 source, captions,
   transcript, poster, and compact layout remain unchanged.
7. Inspect rendered HTML and JSON-LD for the exact Atlanta forms and verify the
   truthful hero alt text.
8. Present desktop/mobile screenshots and the approved H04 master for final
   visual acceptance before any push or deployment request.

## Proposed commit sequence

1. `test: lock Atlanta and homepage hero contracts`
2. `feat: update homepage hero and Atlanta location`
3. `media: add verified homepage desktop message`
4. `feat: split homepage and book media variants`
5. `docs: record integrated homepage verification`

Implementation may combine a test with its immediately related production
change when necessary to keep the branch buildable, but each commit must remain
reviewable and exclude all pre-existing user-owned files.

## Stop conditions

- Higgsfield spend is not explicitly authorized after the live estimate.
- The candidate is not explicitly approved or fails identity/detail review
  after the one allowed retry.
- Video stream copy alters picture frames, loses or pads AAC content, is not
  seekable, or misses the endpoint tolerance.
- Atlanta changes would require rewriting historical evidence rather than
  adding current provenance.
- Any unrelated booking, commerce, editor, control-plane, DNS, provider, or
  environment-variable behavior would need to change.
- Automated or browser verification exposes a regression that cannot be fixed
  within the approved design.
