# Caleb Attached Site Editor Design

- Date: 2026-09-24
- Repository: `Reuben-Williams/Caleb-Motivational-Speaker-V3`
- Target branch: `main`
- Status: design approved by the user; written specification pending final user review
- Production boundary: no DNS change and no public-content publication during initial enablement

## Outcome

Add a real website editor to Caleb's existing authenticated Staff workspace. The
same workspace will expose two clear destinations:

1. **Website Editor** for approved text and image regions on the public site; and
2. **Speaking Engagements** for the native inquiry workflow that is already in
   production.

Caleb and the Administrator/Operator can open any supported public page in a
responsive preview, select a declared text or image region, save private draft
changes, explicitly publish them, review version history, and restore a prior
version. Publishing content must not require a code change or a Vercel
deployment.

The site remains layout-locked. Editors cannot change components, CSS, scripts,
forms, checkout behavior, consent wording, legal disclosures, routes, or page
structure. Existing code and approved media remain the safe fallback when the
content data plane is empty or temporarily unavailable.

## Approved Constraints

- The editor is embedded in Caleb V3; it is not a redirect to the central
  control plane.
- The public footer continues to route Staff Login to `/admin/editor`.
- `/admin/editor` is the authenticated Staff workspace and defaults to Website
  Editor. `/admin/editor/website` is its canonical editor route.
- `/admin/editor/speaking-engagements` remains available from the same workspace.
- Caleb remains Owner. The previously approved Administrator/Operator remains
  the operator role.
- Both roles may save drafts, preview drafts, publish, upload images, inspect
  history, restore a version, and undo a restore.
- Neon is the durable store for editable content, drafts, versions, audit
  events, and media metadata.
- The existing Supabase project stores image bytes in a dedicated private
  bucket. It does not become the content database.
- Only declared regions are editable. Layout, styles, scripts, forms, legal and
  consent language, booking logic, commerce, and dynamic receipt data remain
  code-controlled.
- Every public route is represented in the page selector, but routes with
  protected or regulated content expose only explicitly approved presentation
  regions.
- The first release edits text, rich text, links attached to approved regions,
  and images. It does not edit or upload video.
- Drafts are private and never appear on a public page before an explicit
  successful publish.
- The current authenticated Staff workspace, Supabase Auth tenant, Neon
  membership model, and site-local deployment remain authoritative.
- No real public content is changed merely by installing the feature.

## Considered Approaches

### A. Redirect Staff Login to the central control plane

This reuses central screens, but it repeats the navigation failure the user has
already rejected and makes Caleb's daily editing dependent on a second
application. It also expands the outage boundary.

### B. Add a bespoke set of editing forms to Caleb V3

This can be built quickly for a few fields, but it duplicates the platform's
preview, selection, history, media, and publishing behavior. It would become a
second editor implementation and would be difficult to keep consistent.

### C. Embed the published site-editor packages in Caleb V3

This is the approved approach. Caleb V3 directly consumes the exact `0.5.0`
platform editor contracts, implements a site-local Neon adapter, and uses the
existing Staff authorization boundary. It preserves the platform direction
while keeping Caleb's content and runtime within Caleb's own deployment.

## Information Architecture and Routes

### Staff workspace

`/admin/editor` renders an authenticated workspace shell with two primary
destinations:

- **Website Editor** -> `/admin/editor/website`
- **Speaking Engagements** -> `/admin/editor/speaking-engagements`

The Website Editor opens by default. The navigation is visible at desktop,
tablet, and mobile widths, uses plain labels, and does not expose unavailable
future modules. The current Speaking Engagements page becomes a workspace child
rather than the whole `/admin/editor` experience.

All Staff pages are dynamic, `private, no-store`, and non-indexable. A missing,
expired, revoked, wrong-site, or unauthorized session fails closed and routes to
the existing Caleb Staff sign-in flow without revealing editor or lead data.

### Editor routes

- `/admin/editor/website` hosts `AttachedSiteEditor`.
- `/admin/editor/preview/[...page]` renders the selected public page in private
  draft mode for the editor iframe.
- `/api/builder/content` serves content, audit, publish, and rollback operations.
- `/api/builder/media` accepts and serves site-scoped media operations.
- `/api/site-media/[mediaId]` serves an immutable media revision after checking
  whether the requesting context may access it.

