# Homepage Media, Hero, and Atlanta Content Design

Date: 2026-09-02
Status: Integrated design approved; pending written-spec review

## Goal

Make three tightly scoped website changes:

1. In `WATCH CALEB SPEAK`, retain the current landscape desktop picture but
   replace its soundtrack with the approved mobile “Pain Comes To Develop”
   audio. Preserve the complete approved audio through its 46.613-second end;
   the final container/video tail may differ by no more than one frame of the
   23.976-fps desktop source (approximately 41.7 milliseconds) and must not
   create a perceptible silent tail.
2. Replace the homepage hero photo with an identity-preserving Higgsfield edit
   of the user-supplied `IMG_1168.jpg`. Keep the authentic smile, pose,
   proportions, skin texture, hair, shirt, and striped details; refine the
   harsh flash and dark background into the existing cinematic visual system.
   At viewport widths up to and including 767px, position the new portrait so
   Caleb remains balanced above the headline and fade its lower boundary
   smoothly into the hero background.
3. Replace current public-facing Rochester/New York location claims with
   `Atlanta, Georgia` in long-form contexts and `Atlanta, GA` in the compact
   hero line.

The changes do not alter the mobile speaker video, the desktop hero's content
hierarchy, or the compact 3:21 player on `/book-media`. Historical evidence,
archived design records, and raw Stitch references retain their original
Rochester wording.

## Current evidence

- The homepage desktop source is
  `public/media/video/caleb-speaker-reel-720.mp4`, a 1280x720 landscape video
  with a 3:21 runtime.
- The homepage mobile source is
  `public/media/video/caleb-pain-comes-to-develop-mobile.mp4`, a 720x1280
  portrait video with a 46.613-second runtime and approved AAC audio.
- The mobile captions and transcript were reviewed word-for-word on
  2026-08-28.
- `AccessibleVideo` currently shares the 3:21 desktop variant between the
  homepage and `/book-media`.
- The mobile hero uses the same authentic
  `public/media/people/caleb-speaking-cutout.webp` asset as desktop. Its
  container is enlarged and offset at the mobile breakpoint, with a dark
  pseudo-element overlay at the bottom.
- The selected replacement source is the user-supplied
  `D:\Motivational Speaker Caleb\V1\media-ready\images\IMG_1168.jpg`, a
  3240×2160 JPEG with SHA-256
  `70182ECB8FF32BAD17BA0132E42C9D603F415B7BE218C3E38C9D014E0FC0ABDE`.
  Caleb is authentically photographed smiling on the right side of a dark
  frame, with enough upper-body detail for the mobile crop and enough negative
  space for desktop copy.
- The current hero asset is documented as an authentic background-removal
  derivative. The replacement must receive the same source/output provenance
  treatment rather than being presented as unedited documentary proof.
- Current runtime location copy is centralized in `src/content/site.ts`, with
  a second footer summary in `src/components/site-footer.tsx`. Related booking
  fixtures and browser QA data still use Rochester.

## Selected video approach

Create a new homepage-only landscape derivative:

`public/media/video/caleb-pain-comes-to-develop-desktop.mp4`

The derivative will:

- stream-copy the existing homepage desktop H.264 picture packets so its
  visible frames, dimensions, crop, color, and encoded picture remain
  unchanged;
- stream-copy the approved AAC audio packets from the mobile video;
- preserve the complete audio through its 46.613-second end, with any final
  container/video-tail variance limited to one desktop-source frame
  (approximately 41.7 milliseconds) and no perceptible silent tail;
- retain a web-compatible MP4 container with fast-start metadata; and
- be recorded with source and output hashes in a new media-manifest revision.

The output must be verified by comparing the decoded desktop video frames to
the corresponding opening segment of the existing desktop source and by
inspecting both output stream mappings. If the available toolchain cannot
produce a correctly seekable MP4 within the stated one-frame tolerance through
stream copy, implementation stops for review rather than silently re-encoding
or visually changing the desktop footage.

### Accessibility pairing

Because the soundtrack changes, the homepage desktop variant must use the
approved mobile caption and transcript content:

- `caleb-pain-comes-to-develop-mobile.en.vtt`
- `caleb-pain-comes-to-develop-mobile-transcript.txt`

The transcript link label will describe the “Pain Comes To Develop” message,
not call it a mobile transcript. The portrait mobile variant continues using
the same approved caption and transcript files.

The new media-manifest revision must also amend the existing V03 provenance
statement that currently says these caption/transcript files are paired only
with `V03-MOBILE`. The revised record must explicitly pair the approved text
assets with both the unchanged portrait mobile derivative and the new
homepage-only landscape derivative, without changing their reviewed content.

