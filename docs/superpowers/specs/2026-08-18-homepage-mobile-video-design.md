# Homepage Mobile Video Design

Date: 2026-08-18
Status: Approved for specification

## Goal

Use `Caleb (Pain Comes To Develop).mp4` as the homepage speaker video for mobile viewports while retaining the existing landscape speaker reel for tablet and desktop visitors. The change applies only to the homepage `WATCH CALEB SPEAK` section; the compact player on `/book-media` remains unchanged.

## Responsive contract

- Mobile: viewport width at or below 767px uses the new portrait clip.
- Tablet and desktop: viewport width at or above 768px uses the existing `caleb-speaker-reel-720.mp4` clip.
- A viewport crossing the breakpoint reloads the player with the correct complete media variant.
- The current poster, native controls, inline playback, and visual layout remain unchanged.
- The mobile browser must not preload the desktop reel before the responsive variant is known.

## Selected approach

Convert `AccessibleVideo` into a small client-side responsive player with an opt-in homepage mode. In homepage mode, the initial server render contains the poster and controls but no video source. After hydration, `matchMedia("(max-width: 767px)")` selects one complete variant containing its video, caption track, and transcript link. The `/book-media` use of `AccessibleVideo` does not opt in and retains the current desktop reel behavior.

This keeps the video, captions, and transcript synchronized and avoids downloading the large desktop reel on mobile. A no-JavaScript fallback retains access to the existing desktop reel and transcript.

## Alternatives considered

1. **Responsive `<source media>` elements:** smallest code change, but HTML video tracks cannot be selected by the same media query, which could expose incorrect desktop captions for the mobile clip. Rejected.
2. **Two video elements hidden with CSS:** permits separate caption tracks, but risks unnecessary media requests and duplicates the player markup. Rejected.
3. **Hydrated complete-variant selection:** adds a small client-side selector but preserves accessibility and prevents the wrong video from preloading. Selected.

## Media preparation

- Preserve the supplied source file unchanged at the repository root.
- Produce a web-optimized portrait derivative under `public/media/video/` using H.264 video and AAC audio.
- Target 720x1280 output, retain the original frame rate, and use a mobile-conscious bitrate so the 59.7 MB source is not delivered unchanged.
- Add a mobile-specific WebVTT caption file and plain-text transcript matching the new 46-second clip.
- Record the derivative and accessibility assets in `docs/media-manifest.md` with their source provenance.

## Component behavior

The homepage passes an explicit responsive-mobile-video option to `AccessibleVideo`. A video variant owns:

- video source
- caption source
- transcript source
- transcript label

The component listens for breakpoint changes and removes the listener on unmount. Changing variants replaces the `<video>` node so stale playback state and caption tracks cannot leak between sources.

## Failure and fallback behavior

- Before hydration, show the existing poster and controls without starting a media download.
- If `matchMedia` is unavailable, select the existing desktop reel.
- If JavaScript is disabled, expose the existing reel and transcript through a `<noscript>` fallback.
- If the optimized mobile asset cannot be loaded, the native video control displays its standard failure state and the transcript remains available.

## Test strategy

1. Add a failing component test proving that homepage mobile mode selects the new video, mobile captions, and mobile transcript.
2. Add a failing component test proving that desktop mode retains the existing reel, captions, and transcript.
3. Add a failing test proving `/book-media` remains on the existing reel.
4. Add a failing test proving breakpoint listener cleanup and variant switching.
5. Run the targeted tests, then the full lint, typecheck, unit-test, production-build, and Pages-export gates.
6. Browser-verify at 390x844 and 1440x900 that only the intended video is requested, controls work, captions are available, no images break, and no horizontal overflow appears.

## Publication boundary

Implementation and verification are authorized by the user's approval. Publishing the change to GitHub Pages remains a separate release action unless explicitly requested.