The private preview route uses the same page components as the public route. It
does not maintain a second visual implementation. Internal preview navigation
stays inside the preview surface.

## Platform Package Boundary

The release adds exact direct dependencies on:

- `@reuben-williams/editor@0.5.0`
- `@reuben-williams/content@0.5.0`

Existing direct platform dependencies remain pinned to `0.5.0`. Transitive
availability is not treated as an installation contract. The installation
manifest is updated to list the direct packages, editor/API routes, and the
applicable content schema only after compatibility tests prove the manifest.

The implementation uses:

- `AttachedSiteEditor` for the editor shell;
- `BuilderProvider`, editable region components, and `BuilderPreviewBridge` for
  page integration;
- `BuilderContentAdapter` as the persistence boundary; and
- the package route-operation vocabulary for authorization mapping.

The central adapter is not used. The generic Supabase content adapter is not
used because Caleb's approved content system of record is Neon. A focused
Caleb Postgres adapter implements the published `BuilderContentAdapter`
interface without changing the platform's public record shapes.

## Site Configuration and Editable Regions

A single `BuilderSiteConfig` defines the stable site identity, public pages,
global regions, and the type of every editable region. The server resolves the
canonical Caleb site ID from the fixed stable key `caleb-jakes-v3`; neither the
browser nor a URL parameter supplies tenant identity.

The page selector includes:

- `/`
- `/about`
- `/speaking`
- `/schools-colleges`
- `/faith-events`
- `/conferences-workshops`
- `/book-media`
- `/faq`
- `/book-caleb`
- `/privacy`
- `/thank-you`

Region IDs are semantic and permanent, such as `home.hero.title` and
`about.intro.image`. IDs are never derived from array indexes or visible copy.
Header/footer facts that intentionally repeat use global region IDs stored at
the platform global-content path. Page-specific regions remain page-scoped.

Each region declares one permitted type: `text`, `richText`, `image`, or
`link`. A saved value whose type does not match its declaration is rejected.
Each route renders its current code value as the fallback. An absent override
therefore displays the current approved site exactly as it does today.

### Locked content

The following are never declared as editable regions in this release:

- privacy-policy and legal disclosure body text;
- booking-form field labels, validation rules, required fields, consent copy,
  and acknowledgement semantics;
- inquiry receipt IDs or organizer/event data;
- Turnstile, rate limits, database or email behavior;
- prices, taxes, shipping, checkout, Stripe, or fulfillment;
- scripts, metadata verification records, JSON-LD facts, routes, navigation
  targets, or hidden configuration;
- CSS classes, component hierarchy, layout geometry, animation, or responsive
  breakpoints; and
- video sources, captions, transcripts, or playback behavior.

On `/privacy`, `/book-caleb`, and `/thank-you`, only separately declared
non-legal presentation copy or approved images may be edited. The locked
content remains visible in preview so the editor sees the complete page.

## Content Resolution and Rendering

Public components retain the code-authored values as their baseline. For every
request, the content service attempts to load the current published global and
page overrides from Neon, validates them against the site configuration, and
merges valid overrides over those fallbacks.

The public site never queries drafts. Draft content can be read only by the
authenticated preview route. Preview merges the current draft over the current
published view, then over code fallbacks, so an editor sees unsaved-to-public
changes in full context.

If Neon is unavailable, slow, or returns invalid content:

- public routes render the code fallback or most recently cached valid
  published snapshot;
- no draft is substituted;
- Staff mutation routes fail closed and do not claim a save or publish; and
- the editor shows a recoverable error with the draft still present in the
  browser field until the user retries.

Published content is server-rendered where practical. Client hydration must not
flash draft content or hide the fallback indefinitely. Publishing revalidates
the affected public path. Publishing global regions revalidates every declared
public path. No deployment is required.

## Text and Link Safety

Platform editable components render HTML for some text values, so validation is
an explicit security boundary rather than an editor-only concern.

- Plain text permits only the package's approved inline formatting subset.
- Rich text permits a documented allowlist of headings, paragraphs, lists,
  emphasis, block quotes, and safe links.
- Scripts, styles, event handlers, iframes, forms, SVG, embedded objects,
  comments, `data:` links, protocol-relative links, and unapproved attributes
  are removed or rejected.
