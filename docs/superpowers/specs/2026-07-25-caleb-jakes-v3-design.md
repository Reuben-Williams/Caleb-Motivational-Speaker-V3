# Caleb Jakes V3 Website Design Specification

**Date:** July 25, 2026  
**Status:** Approved design direction; ready for specification review  
**Project root:** `D:\Motivational Speaker Caleb\V3`

## 1. Objective

Build a production-oriented, cinematic, animated, conversion-focused website for Caleb Jakes and Joyionaire™ Enterprises. The primary conversion is a qualified speaking inquiry. The site must preserve the supplied Stitch template's strongest visual language while correcting its text collisions, incomplete responsive behavior, inaccessible interactions, unverified claims, and nonfunctional controls.

The initial release is a new Next.js App Router application located directly in `D:\Motivational Speaker Caleb\V3`. The supplied `D:\Motivational Speaker Caleb\V3\stitch_caleb_jakes_pain_has_purpose (1)\stitch_caleb_jakes_pain_has_purpose` directory remains unchanged as a design-reference archive. Source media outside `V3` is read-only; only reviewed derivatives are copied into the application.

## 2. Success Criteria

The release is successful when:

1. Every required route renders, has unique metadata, and uses the shared visual system.
2. `BOOK CALEB` remains the dominant action across desktop and mobile.
3. Real Caleb photography and footage are the human focal point.
4. No fabricated testimonial, client, award, engagement, statistic, endorsement, policy, or credential expansion is published.
5. The booking form validates on the client and server, reports genuine failures, and only redirects to `/thank-you` after the server accepts the inquiry.
6. Desktop, mobile, keyboard, reduced-motion, missing-media, and failed-submission states work without scroll traps, inaccessible controls, layout shifts, or console errors.
7. The rendered result is visually faithful to the approved Stitch references and passes direct screenshot comparison.

## 3. Approved Visual Direction

### 3.1 Design references

The reference root for every path in this subsection is:

`D:\Motivational Speaker Caleb\V3\stitch_caleb_jakes_pain_has_purpose (1)\stitch_caleb_jakes_pain_has_purpose`

The following supplied files are the accepted visual references:

- Homepage system and section rhythm: `motivational_speaking_events_caleb_jakes/screen.png`
- Preferred homepage hero and media treatment: `caleb_jakes_enhanced_homepage_with_media_services/screen.png`
- About-page editorial treatment: `about_caleb_jakes_the_story_behind_the_message/screen.png`
- Booking composition: `connect_book_caleb_jakes/screen.png`
- Tokens and component intent: `cinematic_authority/DESIGN.md`

The implementation preserves the references' ink-black foundation, Joy Gold transformation moments, cobalt authority accents, condensed display typography, sharp corners, ghost borders, editorial serif quotes, subtle grain, stage lighting, and microphone-cable motif. It does not preserve accidental text overlap, undersized mobile text, decorative badges without purpose, or unverified copy.

### 3.2 Design tokens

- Ink black: `#050505`
- Elevated surface: `#131313`
- Elevated surface high: `#201f1f`
- Warm ivory: `#FDFCF8`
- Muted ivory: `#D0C5AF`
- Joy Gold: `#D4AF37`
- Electric cobalt: `#2E5BFF`
- Deep burgundy: `#630D16`
- Display face: Bebas Neue
- UI and body face: Inter
- Reflective quote face: Source Serif 4
- Corners: square by default
- Desktop content maximum: 1280px
- Desktop gutter: 32–64px depending on viewport
- Mobile gutter: 20–24px

Fonts use pinned `next/font/google` families: `Bebas_Neue` weight 400, `Inter` weights 400/600/700, and `Source_Serif_4` weight 400 with normal and italic styles. The page reserves their metrics to avoid layout shift.

Responsive type values:

- Hero H1: `clamp(3rem, 9.375vw, 7.5rem)`, line-height `0.9`
- Primary section heading: `clamp(3rem, 5vw, 4rem)`, line-height `1`
- Secondary heading: `clamp(2rem, 3vw, 3rem)`, line-height `1.05`
- Large body: `1.125rem`, line-height `1.6`
- Standard body/control: `1rem`, line-height `1.6`
- Label: `0.75rem`, line-height `1`, letter-spacing `0.1em`

### 3.3 Visual progression

The homepage starts as a dark auditorium and opens toward warmer gold and brighter editorial surfaces as Caleb's story moves from pain to purpose. Cobalt identifies institutional credibility; burgundy appears only in emotionally weighty transitions and validation errors.

The animated cable is one shared SVG motif. It guides the eye between major sections, underlines selected phrases, and terminates at the final booking action. It never blocks text or focus targets.

## 4. Information Architecture

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Speaker-first conversion homepage | Book Caleb |
| `/about` | Caleb's verified transformation, calling, and Joyionaire mission | Start an inquiry |
| `/speaking` | Topics, formats, outcomes, and audience fit | Explore an audience or inquire |
| `/schools-colleges` | Schools and higher-education pathway | Bring Caleb to a campus |
| `/faith-events` | Churches and faith-community pathway | Invite Caleb |
| `/conferences-workshops` | Conferences, organizations, workshops, and leadership | Plan a keynote or workshop |
| `/book-media` | Book, authentic videos, podcast/media availability | Buy the book or request Caleb |
| `/faq` | Visible, supported booking answers | Start an inquiry |
| `/book-caleb` | Complete operational booking form | Submit inquiry |
| `/privacy` | Plain-language privacy policy for inquiry data | Contact Caleb |
| `/thank-you` | Confirm an accepted inquiry and explain next steps | Return home or call |

Legacy redirects:

- `/motivational-speaking-events` → `/speaking`
- `/contact` → `/book-caleb`
- `/media` → `/book-media`
- `/about-caleb-jakes` → `/about`

The navigation contains Home, About Caleb, Speaking, Audiences, Book & Media, FAQ, and Book Caleb. Audiences is an accessible menu containing Schools & Colleges, Churches & Faith Communities, and Conferences & Organizations. Leadership and male empowerment is represented within `/conferences-workshops` rather than creating an unrequested extra route.

## 5. Homepage Narrative

The homepage sequence and approved visible copy are:

1. Transparent navigation over a full-viewport cinematic hero:
   - Eyebrow: `MOTIVATIONAL SPEAKER • AUTHOR • TRANSFORMATIONAL LEADER`
   - H1: `PAIN HAS PURPOSE.`
   - Body: `Caleb Jakes turns struggles into strength and dreams into destiny through transformational keynotes, workshops, and faith-centered experiences built to move audiences from inspiration into action.`
   - Primary action: `BOOK CALEB`
   - Secondary action: `WATCH THE SPEAKER REEL`
   - Credential line: `IAPO Certified Motivational Speaker • RTF Deliverance Minister`
   - Location line: `Based in Rochester, NY • Available for engagements worldwide`
2. Compact verified authority strip:
   - `Six years of speaking experience`
   - `IAPO Certified Motivational Speaker`
   - `RTF Deliverance Minister`
   - `Published author`
   - `Founder of Joyionaire™ Enterprises`
   - `Available internationally`
