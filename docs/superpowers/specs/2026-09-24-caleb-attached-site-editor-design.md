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
- The first release edits plain text and images only. It does not edit link
  destinations, formatted HTML, or video.
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

- `/admin/editor/website` hosts `CalebAttachedWebsiteEditor`, composed from the
  published editor package shell and workspace primitives.
- `/admin/editor/preview/[[...page]]` renders every selected public page,
  including the homepage when the optional catch-all is empty, in private
  draft mode for the editor iframe and normalizes the preview pathname back to
  its canonical public path.
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

The stock `AttachedSiteEditor` is not used as an opaque component in this
release. Its `0.5.0` inspector exposes formatting, link, and upload behaviors
that conflict with the approved plain-text/image-only policy and it cannot
surface the required conflict and post-commit states. Instead, Caleb composes a
small `CalebAttachedWebsiteEditor` from the package's exported shell primitives
(`BuilderAppShell`, `ResponsiveNavigation`, `WebsitePreviewWorkspace`,
`HistoryWorkspace`, and the media display components), while supplying a local
plain-text/image inspector and typed operation controller. This remains an
embedded use of the published platform packages rather than a separate control
plane or a second general-purpose editor.

Page integration uses the platform preview-message contracts and editable
region attributes through a Caleb bridge that normalizes private preview paths.
The server implements `BuilderContentAdapter` as the persistence boundary and
uses the package route-operation vocabulary only as an input to Caleb's explicit
authorization map.

Caleb does not construct or pass `BuilderSiteConfig`, because its required
`adapter` field selects one of the package's central/Supabase/memory adapter
factories and none truthfully represents this site-local Neon boundary. The
composed shell primitives do not require that type. A local
`CalebEditorSiteConfig` imports and reuses only compatible published types such
as `BuilderPage`, `BuilderRegionDefinition`, and `EditableValue`, and pairs them
with a typed same-origin controller. A focused `CalebPostgresContentAdapter`
behind those routes implements the published `BuilderContentAdapter` record
shapes. No false `"central"`/`"memory"` value, cast, or undeclared `"postgres"`
value is permitted.

## Site Configuration and Editable Regions

A single `CalebEditorSiteConfig` defines the stable site identity, public pages,
an empty global-region list, and the type of every editable region. The server resolves the
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

Region IDs are semantic and permanent, such as `home.hero.title.line1` and
`about.hero.image`. IDs are never derived from array indexes or visible copy.
The first release defines **no global regions**. Header navigation, footer,
contact facts, evidence-backed authority facts, buttons, and repeated shared
components stay code-controlled. This eliminates implicit cross-page publishing
and makes every Publish action affect exactly the page named in its confirmation.

Each region declares exactly `text` or `image`. A saved value whose type does
not match its declaration is rejected. The complete initial inventory, fallback
source, required state, limit, and linkability policy is frozen in **Appendix A**.
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

The header, footer, final call-to-action component, contact phone/email/location,
navigation labels and destinations, evidence-backed authority facts, buttons,
and all page metadata remain locked in the first release. FAQ visible values are
editable only because their JSON-LD is rendered from the same resolved published
FAQ values; the JSON-LD structure and all non-FAQ facts remain locked.

On `/privacy`, `/book-caleb`, and `/thank-you`, only separately declared
non-legal presentation copy or approved images may be edited. The locked
content remains visible in preview so the editor sees the complete page.

## Content Resolution and Rendering

Public components retain the code-authored values as their baseline. For every
request, the content service attempts to load the current published page
override from Neon, validates it against the site configuration, and merges
valid values over those fallbacks.

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
only the affected public path. No deployment is required.

## Text Safety

The first release stores and renders editable text as plain strings. The local
inspector exposes a textarea or single-line input only; it never mounts the
package rich-text toolbar. HTML, Markdown, links, color, highlighting, style,
horizontal rules, and manual URL fields are not accepted.

- Values are Unicode-normalized, reject control characters other than ordinary
  line breaks, and are rendered through normal React text escaping.
- Any submitted object, markup-bearing alternate type, or undeclared field is
  rejected rather than coerced.
- Required regions cannot be published empty.
- Appendix A's per-region limits are enforced in the browser for feedback and
  again on the server as the authority.