- Link destinations are limited to root-relative paths, fragments, HTTPS,
  `mailto:`, and `tel:` using the platform URL normalizer.
- HTML is normalized and sanitized before persistence and sanitized again
  before public rendering. Stored legacy or malformed values cannot bypass the
  rendering boundary.
- Required regions cannot be published empty. Length limits are defined per
  region category and enforced server-side.

## Neon Data Model

The next additive Caleb migration after the deployed native-booking manifest
adds site-scoped content tables compatible with `BuilderContentAdapter`:

### `builder_draft_pages`

One current draft snapshot per `(site_id, page_path)`, including the region map,
current version ID, monotonically increasing revision, last actor, and update
time.

### `builder_published_pages`

One current public snapshot per `(site_id, page_path)`, including the immutable
source version ID, revision, publisher, and publish time.

### `builder_versions`

Append-only snapshots for `draft`, `published`, `rollback`, and
`undoRollback`. Each row records site, path, parent/source version, full
validated snapshot, actor, correlation ID, and time.

### `builder_audit_log`

Append-only editor events with safe before/after values, action, page, region,
actor, correlation ID, source/result version IDs, and time. Secrets, session
tokens, provider credentials, and binary data are never logged.

### `builder_media_assets`

Immutable metadata for each accepted upload or approved seeded asset: site,
asset ID, immutable object key, first-party delivery URL, original label,
required alt text, MIME type, byte size, dimensions, source, creator, and time.
Replacing an image creates a new media asset; it never mutates an older object.

Every primary and foreign key includes or verifies `site_id`. Direct public and
browser table access is denied. Site-local Postgres functions or transactions
derive tenant and actor from the verified data-plane session.

Draft save, publish, rollback, and undo are atomic. A publish creates the
immutable version and advances the published pointer in the same transaction.
An audit row is written in that transaction. A failure changes nothing.

## Concurrency and Idempotency

Each page and global snapshot carries a revision/version token. The private
editor client obtains the token with the draft and sends it on every mutation.
The server performs compare-and-set inside a row lock:

- a matching token applies the mutation and returns the next token;
- a stale token returns `409 CONTENT_VERSION_CONFLICT` with no write; and
- the editor asks the user to refresh before retrying rather than silently
  overwriting another Staff member's work.

Every publish, rollback, undo, and media metadata mutation has a server-checked
idempotency key bound to site, actor, operation, and payload digest. Replaying
the same operation returns the original result. Reusing a key with a different
payload fails closed.

The generic package handler may be wrapped or extended at the Caleb boundary to
carry these tokens; concurrency protection is not omitted merely because the
base `0.5.0` adapter input lacks an expected-version field.

## Media Storage and Delivery

Image bytes are written to a dedicated private bucket in Caleb's existing
Supabase project. The proposed bucket name is `caleb-site-media`. Bucket setup
is a rollout action, not part of writing this specification.

Uploads are server-mediated and require `media.upload`. The server:

1. accepts JPEG, PNG, or WebP only;
2. limits the original upload to 10 MiB;
3. verifies file signatures and decodes the image rather than trusting the
   filename or browser MIME value;
4. rejects malformed images and dimensions above the documented safe limit;
5. requires useful alternative text;
6. creates a random immutable object key under the canonical Caleb site ID;
7. uploads the bytes before inserting metadata; and
8. removes an orphaned newly uploaded object if the metadata transaction fails.

The browser never receives the Supabase service credential or arbitrary object
keys. Published pages reference the first-party
`/api/site-media/[mediaId]` URL. That route serves only assets referenced by a
published snapshot or approved seeded catalog. The authenticated draft preview
may additionally read draft-referenced assets. Responses use immutable caching
for immutable media IDs and set safe content-type and sniffing headers.

The initial media catalog seeds the exact existing approved site assets from
`docs/media-manifest.md` as `source=seed`. Existing provenance records and file
hashes remain unchanged. Uploading a new image records who supplied it but does
not label it as approved source evidence or AI-generated work. There is no asset
deletion UI in this release; historical versions must remain renderable.

## Authorization and Security

The existing Supabase Auth project verifies identity. Caleb's Neon database
continues to authorize site membership, role, entitlements, grants,
authorization version, and revocation.