3. Caleb's transformation story with desktop image sequencing and a normal mobile narrative:
   - Heading: `THE STORY BEHIND THE MESSAGE`
   - Body: `Caleb speaks from lived experience—faith, identity, resilience, fatherlessness, personal transformation, and the work of becoming whole. His story is not the destination of the message; it is the bridge that helps audiences recognize what change can look like in their own lives.`
   - Quote: `Pain is not a prison. It can become raw material for purpose.`
4. Scroll-driven audience pathway flip on desktop and vertical audience panels on mobile:
   - Schools & Colleges: `A practical message about resilience, identity, growth mindset, and purpose for students and campus communities.`
   - Churches & Faith Communities: `Scripture-grounded encouragement that connects faith, freedom, identity, and transformation.`
   - Conferences & Organizations: `Keynotes and workshops that turn lived experience into practical reflection, resilience, and purpose-centered action.`
   - Leadership & Male Empowerment: `Honest conversations about identity, accountability, faith, character, and legacy.`
5. Speaker reel reveal using the complete authentic V02 source rendition:
   - Heading: `THE MESSAGE IS MEANT TO BE FELT`
   - Accessible play label: `Play Caleb Jakes speaker reel`
6. Signature messages and topic selection:
   - `Pain Has Purpose`
   - `Turning Struggles Into Strength`
   - `Dreams Into Destiny`
   - `Identity and Purpose`
   - `Resilience and Growth Mindset`
   - `Faith, Freedom, and Transformation`
   - `Male Empowerment and Legacy`
   - `Leadership Through Adversity`
   - Every topic uses the same supported promise: `Caleb combines lived experience, reflection, and practical application to help audiences move from inspiration toward purposeful action.`
7. Organizer outcomes:
   - `Audiences are invited to feel seen rather than lectured.`
   - `Personal stories lead into practical reflection and action.`
   - `The message can be calibrated for secular or faith-based environments.`
   - `Programs can be shaped as keynotes, workshops, panels, or multi-session experiences.`
   - `Every inquiry begins with the audience and the organizer's event goals.`
8. Authentic book feature:
   - Title: `Shedding Pounds, Gaining Purpose: The Weighty Joy of Surrender`
   - Body: `Caleb's book connects his personal transformation with faith, surrender, identity, and the discovery of purpose.`
   - Primary action: `BUY THE BOOK`
   - Secondary action: `BOOK CALEB FOR A BOOK-BASED EVENT`
9. Engagement formats:
   - Keynote presentations
   - School and college assemblies
   - Faith-based events
   - Leadership seminars
   - Half-day workshops
   - Full-day workshops
   - Male-empowerment conferences
   - Multi-session programs
   - Panel appearances
   - Podcast and media appearances
   - Each format is described only by format, best-fit audience, customization conversation, and organizer preparation; no public price, guaranteed duration, or outcome is published.
10. Three-step booking process:
    - `Tell Us About Your Event` — `Share the audience, preferred date, location, format, and goals.`
    - `Plan the Right Experience` — `Caleb's team reviews the inquiry and follows up to discuss fit, availability, and the event.`
    - `Bring the Message to Your Audience` — `If the engagement moves forward, the experience is shaped around the room and the organizer's goals.`
11. Supported FAQ preview using the frozen answers in Section 7.2.
12. Abbreviated booking inquiry using the contract in Section 9.
13. Final booking statement and footer:
    - Heading: `YOUR AUDIENCE DOESN'T NEED ANOTHER SPEECH. THEY NEED A MESSAGE THEY CAN CARRY HOME.`
    - Body: `Bring Caleb Jakes to your school, church, conference, campus, or organization for an experience built around resilience, purpose, faith, and practical transformation.`
    - Primary action: `BOOK CALEB`
    - Secondary action: `CALL (404) 941-5670`

Testimonials and client/logo marquees are omitted because no approved testimonials or organization-logo set is present. The detailed P.A.I.N. acronym module is omitted from the initial release because approved definitions for all four letters are not available. The page still uses the verified “Pain Has Purpose” message and P-to-purpose visual transformation without assigning unapproved meanings to the letters.

## 6. Media Source of Truth

### 6.1 Authentic photography

Originals remain unchanged. The media preparation step copies or creates derivatives under `D:\Motivational Speaker Caleb\V3\public\media`; application components never import from outside `V3` or from the Stitch archive.

| ID | Exact source | SHA-256 | Production destination | Derivative rule |
|---|---|---|---|---|
| P01 | `D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02040.jpg` | `087ddc207ac7eb8dddf7679acd7295d5f46f6f45e85396b36822e4655c9f4e6f` | `public/media/photos/caleb-book-portrait.webp` | Color-correct and resize only; retain full original separately outside V3 |
| P02 | `D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02041.jpg` | `c1e947da61ef4cd3b11c022133d7257525be8a929e14ab65e7cd7f0f5e17924e` | `public/media/photos/caleb-book-wide-01.webp` | Crop only for declared responsive aspect ratios |
| P03 | `D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02046.jpg` | `80480eaa9f7eb7fbe0c1e14e2c99926a49514ae580e6cd6ccb5f8452f9866e96` | `public/media/photos/caleb-book-wide-02.webp` | Crop only for declared responsive aspect ratios |
| P04 | `D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02047.jpg` | `400f075f3827f8ba73ea86b60f40f7b7adfe904df48eece6805001e9dad25d1a` | `public/media/photos/caleb-book-wide-03.webp` | Crop only for declared responsive aspect ratios |
| P05 | `D:\Motivational Speaker Caleb\V3\stitch_caleb_jakes_pain_has_purpose (1)\stitch_caleb_jakes_pain_has_purpose\image_from_https_lirp.cdn_website.com_bb893d4e_dms3rep_multi_opt_screenshot_1\screen.png` | `f2361744dcf69b6c4698134291f557d00cd8e17999c96189f72a465580c2d774` | `public/media/photos/caleb-speaking-wide.webp` | Resize and color-correct; source archive remains unchanged |
| P06 | `D:\Motivational Speaker Caleb\V3\stitch_caleb_jakes_pain_has_purpose (1)\stitch_caleb_jakes_pain_has_purpose\image_from_https_lirp.cdn_website.com_bb893d4e_dms3rep_multi_opt_screenshot_2\screen.png` | `6f301e906338401a6821268a00a62974b9eab45e8a83ca3a4e81ef2671c15359` | `public/media/photos/caleb-speaking-mobile.webp` | Mobile crop; source archive remains unchanged |
| G01 | `D:\Motivational Speaker Caleb\V3\stitch_caleb_jakes_pain_has_purpose (1)\stitch_caleb_jakes_pain_has_purpose\cinematic_low_angle_wide_shot_of_a_dark_auditorium_stage_with_a_single_dramatic\screen.png` | `d521b57020036e1c283e251c01c831c8db723cd65efe703dd77c651457764a2e` | `public/media/backgrounds/stage-original.png` | Generated reference; use only after the media gate in Section 6.4 |

Book sources are frozen to the official-site assets below:

- B01 cover wrap source: `https://lirp.cdn-website.com/bb893d4e/dms3rep/multi/opt/Screenshot+2026-06-25+113851-1572w.png`
  - Expected SHA-256: `752e393197a0c561b25275cc33ea0f3b65474913a191eb7c21d9fc0cf47b5cea`
  - Frozen source destination: `media-sources/book/caleb-book-cover-wrap.png`
  - Front-cover derivative: `public/media/book/caleb-book-front.webp`
