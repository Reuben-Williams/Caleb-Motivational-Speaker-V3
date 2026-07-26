# Caleb Jakes V3 Fidelity Ledger

**Review gate:** Q1  
**Status:** Ready for owner review  
**Review date:** 2026-07-25  
**Accepted design source:** `stitch_caleb_jakes_pain_has_purpose (1)/stitch_caleb_jakes_pain_has_purpose/`  
**Implementation:** Next.js application in `V3`

## Comparison set

| Surface | Accepted reference | Latest implementation evidence | Result |
| --- | --- | --- | --- |
| Homepage, desktop hero | `caleb_jakes_enhanced_homepage_with_media_services/screen.png` | `C:\caleb-q1\home-1440-fold.png` | Pass. Preserves the black, warm-white, and gold palette; condensed headline; cinematic stage; subject cutout; cable motif; angular calls to action; and dense editorial authority rail. |
| Homepage, transformation story | Homepage reference story band | `C:\caleb-q1\home-section-story.png` | Pass. Preserves the warm-white editorial break, offset image treatment, oversized condensed heading, gold emphasis, and narrative hierarchy while using approved real media. |
| Homepage, audience pathways | Homepage reference service/pathway band | `C:\caleb-q1\home-section-audiences.png` | Pass in the running page. Uses the accepted dark modular grid and restrained gold labeling. Screenshot capture can include the fixed header when the full section is taller than the viewport. |
| Homepage, reel and message | Homepage reference media band | `C:\caleb-q1\home-section-reel.png` | Pass. Uses approved Caleb footage with accessible controls, captions, and transcript access rather than decorative placeholder media. |
| About | `about_caleb_jakes_the_story_behind_the_message/screen.png` | `C:\caleb-q1\about-1440-full.png` | Pass. Retains the documentary/editorial tone, asymmetrical media, high-contrast type, and gold cable language. |
| Speaking | `motivational_speaking_events_caleb_jakes/screen.png` | `C:\caleb-q1\speaking-1440-full.png` | Pass in the running page. Extends the accepted speaking concept into verified audience pathways, formats, process, and inquiry actions. |
| Booking | `connect_book_caleb_jakes/screen.png` | `C:\caleb-q1\book-caleb-1440-full.png` | Pass. Preserves the split editorial/form composition and adds the complete operational inquiry schema, consent, privacy link, provider security, and truthful failure handling. |
| Homepage, 390 px | Desktop homepage reference adapted through the approved mobile-first system | `C:\caleb-q1\home-390-fold.png` | Pass. One content tree reflows without horizontal overflow; the subject, message, navigation, and call to action retain their hierarchy. |
| Booking, 390 px | Booking reference adapted through the approved mobile-first system | `C:\caleb-q1\book-caleb-390-fold.png` | Pass. Contact alternatives precede the form, controls remain readable, and there is no horizontal overflow. |
| Homepage and booking, 320 px | Approved responsive behavior | `C:\caleb-q1\home-320-fold.png`; `C:\caleb-q1\book-caleb-320-fold.png` | Pass. No horizontal overflow; mobile navigation and form layout remain usable. |

## Behavior evidence

- All 11 public routes returned 200 with a unique title, visible H1, meaningful
  body content, no framework error overlay, and no horizontal overflow at the
  tested desktop width.
- Legacy routes resolve to the approved canonical destinations:
  `/motivational-speaking-events` to `/speaking`, `/contact` to `/book-caleb`,
  `/media` to `/book-media`, and `/about-caleb-jakes` to `/about`.
- Desktop audience navigation opens and closes with Escape. Mobile audience
  links are visible in the menu at both 390 px and 320 px.
- Homepage inquiry details survive the handoff to `/book-caleb?draft=1` and
  produce a visible restoration notice.
- The FAQ disclosure updates `aria-expanded` and reveals its associated answer.
- Reduced-motion preference selects the reduced capability mode and prevents
  the WebGL canvas from mounting.
- Production inquiry delivery is intentionally fail-closed without provider
  credentials. The tested failure remains on the form and presents direct
  phone and email alternatives.
- Accepted and duplicate-accepted inquiry paths, delivery state transitions,
  provider idempotency, and truthful thank-you rendering are covered by
  automated tests. A live accepted submission was not attempted because
  production provider credentials are intentionally absent from this checkout.

## Intentional deviations from the Stitch concept

1. Testimonials, client logos, pricing, audience counts, and outcome statistics
   are omitted because no approved evidence supports those claims.
2. The P.A.I.N. acronym is not expanded into invented definitions. The frozen
   design specification requires approved wording before that treatment is
   introduced.
3. The homepage is a fuller conversion journey than the compact Stitch concept:
   it adds evidence-backed audience routes, booking process, FAQ, inquiry handoff,
   media accessibility, and failure-safe conversion paths while preserving the
   accepted visual system.
4. The booking screen uses a complete organizer intake instead of the reference
   placeholder form. Submission does not imply date or engagement confirmation.
5. Motion and the restrained Three.js stage atmosphere are progressive
   enhancements. Mobile, coarse-pointer, reduced-motion, and constrained devices
   retain the same semantic content without the enhanced runtime.

## Q1 decision

The implementation is visually and behaviorally ready for owner review. Q1
remains pending until the project owner explicitly approves it.
