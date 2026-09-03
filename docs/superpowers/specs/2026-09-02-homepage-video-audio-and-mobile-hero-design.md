# Homepage Desktop Audio and Mobile Hero Design

Date: 2026-09-02
Status: Approved for written specification

## Goal

Make two tightly scoped homepage changes:

1. In `WATCH CALEB SPEAK`, retain the current landscape desktop picture but
   replace its soundtrack with the approved mobile “Pain Comes To Develop”
   audio. Preserve the complete approved audio through its 46.613-second end;
   the final container/video tail may differ by no more than one frame of the
   23.976-fps desktop source (approximately 41.7 milliseconds) and must not
   create a perceptible silent tail.
2. At viewport widths up to and including 767px, reposition Caleb in the hero
   and fade the bottom of his existing portrait smoothly into the hero
   background, matching the visual treatment used on desktop.

The changes do not alter the mobile speaker video, the desktop hero, or the
compact 3:21 player on `/book-media`.

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

## Component boundary

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

## Selected mobile hero approach

Use mobile-only CSS; do not generate or modify an image asset.

- Adjust `.home-hero__portrait` bounds and horizontal offset so Caleb's head,
  microphone, hands, and upper body are balanced above the headline at 375px
  and 390px widths.
- Apply both `mask-image` and `-webkit-mask-image` to the portrait image or its
  isolated visual wrapper. The mask remains fully opaque across Caleb's head
  and upper body, then transitions gradually to transparent before the image's
  lower boundary.
- Retain a subtle dark atmospheric overlay only where it helps the portrait
  merge with the stage. The transparency mask, rather than a solid overlay,
  owns removal of the visible lower image edge.
- Keep the headline, body copy, buttons, cable line, and header layering above
  the portrait where required for legibility.
- Do not change the desktop portrait rules outside the mobile media query.
- Verify both the default and original color schemes because the mask must
  remain seamless against either theme.

### Mobile visual acceptance

At 375x844, 390x844, and the 767px mobile breakpoint boundary, in both the
default and original color schemes:

- Caleb's head is not clipped by the header or viewport edge.
- His face, microphone, hands, and upper torso remain visible.
- The portrait does not crowd or cover the eyebrow or headline.
- The lower body dissolves progressively into the hero; no horizontal image
  boundary, rectangular edge, or sudden tonal band is visible.
- The hero has no horizontal overflow and its existing calls to action remain
  usable.

At 768px, verify that the mobile-only positioning and mask no longer apply and
the adjacent desktop/tablet treatment remains unchanged in both color schemes.

## Alternatives considered

1. **Hidden synchronized mobile video for audio.** Rejected because it would
   download two videos, increase mobile/desktop bandwidth, complicate native
   controls, and risk playback drift.
2. **Separate audio element controlled by JavaScript.** Rejected because seeking,
   pause, volume, autoplay policy, accessibility, and error recovery would need
   a custom synchronization layer.
3. **Baked fade in a new hero bitmap.** Rejected because it would couple the
   fade to one background/color scheme and create another visual asset to
   maintain.
4. **Single muxed homepage derivative plus a CSS transparency mask.** Selected
   because each player uses one synchronized media file and the existing hero
   asset remains reusable across themes.

## Failure and fallback behavior

- If the new desktop derivative cannot be prepared or verified without visual
  alteration, retain the current production video and stop the release.
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
6. Verify output duration, dimensions, stream mapping, fast-start behavior,
   hashes, and visual-frame preservation.
7. Run targeted tests, the full unit suite, lint, typecheck, production build,
   and the repository's complete `npm run check` gate.
8. Browser-verify at 1440x900, 768px, 767px, 390x844, and 375x844. At both
   breakpoint-boundary widths, check the default and original color schemes.
   Confirm the selected media request, native playback controls, correct
   captions/transcript, mobile hero fade, desktop isolation, no broken assets,
   no framework overlay, no relevant console errors, and no horizontal
   overflow.

## Repository and release boundaries

- Preserve the user's existing modifications and untracked source/output files.
- Commit only the files created or changed for this approved work.
- Do not alter booking, commerce, staff access, control-plane, DNS, provider,
  or environment-variable behavior.
- Local implementation and verification do not authorize a GitHub push or
  Vercel production deployment. Those remain separate explicit release actions.