- B02 Amazon composition source: `https://lirp.cdn-website.com/bb893d4e/dms3rep/multi/opt/Screenshot+2026-06-25+113825-1572w.png`
  - Expected SHA-256: `b20870d547b197cee476219859dbb2a49e9613f658adbe3e3bc026ed04bba775`
  - Frozen source destination: `media-sources/book/caleb-book-amazon.png`
  - Production derivative: `public/media/book/caleb-book-amazon.webp`

Downloads must match the expected hashes. A mismatch blocks use until visually reviewed. The purple cocoon mockup at `a_high_quality_professional_3d_book_mockup_of_shedding_pounds_gaining_purpose/screen.png` is explicitly excluded.

### 6.2 Authentic video

To remove editorial ambiguity from the initial release, the homepage speaker reel is the complete, uncut V02 recording:

- Source: `D:\Motivational Speaker Caleb\Caleb Images and Videos\C4157-015.MP4`
- Source SHA-256: `3cf6bdd687781a9bece1f62cc83c70448f634b305a66c347d2ea6919d37d929d`
- Source duration: 3 minutes, 21.70 seconds
- Edit decision list: `00:00:00.000` through `00:03:21.700`, with no content cuts, reordered audio, generated transitions, or B-roll overlays
- Desktop rendition: `public/media/video/caleb-speaker-reel-1080.mp4`, H.264 High Profile, AAC stereo, 1920×1080, target 6–8 Mbps
- Mobile rendition: `public/media/video/caleb-speaker-reel-720.mp4`, H.264 Main Profile, AAC stereo, 1280×720, target 3–4 Mbps
- Poster: `public/media/video/caleb-speaker-reel-poster.webp`, 1920×1080 frame selected from `00:00:20.000`
- Captions: `public/media/video/caleb-speaker-reel.en.vtt`
- Transcript: `public/media/video/caleb-speaker-reel-transcript.txt`

The media gate requires the user to review the complete rendition, poster, captions, and transcript. Captions must match spoken words, speaker changes, and meaningful non-speech audio; the transcript must match the captions. The video is not wired into the interface before that review passes.

Other authentic files may be used as silent section B-roll only after their exact source segment is added to the final media manifest and approved. The initial application does not depend on that optional B-roll. The short `Caleb P in Pain.mp4` and `Caleb I in Pain.mp4` files may appear in the media library under their literal verified titles, but they are not used to infer the missing A or N definitions.

### 6.3 Higgsfield boundaries and deliverables

Approved Higgsfield work is limited to:

- H01: remove the background from P05 without generating or altering Caleb.
  - Input: exact P05 source above
  - Output: `media-review/higgsfield/H01-caleb-speaking-cutout.png`
  - Production derivative after approval: `public/media/people/caleb-speaking-cutout.webp`
- H02: extend G01 into a 2400×1350 desktop auditorium background.
  - Input: exact G01 source above
  - Output: `media-review/higgsfield/H02-stage-desktop.png`
  - Production derivative after approval: `public/media/backgrounds/stage-desktop.webp`
- H03: extend G01 into a 1600×2000 mobile auditorium background.
  - Input: exact G01 source above
  - Output: `media-review/higgsfield/H03-stage-mobile.png`
  - Production derivative after approval: `public/media/backgrounds/stage-mobile.webp`

Higgsfield may not generate Caleb's face or body, fabricate an audience or venue, create speaking footage, or imply an endorsement. Generated assets are labeled as generated in the final media manifest.

Acceptance criteria:

- H01 has a clean alpha edge at hair, hands, clothing, and microphone/podium boundaries, with no changed facial or body features.
- H02/H03 remain an empty, non-identifiable auditorium with no people, logos, signage, or venue-specific claims.
- All outputs preserve the ink-black/cool-cobalt base and leave safe negative space for code-native hero copy.
- Outputs contain no embedded website text.

### 6.4 Blocking media manifest gate

The canonical manifest is `D:\Motivational Speaker Caleb\V3\docs\media-manifest.md`. Each entry contains:

- stable media ID;
- exact source path or frozen URL;
- source SHA-256;
- output SHA-256 for every reviewed crop, rendition, poster, caption, transcript, generated output, and social image;
- authentic, edited, or generated classification;
- rights/approval status;
- output filename and dimensions;
- intended route/section;
- desktop/mobile use;
- alt text or decorative status;
- transformation performed;
- reviewer decision and date.

Before application scaffolding begins, the user reviews:

1. P01–P06 production derivatives;
2. B01/B02 frozen book artwork and front-cover crop;
3. the V02 desktop/mobile renditions, poster, captions, and transcript;
4. H01/H02/H03;
5. the completed manifest.

The user is the approval owner. Any rejected item is removed or regenerated and re-reviewed. No provisional media is wired into application components.

The manifest has an integer `revision` and a decision log. M1 approves revision 1 containing P01–P06 derivatives, book, video, and Higgsfield outputs. Social images created later produce revision 2 and require the M2 gate in Section 16. Application code may reference only outputs whose exact hashes appear in the latest approved revision.

## 7. Content Architecture

Editable copy and structured records live in a small content layer rather than inside animation components. The content layer contains:

- navigation and redirects;
- hero and authority facts;
- story chapters;
- audience pathways;
- speaking topics;
- engagement formats;
- organizer outcomes;
- book information and purchase link;
- videos and transcripts;
- FAQs;
- contact and social links;
- route metadata;
- JSON-LD inputs.

### 7.1 Evidence registry

`src/content/evidence.ts` records a source ID for every published factual claim. Copy records reference one or more evidence IDs, so a factual claim cannot be added without an explicit source.

| Evidence ID | Frozen source | Permitted claims |
|---|---|---|
| E01 | `C:\Users\Anoth\.codex\attachments\a96c2c60-e541-4355-bb40-cae56b30e322\pasted-text.txt`; SHA-256 `f970c4ac463fb83f971bbf96304231203ce033447045f2a6576928721392fb4e` | Brand message, intended audiences, route names, CTA labels, contact details, visual direction, proposed formats, booking fields, and approved organizer-focused wording |
| E02 | `D:\Motivational Speaker Caleb\V3\docs\evidence\official-home-2026-07-25.md`; SHA-256 `53e7a3290c4ca33253a00fcccdae5caa436700f128ab0a0b498f591bd20d70a9` | IAPO certification title, RTF minister title, six years of speaking experience, international availability, Rochester base, Joyionaire founded in 2023, schools/faith/conferences/organizations audience categories |
| E03 | `D:\Motivational Speaker Caleb\V3\docs\evidence\official-about-2026-07-25.md`; SHA-256 `763409ac2801b9d44258c8c2505a23f3555ee2b676db507a294ba8accb7b78b0` | Authorship, book title, book published at age 19, transformation themes, Joyionaire mission, supported speaking formats |
| E04 | `D:\Motivational Speaker Caleb\V3\docs\evidence\official-speaking-2026-07-25.md`; SHA-256 `3d458444275eb26f7af0fa2ef3e0567c21aa163db2baaa5795b6627d3ea199b0` | Keynotes, workshops, school/college, faith, growth mindset, male empowerment, leadership, multi-session, panel, and podcast/media availability |
| E05 | Local authentic media listed in Section 6 | Caleb's appearance in the specific photographed or recorded setting only |
| E06 | `https://www.amazon.com/Shedding-Pounds-Gaining-Purpose-Surrender/dp/B0D2YFGMJR`, reviewed July 25, 2026 | Purchase destination and verified book identity |