- The same resolved FAQ strings drive visible FAQ markup and FAQ JSON-LD so a
  content edit cannot make structured data disagree with the page.

## Neon Data Model

The additive migration is named exactly
`0014_caleb_attached_site_editor.sql`, after the installed managed-runtime
`0013` lineage. It advances only the installation manifest's `builder` schema
from `1` to `2`; `forms: 2` and `growth: 1` remain unchanged. The SQL file's
SHA-256 cannot truthfully be invented before the SQL is authored. The
implementation plan must record the computed checksum, an independent review
must approve that exact file/checksum, and Preview/Production audits must match
it before either apply step. Any SQL change after review changes the checksum
and returns to review.

Migration `0014` adds these site-scoped tables compatible with
`BuilderContentAdapter`:

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

### `builder_content_command_receipts`

One durable command receipt per
`(site_id, actor_id, operation, idempotency_key)`. It stores the canonical
payload digest, exact safe response body, HTTP/result status, correlation ID,
created time, and completion time. A repeated key with the same digest returns
that recorded result; the same key with a different digest fails closed. These
receipts make a lost HTTP response safe to retry without repeating a publish,
rollback, undo, or media mutation.

### `builder_content_revalidation_jobs`

A durable outbox row for every public-pointer advance, uniquely keyed by
`(site_id, page_path, published_version_id)`. It records operation
(`publish`, `rollback`, or `undoRollback`), status
(`pending`, `processing`, `completed`, or `failed`), attempt count,
`next_attempt_at`, lease owner/expiry, last safe error code, correlation ID, and
timestamps. The job is inserted in the same transaction that advances the
published pointer and writes its audit/command receipt.

Every primary and foreign key includes or verifies `site_id`. Direct public and
browser table access is denied. Site-local Postgres functions or transactions
derive tenant and actor from the verified data-plane session.

Draft save, publish, rollback, and undo are atomic. Every public mutation
creates the immutable version, advances the published pointer, writes its audit
row and command receipt, and enqueues its revalidation job in the same
transaction. A failure changes nothing.

## Concurrency and Idempotency

Each page carries separate draft and published version tokens. The private
editor client obtains both and sends the relevant expected token on every
mutation. The body token is authoritative; an `ETag` may mirror the current
version for diagnostics and caching. The server performs compare-and-set inside
a row lock:

- a matching token applies the mutation and returns the next token;
- a stale token returns `409 CONTENT_VERSION_CONFLICT` with no write; and
- the editor asks the user to refresh before retrying rather than silently
  overwriting another Staff member's work.

Every draft save, publish, rollback, undo, and media mutation has a
server-checked `idempotency-key` header bound to site, actor, operation, and
canonical payload digest. Replaying the same operation returns the exact
durable receipt result. Reusing a key with a different payload fails closed.

The local API contract is frozen as follows:

- `GET /api/builder/content?path=<declared>&mode=draft` returns
  `{ content, draftVersionId, publishedVersionId }`.
- Draft save uses `POST /api/builder/content` with
  `{ pagePath, regionId, value, expectedDraftVersionId }`.
- Publish uses `PUT /api/builder/content` with
  `{ pagePath, expectedDraftVersionId, expectedPublishedVersionId }`.
- Rollback uses `PATCH /api/builder/content` with
  `{ pagePath, versionId, expectedPublishedVersionId }`; undo uses the same
  optimistic rule and creates another version.
- `GET /api/builder/revalidation?correlationId=<authorized-command>` returns
  `{ revalidation: "pending" | "complete" | "failed" }` for the current actor's
  site-scoped command without exposing worker details.
- Media upload uses multipart fields `file`, `label`, required `alt`, and
  optional declared `regionId`.

Every mutation carries the exact existing privileged-request headers
`x-csrf-token` and `idempotency-key`; there is no `x-builder-csrf` alias. A
successful mutation returns
`{ status: "applied" | "replayed", version, ...relevantVersionIds }`.
Publish, rollback, and undo also return
`revalidation: "complete" | "pending"`; a synchronous successful refresh may
complete the queued job before response. A stale token returns
`409 CONTENT_VERSION_CONFLICT` with no write.