## Video component boundary

Split the existing shared desktop media definition into three explicit
variants:

1. Homepage desktop: the new 46-second landscape derivative with the approved
   mobile captions and transcript.
2. Homepage mobile: the existing 46-second portrait derivative with those same
   captions and transcript.
3. Book/media compact player: the original 3:21 speaker reel, original speaker
   reel captions, and original speaker reel transcript.

`responsiveHomepage` continues to select a complete media package after
hydration. `/book-media` does not opt into the homepage variants and therefore
retains its current content and runtime.

The no-JavaScript homepage fallback will link to the new homepage desktop
derivative and its matching transcript. The poster, native controls,
`playsInline`, preload behavior, and breakpoint remain unchanged.

## Selected Higgsfield hero approach

Create one restrained 3:2 editorial master from `IMG_1168.jpg` through the
installed Higgsfield MCP and its currently validated `soul_2` image model.
Before submitting the job, inspect the live model schema with `models_get` and
run a read-only cost estimate. Upload the exact source through Higgsfield's
confirmed-media path and preserve its source checksum in the media manifest.

The generation prompt must:

- preserve Caleb's face, hair, expression, pose, body proportions, realistic
  skin texture, navy shirt, and every white stripe;
- preserve the right-side subject and generous dark negative space on the
  left for real HTML copy;
- make only restrained editorial lighting, tonal cleanup, and background
  refinement compatible with the site's Deep Ink Black, Warm Ivory, Joy Gold,
  and Electric Cobalt visual system; and
- prohibit text, logos, microphones, stages, audiences, awards, credentials,
  new clothing, or any invented event setting.

Generate one candidate. Show the exact result in the Higgsfield gallery and
obtain explicit user approval before it enters the repository or website. If
the first candidate changes Caleb's identity, anatomy, clothing, stripes, or
pose, permit one targeted retry against the same source and restrictions. If
that retry also drifts, stop and retain the current production hero rather
than shipping a synthetic likeness.

After approval, retain the downloaded Higgsfield output as the review master
and create a web-optimized production derivative. Record the source, confirmed
Higgsfield media ID, generation job ID, model, restrictions, dimensions, and
source/output hashes in a new media-manifest revision. The visible alt text
must describe the resulting portrait truthfully and must not claim that Caleb
is speaking or appearing at an event.

## Hero integration and responsive treatment

Use the approved 3:2 master as a full hero media layer behind the existing
copy, preserving the current headline, calls to action, credential/location
lines, stage atmosphere, glow, noise, and microphone-cable treatment.

- On desktop, keep Caleb on the right and retain the supplied dark negative
  space behind the left-aligned copy. Apply only CSS overlays needed for text
  contrast and integration with the existing backdrop.
- On mobile, use responsive object positioning to keep Caleb's head, hands,
  and upper torso visible above the headline without fabricating a second
  image.
- Apply both `mask-image` and `-webkit-mask-image` to the isolated hero media
  layer. The mask remains opaque across Caleb's head and upper body, then
  transitions gradually to transparent before the lower image boundary.
- Retain a subtle atmospheric overlay only where it helps the portrait merge
  with the stage. The transparency mask, rather than a solid overlay, owns
  removal of the visible lower edge.
- Keep the headline, body copy, buttons, cable line, and header above the media
  layer where required for legibility.
- Verify both the default and original color schemes because the fade must
  remain seamless against either theme.

### Mobile visual acceptance

At 375x844, 390x844, and the 767px mobile breakpoint boundary, in both the
default and original color schemes:

- Caleb's head is not clipped by the header or viewport edge.
- His face, hands, and upper torso remain visible.
- The portrait does not crowd or cover the eyebrow or headline.
- The lower body dissolves progressively into the hero; no horizontal image
  boundary, rectangular edge, or sudden tonal band is visible.
- The hero has no horizontal overflow and its existing calls to action remain
  usable.

At 768px, verify that the mobile-only positioning and mask no longer apply and
the adjacent desktop/tablet treatment remains unchanged in both color schemes.

At 1440×900, verify that the new subject remains on the right, the left-side
headline and calls to action retain sufficient contrast, and no generated text
or invented event details appear in the image.

## Atlanta location correction

Use two explicit formats:

- `Atlanta, Georgia` for `contact.location`, the footer summary, and other
  long-form public copy;
- `Based in Atlanta, GA • Available for engagements worldwide` for the compact
  hero line.