The implementation uses only the frozen copy in Section 5, Section 7.2, and the route copy below. It does not freely paraphrase the live websites during implementation. It uses `IAPO Certified Motivational Speaker` without expanding IAPO. It omits 24/7 availability, public pricing, travel-inclusion promises, response-window promises, and downloadable media-kit claims.

Supporting-route copy is frozen in Section 7.4. No implementer-selected excerpt or new factual paraphrase is permitted.

### 7.2 Frozen FAQ answers

Only these visible questions and answers are published:

1. **What audiences does Caleb speak to?**  
   Caleb's current speaking work is positioned for schools and colleges, churches and faith communities, conferences and organizations, leadership programs, male-empowerment events, and podcast or media conversations.
2. **Does Caleb speak at secular institutions?**  
   Yes. An inquiry can identify the institution, audience, and event goals so the proposed message can be discussed for that setting.
3. **Can the faith content be adjusted for the audience?**  
   Caleb serves both secular and faith-based settings. The inquiry should describe the audience and the desired role of faith content so fit can be discussed before an engagement is confirmed.
4. **Is Caleb available internationally?**  
   Caleb's current site states that he is available for international engagements. Availability, travel, and event requirements are confirmed through the inquiry process.
5. **What speaking formats are available?**  
   Supported formats include keynotes, school or college assemblies, faith events, leadership seminars, half-day or full-day workshops, male-empowerment conferences, multi-session programs, panels, and podcast or media appearances.
6. **Can a workshop be paired with a keynote?**  
   The current service range supports both keynotes and workshops. Use the inquiry to describe the desired combination so scope and fit can be discussed.
7. **How far in advance should an organization inquire?**  
   Inquire as early as the event allows. The website does not promise availability for any date until Caleb's team confirms it.
8. **What information is required for a quote?**  
   Provide the organization, audience, event type, preferred date or range, location or virtual format, estimated audience size, approximate program length, event goals, and any relevant budget context.
9. **Does Caleb participate in panels or podcasts?**  
   Yes. Panels and podcast or media appearances are included in the current service range.
10. **Are travel expenses included?**  
    The website does not publish an inclusion policy. Travel and event requirements are discussed before an engagement is confirmed.
11. **Is a speaker one-sheet or media kit available?**  
    No public download is offered in this release. Organizers can request speaker information through the booking form.

### 7.3 Frozen privacy disclosure

The privacy page states:

`When you submit a speaking inquiry, Joyionaire™ Enterprises uses the information to evaluate and respond to your request. The website does not store inquiry details in its own application database in this release. Information is transmitted through form-security, rate-limiting, and email-delivery providers and may remain in Caleb's business email system or those providers' operational records under their respective policies. Do not include sensitive personal, medical, financial, or student information. Inquiry information is not sold through this website. To ask about an inquiry or the information you submitted, contact info@calebjakes.com or call (404) 941-5670.`

The form links to this disclosure beside consent. Provider names are added to the policy only after the production provider configuration is known. Until then, the generic provider categories above are the approved wording.

Consent label:

`I have read the Privacy Policy and consent to Joyionaire™ Enterprises using my information to evaluate and respond to this inquiry.`

### 7.4 Frozen supporting-route copy

#### `/about`

- H1: `FROM THE STRUGGLE TO THE CALLING.`
- Intro: `Caleb Jakes is an IAPO Certified Motivational Speaker, RTF Deliverance Minister, author, and founder of Joyionaire™ Enterprises. His message connects lived experience, faith, identity, resilience, and practical transformation.`
- `THE STRUGGLE`: `Caleb speaks honestly about fatherlessness, weight loss, personal battles, identity, and the seasons that tested his faith and sense of purpose.`
- `THE TRANSFORMATION`: `Faith, surrender, discipline, and the work of becoming whole reshaped how Caleb understood strength, joy, and purpose.`
- `THE CALLING`: `Speaking became a way to help students, leaders, churches, and organizations recognize that struggle does not have to be the final word in their story.`
- `THE MISSION BEHIND JOYIONAIRE™`: `Joyionaire™ Enterprises is built around a different picture of wealth—being rich in joy, faith, character, purpose, and the strength to keep standing when life becomes heavy.`
- CTA: `START A SPEAKING INQUIRY`

#### `/speaking`

- H1: `A MESSAGE SHAPED FOR THE ROOM.`
- Intro: `Caleb delivers keynotes, workshops, faith events, school and college programs, leadership sessions, panels, and media conversations. Every inquiry begins with the audience, event setting, and organizer's goals.`
- Topics, audiences, outcomes, and format titles use the exact Section 5 copy.
- Closing: `Final content, timing, faith emphasis, and format are discussed before an engagement is confirmed.`
- CTA: `REQUEST SPEAKER INFORMATION`

#### `/schools-colleges`

- H1: `HELP STUDENTS TURN PRESSURE INTO PURPOSE.`
- Intro: `Caleb brings a practical message about resilience, identity, growth mindset, and purpose to school and college communities.`
- Organizer note: `Use the inquiry to describe the age group, setting, event goals, preferred format, and any faith-content requirements.`
- CTA: `BRING CALEB TO YOUR CAMPUS`

#### `/faith-events`

- H1: `FAITH THAT MEETS PEOPLE IN REAL LIFE.`
- Intro: `Caleb connects Scripture-grounded encouragement with honest conversations about identity, freedom, resilience, surrender, and transformation.`
- Organizer note: `Use the inquiry to describe the congregation or community, event setting, desired faith emphasis, and preferred format.`
- CTA: `INVITE CALEB TO YOUR CHURCH`

#### `/conferences-workshops`

- H1: `MOVE FROM INSPIRATION INTO ACTION.`
- Intro: `Caleb offers keynotes, workshops, leadership sessions, panels, and male-empowerment conversations for conferences and organizations.`
- Organizer note: `Use the inquiry to describe the audience, event theme, desired level of interaction, program length, and goals.`
- CTA: `PLAN A KEYNOTE OR WORKSHOP`

#### `/book-media`

- H1: `THE MESSAGE BEYOND THE STAGE.`
- Intro: `Explore Caleb's book and approved speaking footage, or request Caleb for a podcast, panel, interview, or book-centered event.`
- Book title and body use the exact Section 5 copy.
- Reel heading: `WATCH CALEB SPEAK`
- Book CTA: `BUY THE BOOK`
- Media CTA: `REQUEST CALEB FOR MEDIA`

#### `/faq`

- H1: `BOOKING QUESTIONS, CLEAR ANSWERS.`
- Intro: `These answers explain the information currently available on formats, audiences, travel, and the inquiry process.`
- Questions and answers use Section 7.2 verbatim.
- CTA: `START YOUR INQUIRY`

#### `/book-caleb`

- H1: `LET'S START THE CONVERSATION.`
- Intro: `Share the event details, audience, preferred date, and goals. Submitting an inquiry does not confirm an engagement or date.`
- Submit label: `SUBMIT SPEAKING INQUIRY`
- Pending label: `SUBMITTING INQUIRY…`
- Contact alternative: `Prefer to speak directly? Call (404) 941-5670 or email info@calebjakes.com.`