The signed `/api/builder/workers/revalidation` route claims due jobs with
`FOR UPDATE SKIP LOCKED`, gives each claim a short expiring lease, reclaims an
expired lease after a serverless crash, and retries with bounded exponential
backoff. Success marks the row `completed`. Exhausted attempts mark it `failed`
and expose a safe Staff retry action that returns the same command correlation
to pending; it never advances the content pointer again. The controller polls
the authorized status route to move from `revalidation_pending` to `success` or
an actionable `error`.

The stock `0.5.0` route handler is not used for these writes because it cannot
carry this complete wire contract. Caleb's typed local controller calls the
site-local routes directly while retaining published platform content shapes.

## Media Storage and Delivery

Image bytes are written to a dedicated private bucket in Caleb's existing
Supabase project. The proposed bucket name is `caleb-site-media`. Bucket setup
is a rollout action, not part of writing this specification.

Uploads are server-mediated and require `media.upload`. A custom staged upload
form collects the file, label, and required alternative text before submission;
there is no manual image-URL field. The server:

1. accepts JPEG, PNG, or WebP only;
2. limits the original upload to 10 MiB;
3. verifies file signatures and decodes the image rather than trusting the
   filename or browser MIME value;
4. rejects malformed images and dimensions above 12000 by 12000 pixels;
5. requires useful alternative text;
6. creates a random immutable object key under the canonical Caleb site ID;
7. uploads the bytes before inserting metadata;
8. returns a canonical `MediaAsset` with `id`, site-local
   `/api/site-media/[mediaId]` URL, label, alt, type, size, and dimensions; and
9. removes an orphaned newly uploaded object if the metadata transaction fails.

An image-region snapshot persists the published platform-compatible value
`{ type: "image", mediaId, src, alt }`, never a smaller private shape or an
arbitrary source URL. At every adapter write boundary, the server ignores any
client `src`, verifies that `mediaId` belongs to the fixed Caleb site, and
derives canonical `src` as `/api/site-media/[mediaId]`; `alt` is validated
against the declared region. Adapter reads validate the same invariant before
returning `EditableValue`. A missing/cross-site ID, wrong `type`, noncanonical
`src`, or link metadata is rejected. Every seeded fallback image has a
deterministic seeded `mediaId` mapping; the absolute URL observed in the DOM is
never written back as content.

The browser never receives the Supabase service credential or arbitrary object
keys. Published pages reference the first-party
`/api/site-media/[mediaId]` URL. Unauthenticated requests receive an asset only
when it is seeded or referenced by a published snapshot; those immutable bytes
use `Cache-Control: public, max-age=31536000, immutable`. An authenticated draft
preview may additionally read a draft-only asset, but that response uses
`Cache-Control: private, no-store`. An unauthenticated request for a draft-only
asset returns `404` with `no-store`. Every response sets safe content-type and
sniffing headers.

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

The installed `@reuben-williams/next@0.5.0` Staff helper accepts only
`GrowthCapability` and only the existing commerce/provider operation enum. It
must not be widened in place, passed `commerce.view`, or given an unsafe cast.
The existing Speaking Engagements authorization path remains unchanged.

Caleb adds a parallel site-local website request context and privileged guard
that reuse the existing verified session, membership, role, authorization
version, revocation, exact origin check, CSRF cookie/header comparison, and
idempotency/replay semantics. A membership may correctly contain both Growth
and website grants. The website loader first selects grants scoped to fixed
module ID `core.website`, then parses only published `WEBSITE_CAPABILITIES` from
those rows. Growth rows remain available to the unchanged Speaking Engagements
loader; an unknown or malformed `core.website` row fails the website request
closed. Read operations require the
`core.website/read` entitlement action and mutations require
`core.website/write`.

The exact site-local operation policy is:

| Local operation | Website capability | Module action | Roles | Recent AAL2 |
| --- | --- | --- | --- | --- |
| `website.preview.read` | `preview.read` | `read` | Owner, Administrator/Operator | No |
| `website.history.read` | `history.read` | `read` | Owner, Administrator/Operator | No |
| `website.draft.save` | `post.editDraft` | `write` | Owner, Administrator/Operator | No |
| `website.publish` | `post.publish` | `write` | Owner, Administrator/Operator | Yes |
| `website.rollback` | `post.rollback` | `write` | Owner, Administrator/Operator | Yes |
| `website.media.upload` | `media.upload` | `write` | Owner, Administrator/Operator | Yes |