Both the `owner` and `administrator_operator` memberships receive the following
site-scoped website capabilities for this release:

- `preview.read`
- `history.read`
- `post.editDraft`
- `post.publish`
- `post.rollback`
- `media.upload`

`post.create`, scheduling, archiving, forms editing, and member administration
are not required for this fixed-page editor and are not added merely because a
package role template contains them.

Route operations map as follows:

| Operation | Capability |
| --- | --- |
| private published/draft preview | `preview.read` |
| history and audit read | `history.read` |
| draft save | `post.editDraft` |
| publish | `post.publish` |
| rollback or undo | `post.rollback` |
| media list | `preview.read` |
| media upload | `media.upload` |

The Staff runtime is generalized from Growth-only capability typing to the
published Builder capability union while preserving the existing Speaking
Engagements authorization behavior.

Every read and mutation resolves the fixed site, current membership, role,
module entitlement, and capability on the server. Mutations additionally
require same-origin enforcement, the existing CSRF/replay boundary, JSON or
multipart size limits, and a correlation ID. The browser cannot provide a site
ID, actor ID, role, capability list, bucket, object key, or public-state flag.

Draft preview pages use `private, no-store`, `noindex`, frame restrictions that
permit only the same-origin editor shell, and a strict parent-origin check for
preview messages. Public content responses never reveal Staff identity or audit
records.

## Editor Interaction Model

The editor opens with:

- a page selector using human-readable route labels;
- desktop, tablet, and mobile preview controls;
- the live page preview with editable outlines;
- a focused inspector for the selected text or image;
- Save Draft and Publish as separate actions;
- Media and History workspaces; and
- a clear link back to the public site and to Speaking Engagements.

Selecting a declared region opens the appropriate editor. Image editing means
choosing an existing approved/catalog image or uploading a replacement; it does
not include generative editing or freeform cropping in this release. Alternative
text is required before an image draft can be saved.

Save Draft updates only the private draft. Publish requires a confirmation that
names the page and warns when global content will change multiple pages. After
success, the editor refreshes the preview and provides a public-page link.

History shows actor, time, page, action, and a concise change summary. Restore
creates a new rollback version rather than deleting history. Undo restore also
creates a version. The UI never rewrites history.

Mobile Staff users receive the responsive editor shell, but page preview and
editing controls remain usable rather than collapsing into a desktop-only
warning.

## Failure and Recovery Behavior

- **Neon read outage:** public pages render fallback content; private editor
  reads show a retryable unavailable state.
- **Neon mutation outage:** save/publish/rollback fails closed and does not claim
  success.
- **Supabase Storage outage:** existing published images continue through cached
  immutable delivery when available; new uploads are disabled with a clear
  retry message. Text editing remains available.
- **Invalid stored override:** ignore that region, render its code fallback,
  emit a secret-safe diagnostic, and prevent republishing the invalid snapshot.
- **Stale editor:** return a conflict without changing data.
- **Partial media upload:** clean up an unreferenced new object when safe and
  retain an auditable failure code without exposing provider details.
- **Publish invalidation failure after database commit:** the publish remains
  authoritative, returns a reconciliation-required result, and a bounded retry
  revalidates the route. It is not published twice.
- **Package/editor JavaScript failure:** the public site remains readable and
  uses code or published server content; Staff mutations are unavailable rather
  than falling back to insecure direct edits.

## Configuration

The attached editor reuses existing production values for Staff auth, site URL,
and Neon. It adds only server-side media configuration required for the
dedicated Supabase bucket. Final names are recorded in the implementation plan,
but the configuration boundary includes:

- existing `DATABASE_URL`;
- existing Staff Supabase URL, publishable key, issuer, and audience values;
- a server-only Supabase credential authorized to the dedicated media bucket;
- the fixed media bucket name; and
- existing canonical Caleb public-site URL.

All environment values are scoped independently for Preview and Production.
No Preview secret is copied into Production. No secret value is committed,
logged, returned to the browser, or included in evidence.

## Testing and Acceptance

Implementation follows red-green-refactor. Required automated evidence
includes:

1. site-config tests proving every region ID is unique, stable, typed, and tied
   to an approved route;