### 7.5 Engagement-format descriptions

| Format | Frozen description |
|---|---|
| Keynote presentations | `A focused message shaped around the event audience, theme, and desired emphasis.` |
| School and college assemblies | `A student-centered program discussed around age group, setting, goals, and available time.` |
| Faith-based events | `A Scripture-grounded experience discussed around the community, occasion, and desired faith emphasis.` |
| Leadership seminars | `A facilitated session connecting resilience, identity, character, purpose, and leadership.` |
| Half-day workshops | `An extended interactive format with room for reflection, discussion, and practical application.` |
| Full-day workshops | `A longer facilitated format whose agenda and breaks are planned with the organizer.` |
| Male-empowerment conferences | `A purpose-centered conversation about identity, accountability, faith, character, and legacy.` |
| Multi-session programs | `More than one session planned around a shared audience or event goal.` |
| Panel appearances | `Participation in a moderated conversation aligned with Caleb's supported themes.` |
| Podcast and media appearances | `An interview or conversation about faith, identity, resilience, transformation, purpose, and the book.` |

### 7.6 Frozen route metadata

| Route | Title | Description |
|---|---|---|
| `/` | `Caleb Jakes | Motivational Speaker & Author` | `Book Caleb Jakes for schools, colleges, faith events, conferences, leadership programs, workshops, panels, and media conversations.` |
| `/about` | `About Caleb Jakes | Pain Has Purpose` | `Learn about Caleb Jakes, Joyionaire™ Enterprises, his transformation story, faith, authorship, and purpose-driven speaking mission.` |
| `/speaking` | `Speaking Topics & Formats | Caleb Jakes` | `Explore Caleb Jakes keynotes, workshops, school programs, faith events, leadership sessions, panels, and media appearances.` |
| `/schools-colleges` | `School & College Speaker | Caleb Jakes` | `Explore resilience, identity, growth mindset, and purpose programs for school and college communities.` |
| `/faith-events` | `Church & Faith Event Speaker | Caleb Jakes` | `Explore Scripture-grounded speaking for churches, faith communities, ministry events, and conferences.` |
| `/conferences-workshops` | `Conference Keynotes & Workshops | Caleb Jakes` | `Explore keynotes, workshops, leadership sessions, and male-empowerment conversations for conferences and organizations.` |
| `/book-media` | `Book & Media | Caleb Jakes` | `Explore Caleb Jakes's book, approved speaking footage, podcast availability, panels, and media conversations.` |
| `/faq` | `Speaking FAQ | Caleb Jakes` | `Read current answers about audiences, formats, travel, timing, media appearances, and the booking process.` |
| `/book-caleb` | `Book Caleb Jakes | Speaking Inquiry` | `Share your event, audience, preferred date, location, format, and goals with Caleb Jakes and Joyionaire™ Enterprises.` |
| `/privacy` | `Privacy Policy | Joyionaire™ Enterprises` | `Learn how speaking-inquiry information is transmitted and used by the Caleb Jakes website.` |
| `/thank-you` | `Speaking Inquiry | Caleb Jakes` | `Continue the Caleb Jakes speaking-inquiry experience.` |

Contact source of truth:

- Phone: `(404) 941-5670`
- Email: `info@calebjakes.com`
- Base: Rochester, New York
- Facebook: `https://www.facebook.com/caleb.jakes.7/`
- Instagram: `https://www.instagram.com/therealcaleb.j/`
- Book: `https://www.amazon.com/Shedding-Pounds-Gaining-Purpose-Surrender/dp/B0D2YFGMJR`

## 8. Component Boundaries

### 8.1 Shared shell

`SiteHeader`, `AudienceMenu`, `MobileMenu`, `MobileBookingBar`, `CableMotif`, and `SiteFooter` own global navigation and chrome. They depend only on navigation/contact content and route state.

### 8.2 Reusable content primitives

`PageHero`, `SectionHeading`, `GoldButton`, `OutlineButton`, `MediaFrame`, `QuoteBlock`, `TopicCard`, `AudiencePanel`, `FormatRow`, `ProcessStep`, `FaqList`, and `Breadcrumbs` own repeated presentation and accessibility behavior. Differences are explicit variants.

### 8.3 Homepage experiences

- `CinematicHero` composes real imagery, the stage environment, code-native text, and the hero timeline.
- `StageAtmosphere` owns the restrained Three.js canvas and its fallback.
- `StorySequence` owns desktop chapter activation and mobile static ordering.
- `AudiencePathways` renders one semantic list of audience panels for every capability. `AudienceFlipEnhancer` registers GSAP transforms against those existing panels on eligible desktop devices; without enhancement the same markup remains a vertical list.
- `SpeakerReelReveal` owns the pinned visual expansion but delegates playback to `AccessibleVideo`.
- `SignatureTopics` owns topic selection and inquiry deep links.
- `BookFeature` owns the authentic book presentation.
- `BookingPreview` owns the abbreviated form.

Animation components consume content and refs; they do not contain business copy. GSAP owns pinned and scrubbed sequences. Framer Motion owns navigation, buttons, cards, disclosure states, and entrance transitions. The two systems never write the same transform property on the same element.

`MotionRuntime` is the sole owner of viewport capability, live motion preference, tab visibility, and route lifecycle. `SmoothScrollProvider` is the sole owner of Lenis and the ScrollTrigger synchronization loop. `CableController` is the sole owner of the cross-section cable path. Feature modules register timelines through these owners and return cleanup functions; they do not create their own global resize, scroll, visibility, or motion-preference listeners.

### 8.4 Booking domain

`BookingForm`, `bookingSchema`, and the `/api/inquiries` route form a separate booking unit:

- `BookingForm` owns form state, accessible errors, and status announcements.
- `bookingSchema` is shared by client and server validation.
- `/api/inquiries` performs server validation, spam verification, rate limiting, delivery, and a typed response.
- An email adapter isolates Resend so delivery can be replaced without changing the form.
- A rate-limit/idempotency adapter isolates the durable key store so the form and delivery logic remain independent of a specific provider.

## 9. Booking Flow and Failure Behavior

### 9.1 Complete form contract