Media listing is covered by `website.preview.read`; undo is covered by
`website.rollback`. Recent AAL2 uses the same bounded recency rule as other
privileged Staff operations. No role outside the two listed roles is admitted
even if a stale or malformed capability value appears in a token.

Every request resolves the fixed site, current membership, role, module
entitlement action, and capability on the server. Mutations additionally
require same-origin enforcement, the exact `x-csrf-token` plus `builder_csrf`
cookie boundary, `idempotency-key`, JSON or multipart size limits, and a
correlation ID. The browser cannot provide a site ID, actor ID, role,
capability list, bucket, object key, or public-state flag.

The ordinary public site and non-website Staff routes retain the current global
CSP, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`. Both website-editor
route families are excluded from that global header rule and receive exactly
one consolidated CSP, rather than an additive second CSP whose intersection
would remain blocked:

- `/admin/editor/website` copies the ordinary directives but sets
  `frame-src 'self'` plus the already approved external frame origins, retains
  `frame-ancestors 'none'`, and retains `X-Frame-Options: DENY`; and
- `/admin/editor/preview/[[...page]]` receives the ordinary directives with
  `frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `private, no-store`,
  and `noindex`.

Header tests assert one effective CSP for each route and prove the ordinary
site cannot be framed, the editor host cannot be framed, the host can frame only
its same-origin preview, and the preview cannot be framed cross-origin.

The site-local `CalebPreviewBridge` strips the private preview prefix and emits
the canonical public pathname expected by the package selection protocol. It
accepts and sends messages only for the exact parent origin, fixed site ID,
declared page, declared region, and expected protocol/version. Public content
responses never reveal Staff identity or audit records.

## Editor Interaction Model

The editor opens with:

- a page selector using human-readable route labels;
- desktop, tablet, and mobile preview controls;
- the live page preview with editable outlines;
- a focused inspector for the selected text or image;
- Save Draft and Publish as separate actions;
- Media and History workspaces; and
- a clear link back to the public site and to Speaking Engagements.

Selecting a declared region opens the local plain-text or image inspector.
Image editing means choosing an existing approved/catalog image or completing
the staged file/label/alt upload; it does not include manual source URLs,
generative editing, animation, GIF, or freeform cropping. Alternative text is
required before an image draft can be saved.

Save Draft updates only the private draft. Publish requires a confirmation that
names the one affected page. After success, the editor refreshes the preview
and provides a public-page link.

The typed operation controller exposes
`idle`, `loading`, `saving`, `publishing`, `restoring`, `uploading`, `success`,
`conflict`, `revalidation_pending`, and `error`. A version conflict preserves
the user's unsaved local field value and offers a refresh/compare action; it
never retries over newer work. A committed publish whose route refresh is still
pending displays exactly **“Published; public refresh is still being
completed.”** Rollback/undo use the corresponding **“Restored; public refresh
is still being completed.”** state. The client retries only with the same
idempotency key, which returns the recorded result, and never creates a second
content command.

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
- **Publish/rollback/undo invalidation failure after database commit:** the
  public-pointer change remains authoritative, returns
  `revalidation: "pending"`, and enters the explicit
  `revalidation_pending` state. The durable leased worker completes or surfaces
  the queued reconciliation. The content mutation is not performed twice.
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
2. text-boundary tests for markup-bearing values, control characters,
   oversized values, empty required values, undeclared fields, and type
   mismatches;
3. Neon adapter tests for empty state, draft save, publish, rollback, undo,
   audit, site isolation, atomic failure, durable idempotent replay, receipt
   payload-digest mismatch, separate draft/published stale-token conflicts,
   transactional revalidation outbox insertion, lease-expiry recovery, bounded
   retry, and completion/failure transitions;
4. authorization tests for Owner, Administrator/Operator, missing capability,
   inactive membership, revocation, wrong site, wrong issuer/audience, expired
   session, CSRF, origin, and replay failure;