Update current tests, booking fixtures, and browser-QA sample data that encode
Rochester as the website's present location. Rename non-user-facing test prose
to `Eastern` where needed, but keep `America/New_York` IANA timezone identifiers
and Eastern-time date behavior unchanged because Atlanta uses that timezone.
Do not rewrite historical evidence, archived specifications, or raw imported
Stitch/reference files.

## Alternatives considered

1. **Hidden synchronized mobile video for audio.** Rejected because it would
   download two videos, increase mobile/desktop bandwidth, complicate native
   controls, and risk playback drift.
2. **Separate audio element controlled by JavaScript.** Rejected because seeking,
   pause, volume, autoplay policy, accessibility, and error recovery would need
   a custom synchronization layer.
3. **Baked fade in the new hero bitmap.** Rejected because it would couple the
   fade to one background/color scheme and create another visual asset to
   maintain.
4. **Single muxed homepage derivative plus a CSS transparency mask.** Selected
   because each player uses one synchronized media file and the existing hero
   treatment remains reusable across themes.
5. **Formal `IMG_1844.jpg` suit portrait.** Rejected for this hero because its
   centered vertical foliage composition would require extensive invented
   horizontal scenery and more aggressive responsive reconstruction.
6. **Near-duplicate `IMG_1167.jpg`.** Viable, but `IMG_1168.jpg` provides
   stronger upper-body framing for the responsive fade while retaining the
   same joyful expression and dark negative space.
7. **Deterministic color correction only.** Safest for literal pixel fidelity,
   but it would not deliver the explicitly requested Higgsfield editorial
   treatment. It remains the fallback if both identity-preserving generation
   attempts fail.

## Failure and fallback behavior

- If the new desktop derivative cannot be prepared or verified without visual
  alteration, retain the current production video and stop the release.
- If Higgsfield is unavailable, reports insufficient authorized credits, or
  cannot preserve Caleb's identity and source details after the single allowed
  retry, retain the current hero and stop that portion of the release.
- A generated hero result is never treated as approved merely because the job
  completed. It must be visually inspected and explicitly accepted by the
  user before integration.
- If the media fails at runtime, native controls remain visible and the
  matching transcript remains available.
- Before responsive selection is known, the homepage continues to render the
  poster without preloading either video.
- If `matchMedia` is unavailable, the new homepage desktop variant is the
  fallback.
- The hero mask is progressive enhancement; unsupported masking must still
  leave the existing dark overlay and readable copy.

## Test strategy

Follow red-green-refactor for behavior changes.

1. Add a failing component test proving homepage desktop selects the new
   46-second landscape source with the approved “Pain Comes To Develop” caption
   and transcript.
2. Add a failing test proving homepage mobile retains the current portrait
   source with that caption and transcript.
3. Add a failing regression test proving `/book-media` retains the original
   3:21 source, captions, and transcript.
4. Add a failing server-render fallback test proving it references the new
   homepage desktop media package.
5. Add a focused style-contract test for the mobile portrait mask and its
   desktop isolation when compatible with the existing test conventions.
6. Add failing content tests proving public runtime surfaces use
   `Atlanta, Georgia`/`Atlanta, GA`, and that user-facing source files no longer
   contain Rochester or New York location claims.
7. Add a failing hero test proving the homepage references the approved new
   asset with truthful alternative text and preserves the existing copy/CTA
   hierarchy.
8. Verify the approved hero master's source/job provenance, dimensions, hashes,
   optimized derivative, and responsive focal-point behavior.
9. Verify video output duration, dimensions, stream mapping, fast-start behavior,
   hashes, and visual-frame preservation.
10. Run targeted tests, the full unit suite, lint, typecheck, production build,
   and the repository's complete `npm run check` gate.
11. Browser-verify at 1440x900, 768px, 767px, 390x844, and 375x844. At both
   breakpoint-boundary widths, check the default and original color schemes.
   Confirm the selected media request, native playback controls, correct
   captions/transcript, approved hero asset, truthful alt text, Atlanta copy,
   mobile hero fade, desktop isolation, text contrast, no broken assets, no
   framework overlay, no relevant console errors, and no horizontal overflow.

## Repository and release boundaries

- Preserve the user's existing modifications and untracked source/output files.
- Copy or transform the approved source only after the generated candidate is
  explicitly accepted; do not modify the V1 source file in place.
- Commit only the files created or changed for this approved work.
- Do not alter booking, commerce, staff access, control-plane, DNS, provider,
  or environment-variable behavior.
- Local implementation and verification do not authorize a GitHub push or
  Vercel production deployment. Those remain separate explicit release actions.