| Field | Type | Required | Contract |
|---|---|---:|---|
| `fullName` | text | Yes | 2–100 characters |
| `workEmail` | email | Yes | valid email, maximum 254 characters |
| `phone` | tel | Yes | 7–30 characters; digits plus common phone punctuation |
| `organization` | text | Yes | 2–150 characters |
| `roleTitle` | text | Yes | 2–100 characters |
| `audienceType` | enum | Yes | `schools-colleges`, `faith-community`, `conference-organization`, `leadership-male-empowerment`, `podcast-media`, `other` |
| `audienceTypeOther` | text | Conditional | required when audience type is `other`; 2–100 characters |
| `eventType` | enum | Yes | `keynote`, `assembly`, `faith-event`, `leadership-seminar`, `half-day-workshop`, `full-day-workshop`, `male-empowerment-event`, `multi-session`, `panel`, `podcast-media`, `other` |
| `eventTypeOther` | text | Conditional | required when event type is `other`; 2–100 characters |
| `preferredDateStart` | date | Yes | ISO date; current date or later in `America/New_York` |
| `preferredDateEnd` | date | No | ISO date; not earlier than start |
| `estimatedAudienceSize` | integer | Yes | 1–1,000,000 |
| `eventLocation` | text | Yes | 2–180 characters; city/region/country or virtual platform context |
| `attendanceMode` | enum | Yes | `in-person`, `virtual`, `hybrid` |
| `programLength` | enum | Yes | `under-45-min`, `45-60-min`, `60-90-min`, `half-day`, `full-day`, `multi-session`, `not-sure` |
| `eventGoals` | textarea | Yes | 20–2,000 characters |
| `budgetRange` | enum | No | `under-2500`, `2500-4999`, `5000-9999`, `10000-plus`, `not-sure`, `prefer-not-to-say` |
| `referralSource` | enum | Yes | `search`, `social`, `referral`, `event`, `podcast-media`, `other` |
| `referralSourceOther` | text | Conditional | required when referral source is `other`; 2–100 characters |
| `additionalDetails` | textarea | No | maximum 3,000 characters |
| `consent` | checkbox | Yes | must be true; label links to `/privacy` |
| `turnstileToken` | hidden token | Production | required and verified in production |
| `utm` | server-normalized metadata | No | allowlisted source, medium, campaign, term, content values; each maximum 100 characters |
| `referrerPath` | hidden metadata | No | same-origin path only; maximum 200 characters |

Each invalid field uses `Please enter...`, `Please choose...`, or an explicit range message. The top error summary links to invalid fields. Dates and sizes use locale-friendly controls but submit normalized ISO/integer values.

The abbreviated homepage form captures `fullName`, `workEmail`, `organization`, `audienceType`, `preferredDateStart`, optional `preferredDateEnd`, and `eventGoals`.

### 9.2 Abbreviated-form handoff

On `Continue booking`, the client validates the abbreviated fields and stores a versioned JSON object under `sessionStorage["caleb-booking-draft:v1"]`, then navigates to `/book-caleb`. Free text and contact data never enter query parameters, URLs, analytics, logs, or page metadata. The full form reads the draft once on mount, retains it for back navigation and reloads for up to 24 hours, and clears it only after an accepted inquiry or explicit `Clear form`. If storage is unavailable, navigation still works and the full form opens empty.

Draft restoration is non-blocking:

- malformed JSON or a schema-invalid draft is removed and shows `We couldn't restore your saved details. Please continue with the form below.`;
- an unsupported version is removed and shows the same restore message;
- a draft older than 24 hours is removed and shows `Your saved booking draft expired. Please continue with the form below.`;
- a storage read exception leaves the form empty and shows `Saved details are unavailable in this browser. You can still complete the form below.`;
- every condition renders the full form immediately, focuses no error automatically, and cannot prevent manual entry or submission.

Server flow:

1. Reject malformed or oversized requests.
2. Validate with Zod.
3. Require and verify Turnstile in production; use only the documented test configuration in local and automated-test environments.
4. Enforce a conservative IP/email rate limit through an adapter.
5. Reserve an idempotency record.
6. Send the business notification.
7. Mark business delivery accepted.
8. Attempt the organizer confirmation.
9. Return an accepted response. The client owns navigation to `/thank-you`.

The inquiry is accepted once the business notification succeeds. If the organizer confirmation fails afterward, the API still returns accepted with `confirmationEmailSent: false`; the thank-you page states that the inquiry was received but a confirmation email could not be sent. The idempotency record prevents a retry from sending a duplicate business notification and allows the confirmation send to be retried independently.

If required delivery, Turnstile, or durable rate-limit/idempotency configuration is absent in production, the API returns a service-configuration error. If spam verification, rate limiting, or business delivery fails, the user remains on the form with a specific accessible error and phone/email alternatives. No failure path redirects to `/thank-you`.

Secrets are read only on the server. `.env.example` documents names without fake or real secret values.

### 9.3 HTTP API contract

- Endpoint: `POST /api/inquiries`
- Encoding: `application/json`
- Maximum body size: 32 KiB; larger requests return `413`
- Success: `202` with `{ status: "accepted", inquiryId: string, confirmationEmailSent: boolean }`
- Validation: `400` with `{ status: "error", code: "validation_failed", fieldErrors: Record<string, string[]>, formError: string }`
- Spam failure: `400` with code `spam_verification_failed`
- Duplicate accepted payload: `200` with the original accepted response; no duplicate business notification
- Identical payload still processing: `409` with code `inquiry_processing` and `Retry-After: 5`
- Rate limit: `429` with code `rate_limited` and a whole-second `Retry-After` header
- Missing production configuration: `503` with code `service_unavailable`
- Business delivery failure: `502` with code `delivery_failed`
- Unsupported content type: `415`
- Oversized body: `413`
- Unexpected error: `500` with a generic message and a server-only correlation ID

Field errors never include raw provider messages. Form errors include the click-to-call and email alternatives. The client redirects only after a `200` duplicate-accepted or `202` accepted response.

The JavaScript booking experience is operational. Without JavaScript, the page displays all contact details and a `noscript` explanation that online submission requires JavaScript; it does not claim that the form itself submitted.

### 9.4 Spam, rate-limit, and idempotency policy