5. media tests for accepted formats, magic-byte mismatch, malformed decode,
   size/dimension limits, required alt text, immutable paths, failed metadata
   cleanup, package-compatible canonical `EditableValue` mapping, rejection of
   client `src`/link metadata, private draft access, and published-only public
   access;
6. route tests proving public reads cannot request drafts and browser input
   cannot choose the site, actor, role, capabilities, bucket, or object key;
7. component tests for the two-destination workspace, page selection, region
   selection, plain-text/image-only controls, Save Draft, Publish confirmation,
   preserved local text on conflict, `revalidation_pending`, media selection,
   history, restore, and responsive navigation;
8. browser tests proving a draft changes only the authenticated preview, publish
   changes only the selected public page, rollback creates a new version,
   publish/rollback/undo survive a simulated refresh-worker crash, homepage and
   nested preview messages use the canonical public path, exactly one effective
   CSP applies per route, the iframe policy is route-limited, and no draft or
   draft-only media leaks through caches;
9. public outage tests proving every route renders its current code fallback
   when Neon content reads fail; and
10. tests proving the existing Growth-only Speaking Engagements guard is
    unchanged while one membership can hold both Growth and website grants,
    each loader selects only its module, unknown website rows fail closed, and
    `core.website` read/write actions and AAL2 policy are enforced; and
11. full lint, typecheck, unit suite, production build, secret scan,
    `git diff --check`, installation preflight, and responsive browser checks at
    desktop, tablet, and representative mobile widths.

The protected Preview acceptance uses one clearly labeled text region and one
test image. It verifies draft isolation, publish, rollback, audit attribution,
and fallback behavior. Production enablement does not publish a content
override. Production acceptance signs in, loads Website Editor and Speaking
Engagements, opens each public route in draft preview, and confirms the existing
public site is unchanged.

Physical iOS/Android testing is reported separately from automated responsive
browser checks and is not claimed unless performed.

## Rollout

1. Freeze and validate Appendix A's region inventory against the current public
   site and `docs/media-manifest.md`.
2. Add the exact direct packages and create the site-local adapter, routes,
   workspace shell, authorization boundary, and tests in an isolated
   development branch.
3. Create a Preview Neon backup/recovery branch and apply only the reviewed
   additive content migration to the approved Preview database.
4. Create the dedicated private Supabase bucket and Preview-scoped media
   configuration without changing public DNS.
5. Provision the website capabilities for Caleb Owner and the approved
   Administrator/Operator in Preview.
6. Deploy Preview and complete the labeled draft, publish, media, history,
   rollback, concurrency, authorization, and outage acceptance.
7. Update `src/lib/platform/installation/manifest.ts`, its tests, and
   `scripts/preflight-installation-runtime.mjs`. The exact runtime-package
   allowlist becomes `@reuben-williams/core`, `@reuben-williams/forms`,
   `@reuben-williams/growth-core`, `@reuben-williams/growth-customers`,
   `@reuben-williams/growth-leads`, `@reuben-williams/growth-messaging`,
   `@reuben-williams/next`, `@reuben-williams/editor`, and
   `@reuben-williams/content`, all at `0.5.0`; no
   transitive package counts as installed. The exact resulting schema map is
   `{ builder: 2, forms: 2, growth: 1 }`. The exact sorted route inventory is:
   `/admin/editor`, `/admin/editor/speaking-engagements`,
   `/admin/editor/website`, `/admin/editor/preview/[[...page]]`,
   `/api/builder/content`, `/api/builder/media`,
   `/api/builder/revalidation`, `/api/builder/workers/installation`,
   `/api/builder/workers/revalidation`, and `/api/site-media/[mediaId]`.
   Regenerate `.builder/installation-manifest.json` rather than hand-editing it,
   then regenerate `.builder/site-runtime.json` and
   `.builder/installation-key-binding.json` against the new manifest digest.
   The manifest/test evidence must bind `builder: 2` to reviewed migration
   `0014_caleb_attached_site_editor.sql` and its exact SHA-256. Run installation
   preflight and capture new signed reachability/health evidence tied to that
   digest.