2. sanitization tests for script tags, event handlers, unsafe URLs, malformed
   rich text, oversized values, and type mismatches;
3. Neon adapter tests for empty state, draft save, publish, global merge,
   rollback, undo, audit, site isolation, atomic failure, idempotency, and stale
   revision conflicts;
4. authorization tests for Owner, Administrator/Operator, missing capability,
   inactive membership, revocation, wrong site, wrong issuer/audience, expired
   session, CSRF, origin, and replay failure;
5. media tests for accepted formats, magic-byte mismatch, malformed decode,
   size/dimension limits, required alt text, immutable paths, failed metadata
   cleanup, private draft access, and published-only public access;
6. route tests proving public reads cannot request drafts and browser input
   cannot choose the site, actor, role, capabilities, bucket, or object key;
7. component tests for the two-destination workspace, page selection, region
   selection, Save Draft, Publish confirmation, conflicts, media selection,
   history, restore, and responsive navigation;
8. browser tests proving a draft changes only the authenticated preview, publish
   changes the selected public page, global publish changes all intended pages,
   rollback creates a new version, and no draft leaks through caches;
9. public outage tests proving every route renders its current code fallback
   when Neon content reads fail; and
10. full lint, typecheck, unit suite, production build, secret scan,
    `git diff --check`, and responsive browser checks at desktop, tablet, and
    representative mobile widths.

The protected Preview acceptance uses one clearly labeled text region and one
test image. It verifies draft isolation, publish, rollback, audit attribution,
and fallback behavior. Production enablement does not publish a content
override. Production acceptance signs in, loads Website Editor and Speaking
Engagements, opens each public route in draft preview, and confirms the existing
public site is unchanged.

Physical iOS/Android testing is reported separately from automated responsive
browser checks and is not claimed unless performed.

## Rollout

1. Freeze and validate the region inventory against the current public site and
   `docs/media-manifest.md`.
2. Add the exact direct packages and create the site-local adapter, routes,
   workspace shell, and tests in an isolated development branch.
3. Create a Preview Neon backup/recovery branch and apply only the reviewed
   additive content migration to the approved Preview database.
4. Create the dedicated private Supabase bucket and Preview-scoped media
   configuration without changing public DNS.
5. Provision the website capabilities for Caleb Owner and the approved
   Administrator/Operator in Preview.
6. Deploy Preview and complete the labeled draft, publish, media, history,
   rollback, concurrency, authorization, and outage acceptance.
7. Run the full repository checks and responsive route matrix.
8. Create a Production Neon backup branch, verify the migration manifest and
   checksums, and require explicit user authorization before applying it.
9. Save Production-only media configuration and provision only the approved
   website capabilities.
10. Deploy Production with no published overrides, verify both Staff workspace
    destinations and all public fallbacks, and confirm the live public site is
    visually unchanged.
11. Enable ordinary Staff use. Each future content publish remains an explicit
    in-editor action with history and rollback.

No DNS action is needed for this feature because Caleb's public domain already
targets the production application. No HighLevel, Stripe, commerce, or booking
workflow change is part of this rollout.

## Rollback

Before the first content publication, application rollback is the prior Vercel
deployment; the additive Neon tables and private media bucket can remain inert.

After content is published, rolling back application code must not silently
discard the approved content. The safe rollback path is a reviewed deployment
that can still read published snapshots but disables Staff mutations. If the
content data plane itself is unhealthy, public routes fall back to code values
while operators repair or restore Neon. Database restoration uses the verified
backup branch and preserves append-only audit evidence wherever possible.

Media objects referenced by any version are retained. A deployment rollback
never deletes uploaded files, versions, or audit events.

## Explicit Non-Goals

- Drag-and-drop layout editing
- Component creation, deletion, or reordering
- CSS, theme, animation, script, metadata, or route editing
- New page creation or deletion
- Video upload, trimming, caption editing, or transcript editing
- AI rewriting or AI image generation
- Editing legal, consent, form, booking, commerce, pricing, tax, shipping, or
  fulfillment behavior
- Multi-stage editorial approvals or scheduled publishing
- Media deletion or destructive cleanup
- Moving Caleb's Staff workspace into the central control plane
- Replacing Supabase Auth, Neon, Vercel, or the existing native Speaking
  Engagements workflow