- Turnstile is fail-closed in production and uses Cloudflare's documented test key only in automated/local tests.
- Production trusts a client-IP header only when the deployment adapter declares that proxy header. Otherwise, the IP component is omitted rather than trusting arbitrary `X-Forwarded-For`.
- Rate keys use an HMAC of normalized email plus the trusted IP when available; raw email/IP values are not stored in the key store.
- Limits: 5 attempts per 15 minutes and 20 attempts per 24 hours per composite key.
- `Retry-After` reflects the active window.
- Production uses Upstash Redis through `@upstash/redis`, configured by server-only REST URL and token variables. Missing durable configuration is fail-closed with `503`.
- The adapter exposes atomic operations: `incrementRateKey(key, windowSeconds, limit)`, `reserveInquiry(key, inquiryId, ttlSeconds)`, `readInquiry(key)`, `markBusinessDelivered(key)`, `markBusinessFailed(key)`, `acquireConfirmationRetry(key, ttlSeconds)`, and `markConfirmationSent(key)`. Reservation and state-transition operations use atomic Redis `SET NX` or Lua/EVAL compare-and-set semantics; a read followed by an unguarded write is not permitted.
- Idempotency uses an HMAC of a canonical JSON object containing these normalized fields in fixed key order: `fullName`, `workEmail`, `phone`, `organization`, `roleTitle`, `audienceType`, `audienceTypeOther`, `eventType`, `eventTypeOther`, `preferredDateStart`, `preferredDateEnd`, `estimatedAudienceSize`, `eventLocation`, `attendanceMode`, `programLength`, `eventGoals`, `budgetRange`, `referralSource`, `referralSourceOther`, `additionalDetails`, `consent`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`, and `referrerPath`.
- `turnstileToken`, timestamps, IP information, request headers, inquiry ID, and provider response metadata are excluded from the idempotency HMAC and from rendered email payloads.
- A newly reserved record has state `processing` and a 15-minute reservation TTL. An identical request while this state is active returns `409` with code `inquiry_processing` and `Retry-After: 5`; the client keeps form values and offers a retry after the interval.
- A failed business delivery atomically changes the record to `business_failed`, allowing the next identical request to acquire a new processing reservation immediately. It does not wait for the original 15-minute TTL.
- A business-delivered record has state `accepted`, remains for 24 hours, and prevents duplicate business notification.
- If an accepted duplicate has `confirmationEmailSent: false`, that duplicate request may acquire a five-minute confirmation-retry lock, attempt the organizer email once, update the flag on success, and return the accepted response. There is no background job and no unbounded automatic retry.
- No complete inquiry payload is persisted in the rate-limit/idempotency store.

### 9.5 Email delivery

The public inquiry ID is deterministic for the canonical payload: `CJ-` plus the first 12 uppercase hexadecimal characters of its HMAC.

The business email subject is `Speaking inquiry <inquiryId> — <organization>`. Its rendered payload contains, in fixed order: inquiry ID; every normalized business field enumerated in the canonical HMAC; the five normalized UTM values; normalized same-origin referrer path; phone/email reply links; and the frozen privacy/contact footer. It contains no generated timestamp, IP address, Turnstile token, request header, or provider response metadata.

The organizer email subject is `We received your Caleb Jakes speaking inquiry — <inquiryId>`. Its rendered payload contains, in fixed order: inquiry ID; full name; organization; audience type; event type; preferred date range; event location; attendance mode; program length; event goals; Caleb's phone/email; and a no-response-time-guarantee statement. It contains no UTM/referrer data, budget, additional details, token, timestamp, IP, request header, or provider metadata. Provider failures are logged without full free-text form fields.

Every Resend call uses provider-level idempotency in addition to Redis state:

- Business notification key: `business-inquiry/<first-48-hex-characters-of-canonical-payload-hmac>`
- Organizer confirmation key: `organizer-confirmation/<first-48-hex-characters-of-canonical-payload-hmac>`

These stable keys do not depend on a generated inquiry ID or request attempt. If Resend accepts a message but the server times out before the Redis state transition, the next retry uses the identical provider key and receives Resend's original result without sending a duplicate. The payload for a reused key must remain byte-equivalent after canonical rendering; a payload change creates a new canonical business HMAC. Provider concurrent-idempotency errors map to `409 inquiry_processing` with `Retry-After: 5`.

Client and server date validation both use `America/New_York` to determine the current calendar date, preventing disagreement around midnight.

### 9.6 Thank-you route

After an accepted response, the client stores `{ inquiryId, confirmationEmailSent, acceptedAt }` in session storage and navigates to `/thank-you`.

- With accepted state: heading `YOUR INQUIRY HAS BEEN RECEIVED.` The page shows the inquiry ID and says `Caleb's team will review the event details and follow up using the contact information you provided.` It makes no response-time promise.
- When `confirmationEmailSent` is false: add `Your inquiry was received, but we could not send a confirmation email. Save the inquiry ID or contact info@calebjakes.com if you need assistance.`
- Direct access without accepted state: heading `READY TO START THE CONVERSATION?` and links to `/book-caleb`, phone, and email. It never claims an inquiry was accepted.
- The route is `noindex`.

## 10. Motion, 3D, and Accessibility

Lenis and ScrollTrigger share one synchronized scroll loop. Pinned sequences calculate their height from viewport-safe values and release cleanly. They never trap touch scrolling.

The Three.js scene uses a stage plane, spotlight cone, fog, a low particle count, and thin word planes. It caps device pixel ratio, pauses when offscreen or the tab is hidden, and is dynamically loaded after the hero's critical image and text. Mobile uses a static stage image plus lightweight CSS light movement. No WebGL is required for comprehension or navigation.

Reduced motion:

- disables Lenis interpolation;
- removes pinning and scrubbed transforms;
- renders the hero in its final readable state;
- converts the audience flip to stacked panels;
- converts the reel reveal to a normal video block;
- disables cursor, magnetic movement, parallax, particles, tilt, and cable drawing.

The site includes a skip link, semantic landmarks, visible focus styles, keyboard menus, Escape handling, touch-sized controls, real labels, an error summary, descriptive alternative text, captions, transcripts, and no autoplay audio. The custom cursor is desktop-pointer enhancement only; the system cursor remains available.

### 10.1 Capability matrix

Capability precedence is evaluated in this exact order: reduced motion → mobile width below 768px → tablet width 768–1023px or coarse pointer → enhanced desktop. Only the first matching mode applies.

| Capability | Desktop ≥1024px, fine pointer, full motion | Tablet 768–1023px or coarse pointer | Mobile <768px | Reduced motion at any size |
|---|---|---|---|---|
| Smooth scroll | Lenis | Native scroll | Native scroll | Native scroll |
| Hero | text/portrait timeline and restrained parallax | short opacity/clip reveal | static final composition with short opacity reveal | static final composition |
| Story | pinned chapter/image sequence | normal stacked editorial sections | normal stacked editorial sections | normal stacked editorial sections |
| Audience | pinned Y-rotation | vertical panels | vertical panels | vertical panels |
| Reel | pinned expansion | normal video block | normal video block | normal video block |
| Topic cards | pointer tilt plus focus state | focus/press state only | focus/press state only | no tilt |
| Three.js | dynamic canvas when WebGL succeeds | static stage image | static stage image | static stage image |
| Cable | scroll-drawn SVG | short section-local SVG | static separators | static separators |
| Custom cursor/magnetic CTA | fine pointer only | off | off | off |

The server renders one semantic content tree in its static/mobile-safe state. Enhanced desktop motion attaches after hydration only when the capability query matches; separate desktop/mobile DOM copies are not rendered. This prevents duplicate controls and accessibility-tree duplication.

`MotionRuntime` uses `matchMedia` listeners for breakpoint and `prefers-reduced-motion` changes. A live change tears down every registered GSAP context, ScrollTrigger, Lenis instance, pointer listener, and Three.js renderer before applying the new mode. Route changes perform the same teardown. Focused elements are never inside a transform that is removed without first preserving focus.

## 11. SEO and Structured Data

The production origin is the user-specified `https://www.calebjakesspeaks.com`. Next metadata uses this as `metadataBase`. Preview deployments set `NEXT_PUBLIC_SITE_URL`; if the value is missing or invalid outside production, preview pages use relative metadata where supported and are marked `noindex` rather than inventing an origin.

Every route defines unique title, description, canonical URL, Open Graph data, and social image. The application supplies `sitemap.xml`, `robots.txt`, breadcrumbs on supporting routes, and the approved redirects.

Approved social-image outputs:

- Homepage: `public/og/home.jpg`, 1200×630, using approved P05 or H01 plus code-rendered `PAIN HAS PURPOSE.`
- Speaking: `public/og/speaking.jpg`, 1200×630, using approved P05 and the code-rendered title `SPEAKING`
- Book/media: `public/og/book-media.jpg`, 1200×630, using approved B01 and the exact book title

These images are generated locally from approved media after M1 and are added with output hashes to manifest revision 2. M2 approves them before metadata references them. If the homepage image itself does not pass M2, every route omits the Open Graph image property until an image is approved. After the homepage image passes, a rejected route-specific image falls back to that approved homepage image.

Structured data is generated from the shared content layer:

- Person for Caleb Jakes;
- Organization for Joyionaire™ Enterprises;
- Service for speaking formats;
- Book for the verified title and purchase link;
- VideoObject only for published media with known metadata;
- FAQPage only where the same questions and answers are visible;
- BreadcrumbList on supporting pages.

No structured-data field contains an unverified rating, price, review count, award, or client.