8. Run the full repository checks and responsive route matrix.
9. Create a Production Neon backup branch, verify the migration manifest and
   checksums, and require explicit user authorization before applying it.
10. Save Production-only media configuration and provision only the approved
   website capabilities.
11. Deploy Production with no published overrides, verify both Staff workspace
    destinations and all public fallbacks, and confirm the live public site is
    visually unchanged.
12. Enable ordinary Staff use. Each future content publish remains an explicit
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

## Appendix A: Frozen First-Release Region Inventory

This appendix is the allowlist. A route or DOM element not listed here is not
editable. All entries are page-scoped, `linkable=false`, and required at
publish time unless marked optional. Text limits count Unicode code points:
eyebrow 120, title 160, body 600, quote 300, FAQ question 220, FAQ answer 1200,
and image alt 240. An image value is the canonical platform
`{ type: "image", mediaId, src, alt }` shape, with server-derived first-party
`src`; its fallback source is seeded to the exact media ID shown. Tests snapshot the exact fallback value at
the named source element, so changing code-authored copy does not silently
change the content contract.

### Home `/`

| Region ID | Type / limit | Exact fallback source | Seed media ID |
| --- | --- | --- | --- |
| `home.hero.eyebrow` | text / eyebrow | `src/content/site.ts:hero.eyebrow` | — |
| `home.hero.title.line1` | text / title | `src/app/page.tsx` hero first title span (`PAIN HAS`) | — |
| `home.hero.title.emphasis` | text / title | `src/app/page.tsx` hero gold title span (`PURPOSE.`) | — |
| `home.hero.body` | text / body | `src/content/site.ts:hero.body` | — |
| `home.hero.credential` | text / body | `src/content/site.ts:hero.credential` | — |
| `home.hero.location` | text / body | `src/content/site.ts:hero.location` | — |
| `home.hero.image` | image / alt | `/media/people/caleb-home-hero-cutout.webp`, alt from the same `Image` in `src/app/page.tsx` | `seed-home-hero-cutout-v1` |
| `home.story.image.primary` | image / alt | `/media/photos/caleb-book-portrait.webp`, alt from the same `Image` | `seed-home-story-primary-v1` |
| `home.story.image.secondary` | image / alt | `/media/photos/caleb-book-wide-02.webp`, alt from the same `Image` | `seed-home-story-secondary-v1` |
| `home.story.eyebrow` | text / eyebrow | `src/app/page.tsx` story eyebrow | — |
| `home.story.title.line1` | text / title | `src/app/page.tsx` story heading text node (`THE STRUGGLE WAS REAL.`) | — |
| `home.story.title.emphasis` | text / title | `src/app/page.tsx` story heading span (`SO WAS THE CALLING.`) | — |
| `home.story.lead` | text / body | `src/app/page.tsx` `.story-section__lead` | — |
| `home.story.body` | text / body | `src/app/page.tsx` story body paragraph | — |
| `home.story.quote` | text / quote | `src/app/page.tsx` story blockquote | — |
| `home.reel.eyebrow` | text / eyebrow | `src/app/page.tsx` reel eyebrow | — |
| `home.reel.title` | text / title | `src/app/page.tsx` reel heading | — |
| `home.reel.body` | text / body | `src/app/page.tsx` reel description | — |
| `home.book.cover` | image / alt | `src/content/site.ts:book.cover`, alt from the book-section `Image` | `seed-book-cover-v1` |
| `home.book.eyebrow` | text / eyebrow | `src/app/page.tsx` book eyebrow | — |
| `home.book.heading` | text / title | `src/app/page.tsx` book heading | — |
| `home.book.title` | text / title | `src/content/site.ts:book.title` | — |
| `home.book.body` | text / body | `src/content/site.ts:book.body` | — |

Authority facts, audience/topic/outcome/format/process lists, booking form,
buttons, links, speaker video, final CTA, navigation, and footer remain locked.

### About `/about`

| Region ID | Type / limit | Exact fallback source | Seed media ID |
| --- | --- | --- | --- |
| `about.hero.eyebrow` | text / eyebrow | `src/app/about/page.tsx` `PageHero.eyebrow` | — |
| `about.hero.title` | text / title | `src/content/site.ts:routeCopy.about.title` | — |
| `about.hero.intro` | text / body | `src/content/site.ts:routeCopy.about.intro` | — |
| `about.hero.image` | image / alt | `PageHero` image and alt in `src/app/about/page.tsx` | `seed-about-hero-v1` |
| `about.chapter.struggle.title` | text / title | `routeCopy.about.chapters[0].title` | — |
| `about.chapter.struggle.body` | text / body | `routeCopy.about.chapters[0].body` | — |
| `about.chapter.transformation.title` | text / title | `routeCopy.about.chapters[1].title` | — |
| `about.chapter.transformation.body` | text / body | `routeCopy.about.chapters[1].body` | — |
| `about.chapter.calling.title` | text / title | `routeCopy.about.chapters[2].title` | — |
| `about.chapter.calling.body` | text / body | `routeCopy.about.chapters[2].body` | — |
| `about.chapter.mission.title` | text / title | `routeCopy.about.chapters[3].title` | — |
| `about.chapter.mission.body` | text / body | `routeCopy.about.chapters[3].body` | — |
| `about.collage.image` | image / alt | `/media/photos/caleb-book-wide-01.webp`, alt from the same `Image` | `seed-about-collage-v1` |
| `about.collage.eyebrow` | text / eyebrow | `src/app/about/page.tsx` collage eyebrow | — |
| `about.collage.title` | text / title | `src/app/about/page.tsx` collage heading | — |
| `about.collage.body` | text / body | `src/app/about/page.tsx` collage body paragraph | — |
| `about.collage.quote` | text / quote | `src/app/about/page.tsx` collage blockquote | — |

The authority-fact list remains evidence-controlled and locked.

### Speaking `/speaking`

| Region ID | Type / limit | Exact fallback source | Seed media ID |
| --- | --- | --- | --- |
| `speaking.hero.eyebrow` | text / eyebrow | `src/app/speaking/page.tsx` `PageHero.eyebrow` | — |
| `speaking.hero.title` | text / title | `routeCopy.speaking.title` | — |
| `speaking.hero.intro` | text / body | `routeCopy.speaking.intro` | — |
| `speaking.hero.image` | image / alt | default image and alt in `src/components/page-hero.tsx` | `seed-speaking-hero-v1` |
| `speaking.messages.eyebrow` | text / eyebrow | `src/app/speaking/page.tsx` signature-messages eyebrow | — |
| `speaking.messages.title` | text / title | `src/app/speaking/page.tsx` signature-messages heading | — |
| `speaking.messages.body` | text / body | `src/content/site.ts:topicPromise` | — |
| `speaking.messages.note` | text / body | `routeCopy.speaking.note` | — |

Audience pathways, topic names, format cards, buttons, and links remain locked.

### Audience routes

Each row below expands to the five exact IDs shown by its prefix:
`<prefix>.hero.eyebrow`, `.hero.title`, `.hero.intro`, `.hero.image`, and
`.audience.note`.

| Route / prefix | Eyebrow source | Title / intro / note source | Image fallback / seeded ID |
| --- | --- | --- | --- |
| `/schools-colleges` / `schools` | `src/app/schools-colleges/page.tsx:AudiencePage.eyebrow` | `routeCopy.schools.title`, `.intro`, `.note` | same page `image` + `imageAlt`; `seed-schools-hero-v1` |
| `/faith-events` / `faith` | `src/app/faith-events/page.tsx:AudiencePage.eyebrow` | `routeCopy.faith.title`, `.intro`, `.note` | same page `image` + `imageAlt`; `seed-faith-hero-v1` |
| `/conferences-workshops` / `conferences` | `src/app/conferences-workshops/page.tsx:AudiencePage.eyebrow` | `routeCopy.conferences.title`, `.intro`, `.note` | same page `image` + `imageAlt`; `seed-conferences-hero-v1` |

The three text hero entries use eyebrow/title/body limits respectively; note
uses body, and image uses the 240-character alt limit. Challenges, outcomes,
formats, shared outcomes, buttons, and links remain locked.

### Book & Media `/book-media`