## 12. Analytics

Analytics is a typed adapter with a no-op implementation in the initial release. Its event-name union covers booking CTA, phone, email, reel play/completion, audience selection, topic selection, form start, accepted form submission, book purchase, and outbound social clicks. Connecting a provider is a separate approval and does not change feature components.

No advertising tracker, fingerprinting script, or provider is loaded by default. Analytics failure never blocks navigation, video, or form submission.

## 13. Performance

- Use `next/image` for local production photography and explicit aspect ratios.
- Preload only the true hero image and critical fonts.
- Convert photography to responsive AVIF/WebP while retaining original sources.
- Produce 1080p and mobile video renditions plus a poster; do not ship raw multi-gigabyte masters.
- Dynamically load Three.js, GSAP section modules, and the video player when their sections approach the viewport.
- Pause video, WebGL, and decorative animation when hidden or offscreen.
- Keep below-the-fold sections eligible for `content-visibility`.
- Avoid unnecessary icon, animation, analytics, and form libraries.

## 14. Error and Edge Cases

- Missing hero image: preserve readable hero text against the stage fallback.
- Missing video: show the poster, transcript, and a clear unavailable message.
- Failed video playback: retain native controls and transcript.
- Long copy: containers expand without fixed-height clipping.
- Small screens: no pinned sections, horizontal overflow, or transformed focus targets.
- Large screens: content remains inside the 1280px editorial grid while media may bleed intentionally.
- No JavaScript: core content, links, fields, privacy text, and contact alternatives remain readable; the `noscript` notice accurately says online submission requires JavaScript.
- Form configuration or network failure: keep entered values and expose phone/email alternatives.
- Repeated submission: disable while pending and make the server idempotent for an accepted inquiry window.
- Unsupported WebGL: render the stage image without a console error.

## 15. Verification

### 15.1 Automated checks

- TypeScript typecheck
- ESLint
- production build
- content/route-link validation
- unit tests for shared schemas and content-derived metadata
- API tests for valid, invalid, rate-limited, spam-failed, unconfigured, and delivery-failed requests
- state-machine tests for an identical request while `processing`, immediate retry after `business_failed`, a lost HTTP response after Resend accepted business delivery, provider idempotency replay, accepted duplicates, organizer-confirmation retry locking, and failures between every send/state-transition pair
- component tests for menus, FAQ disclosure, form errors, and reduced-motion rendering
- booking-draft tests for valid, malformed, expired, unsupported-version, storage-unavailable, cleared, and accepted drafts

### 15.2 Browser checks

Use the in-app browser first and verify:

- desktop homepage and every route;
- mobile layout at 390×844 and a small 320px width;
- keyboard-only navigation and dropdown behavior;
- reduced-motion mode;
- hero, story, audience, reel, topic, book, and booking interactions;
- booking success only against a controlled successful adapter;
- real failure against an unavailable adapter;
- old-route redirects;
- missing-image and missing-video fallbacks;
- no horizontal overflow, console errors, or hydration errors.

### 15.3 Visual fidelity

Reference dimensions:

- Preferred mobile homepage: `caleb_jakes_enhanced_homepage_with_media_services/screen.png` at 405×1600
- Speaking/desktop section reference: `motivational_speaking_events_caleb_jakes/screen.png` at 1280×3942
- About reference: `about_caleb_jakes_the_story_behind_the_message/screen.png` at 495×1600
- Booking reference: `connect_book_caleb_jakes/screen.png` at 1567×1600

The reference files are design boards, not browser viewport screenshots. Comparison therefore uses named section bands at each board's native pixel dimensions:

- Mobile homepage: hero `y=0–360`, story/media `y=360–835`, offers `y=835–1110`, video `y=1110–1450`, footer `y=1450–1600`
- Speaking board: hero `y=0–980`, audiences `y=980–1710`, topics `y=1710–2480`, CTA `y=2480–3260`, footer `y=3260–3942`
- About board: origin hero `y=0–395`, authority `y=395–750`, Joyionaire `y=750–1125`, quote `y=1125–1350`, footer `y=1350–1600`
- Booking board: navigation `y=0–130`, contact/form `y=130–1080`, footer `y=1080–1600`

Implementation captures:

- full-page desktop at 1440 CSS px wide and 1280 CSS px wide;
- full-page mobile at 405 CSS px, 390 CSS px, and 320 CSS px wide;
- one additional viewport-only first-fold capture at 1440×1000 and 390×844;
- one section-only screenshot per named reference band, captured from the matching DOM section at the board's native CSS width.

Section comparisons align by semantic section name, not by scaling the entire implementation into the board height. Each ledger row names the reference file and `y` band, implementation route and section selector, capture width, and evidence screenshot path.

The user is the final visual approval owner. Before handoff, direct `view_image` comparison must confirm:

- exact approved visible copy and section order;
- no text or control overlap at any capture size;
- headline scale and line breaks preserve the reference hierarchy; computed CSS values must equal the explicit responsive type tokens in Section 3.2, so no visual estimate is used as the source of truth;
- content grid edges are within 16px of the reference proportion at equivalent widths;
- Ink Black, Joy Gold, cobalt, and ivory values match the approved tokens;
- square button/card anatomy, ghost borders, image treatment, and cable motif are present and consistent;
- mobile uses one column with no horizontal overflow or scroll trap;
- all reference-inspired deviations are listed with a concrete accessibility, content-integrity, or responsive reason.

Any failed item is a blocking mismatch. The fidelity ledger records reference evidence, rendered evidence, and the fix or approved deviation.

## 16. Implementation Phases

1. Freeze the content/evidence registry and exact copy from Sections 5 and 7.
   - **Stop gate C1:** user approves the written specification and frozen copy.
2. Prepare P01–P06 production derivatives, B01/B02, the V02 web renditions/poster/captions/transcript, and H01/H02/H03; write `docs/media-manifest.md` with hashes for every output.
   - **Stop gate M1:** user approves all P01–P06 derivatives, book artwork, complete reel package, Higgsfield outputs, and manifest revision 1.
3. Scaffold the Next.js foundation, content layer, tokens, shell, metadata, and redirects only after C1 and M1 pass.
4. Build the homepage in visual slices with screenshot comparison after each major section.
5. Build supporting routes from shared components and route-specific content.
6. Generate the three social images from approved media, record their hashes in manifest revision 2, and render a review sheet.
   - **Stop gate M2:** user approves manifest revision 2 before metadata references the social images.
7. Implement the booking form, typed API, delivery adapter, Turnstile adapter, Upstash rate-limit/idempotency adapter, and failure states.
8. Add motion, Three.js atmosphere, reduced-motion equivalents, and interaction polish.
9. Run automated, browser, responsive, accessibility, failure-path, and visual-fidelity verification.
   - **Stop gate Q1:** user reviews the final desktop/mobile renders and any intentional deviations before handoff.

## 17. Explicit Non-Goals

- Production deployment or DNS changes
- Creating third-party accounts or purchasing services
- Publishing fabricated proof
- Public pricing
- A CMS or admin dashboard
- Supabase persistence
- A downloadable speaker kit without an approved document
- AI-generated Caleb likeness, audience, event, venue, or testimonial
- Complete P.A.I.N. acronym definitions without Caleb's approved source material
- A configured analytics provider; the initial implementation contains only a typed no-op event interface