| Region ID | Type / limit | Exact fallback source | Seed media ID |
| --- | --- | --- | --- |
| `bookMedia.hero.eyebrow` | text / eyebrow | `src/app/book-media/page.tsx` `PageHero.eyebrow` | — |
| `bookMedia.hero.title` | text / title | `routeCopy.bookMedia.title` | — |
| `bookMedia.hero.intro` | text / body | `routeCopy.bookMedia.intro` | — |
| `bookMedia.hero.image` | image / alt | same page `PageHero.image` + `imageAlt` | `seed-book-media-hero-v1` |
| `bookMedia.book.cover` | image / alt | `src/content/site.ts:book.cover`, alt from the cover `Image` | `seed-book-cover-v1` |
| `bookMedia.book.eyebrow` | text / eyebrow | same page book eyebrow | — |
| `bookMedia.book.title` | text / title | `src/content/site.ts:book.title` | — |
| `bookMedia.book.lead` | text / body | same page `.serif-lead` | — |
| `bookMedia.book.body` | text / body | `src/content/site.ts:book.body` | — |
| `bookMedia.reel.eyebrow` | text / eyebrow | same page `SectionHeading.eyebrow` | — |
| `bookMedia.reel.title` | text / title | same page `SectionHeading.title` | — |
| `bookMedia.reel.body` | text / body | same page `SectionHeading.body` | — |
| `bookMedia.inquiry.eyebrow` | text / eyebrow | same page media-inquiry eyebrow | — |
| `bookMedia.inquiry.title` | text / title | same page media-inquiry heading | — |
| `bookMedia.inquiry.body` | text / body | same page media-inquiry paragraph | — |

Purchase and inquiry links plus all video media/captions/transcript remain locked.

### FAQ `/faq`

| Region ID | Type / limit | Exact fallback source | Seed media ID |
| --- | --- | --- | --- |
| `faq.hero.eyebrow` | text / eyebrow | `src/app/faq/page.tsx` `PageHero.eyebrow` | — |
| `faq.hero.title` | text / title | `routeCopy.faq.title` | — |
| `faq.hero.intro` | text / body | `routeCopy.faq.intro` | — |
| `faq.hero.image` | image / alt | same page `PageHero.image` + `imageAlt` | `seed-faq-hero-v1` |

The FAQ items use these stable keys in current `src/content/site.ts:faqs`
order: `audiences`, `secular`, `faith-adjustment`, `international`, `formats`,
`keynote-workshop`, `timing`, `quote-information`, `panels-podcasts`, `travel`,
and `media-kit`. For every key `<k>`, the inventory contains exactly
`faq.item.<k>.question` (text / FAQ question) and
`faq.item.<k>.answer` (text / FAQ answer), with the corresponding current
`faqs[n].question` and `faqs[n].answer` as its fallback. Both the visible list
and FAQ structured data consume this same resolved array. The contact block and
its links remain locked.

### Booking, Privacy, and Thank You

| Route | Region ID | Type / limit | Exact fallback source |
| --- | --- | --- | --- |
| `/book-caleb` | `bookCaleb.intro.eyebrow` | text / eyebrow | `src/app/book-caleb/page.tsx` intro eyebrow |
| `/book-caleb` | `bookCaleb.intro.title` | text / title | `routeCopy.booking.title` |
| `/book-caleb` | `bookCaleb.intro.body` | text / body | `routeCopy.booking.intro` |
| `/thank-you` | `thankYou.empty.eyebrow` | text / eyebrow | `src/components/thank-you-state.tsx` no-receipt eyebrow |
| `/thank-you` | `thankYou.empty.title` | text / title | same component no-receipt heading |
| `/thank-you` | `thankYou.empty.body` | text / body | same component first no-receipt sentence only; contact links remain code-controlled |

`/privacy` intentionally has no editable regions in the first release; it is
present in the page selector as a view-only preview. The booking form, contact
facts/links, Turnstile, form headings and instructions, receipt/inquiry IDs,
accepted receipt branch (including its title and body), accepted-at state,
assistance text, and all legal/privacy copy remain locked. This avoids a fake or
real receipt in the Staff iframe merely to reach editable content.

### Global inventory

The global region inventory is exactly empty: `[]`.

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
