# Caleb Attached Site Editor Implementation Plan

> **Status:** Implementation plan only. The written design is approved, but
> this plan does not authorize code changes, package publication, database
> writes, provider changes, deployment, DNS changes, or public-content
> publication.

**Goal:** Add a layout-locked Website Editor to Caleb's existing authenticated
Staff workspace at `/admin/editor`, while preserving the native Speaking
Engagements workspace and keeping public content unchanged until an explicit
Staff publish.

**Architecture:** Caleb V3 composes the published `@reuben-williams/editor` and
`@reuben-williams/content` `0.5.0` primitives into a site-local editor. A local
typed controller talks to same-origin APIs backed by Neon. Public pages resolve
validated published page snapshots over code fallbacks; the authenticated
preview resolves private drafts. Supabase stores immutable image bytes in a
private bucket, while first-party media URLs enforce draft/published access.
Optimistic version tokens, durable command receipts, and a leased revalidation
outbox protect concurrent editing and serverless retries.

**Technology:** Next.js 16 App Router, TypeScript, React 19, Vitest, Neon
PostgreSQL, Supabase Auth and private Storage, Vercel Functions/Cron, and exact
`@reuben-williams/*@0.5.0` packages.

**Approved specification:**
`docs/superpowers/specs/2026-09-24-caleb-attached-site-editor-design.md`

**Repositories:**

- Caleb V3: `D:\Motivational Speaker Caleb\V3`
- Portable platform migration authority:
  `D:\Project Morales\site-editor-platform\.worktrees\caleb-automations-design`

**Safety boundary:** Preserve the existing Caleb changes in `next-env.d.ts`,
`.builder/hosting-handoff-acknowledgement.json`, the two user-owned video files,
`output/`, and every unrelated worktree change. Preserve the platform
worktree's `.vercel/` and Gate 2 artifacts. Stage every checkpoint by explicit
path. Never print or commit database URLs, Supabase service credentials,
`CRON_SECRET`, Staff sessions, recovery tokens, private object keys, or customer
records.

---

## Task 1: Preflight Both Repositories and Freeze the Contract

**Caleb V3 files:**

- Modify: `src/lib/platform/installation/package-contract.test.ts`
- Modify: `src/lib/platform/installation/manifest.test.ts`
- Modify: `src/lib/platform/installation/manifest-files.test.ts`
- Modify: `scripts/preflight-installation-runtime.test.mjs`
- Create: `src/lib/site-editor/approved-contract.test.ts`

**Platform files:**

- Inspect: `postgres/migrations/0001_*.sql` through
  `postgres/migrations/0014_managed_growth_catalog_versions.sql`
- Inspect: `packages/testing/tests/managed-installation-postgres.test.ts`
- Inspect: the current migration-manifest/checksum runner

### Step 1: Record read-only preflight evidence

Confirm the Caleb branch and platform branch, list only target-path changes,
verify the authoritative platform sequence ends at checksum-valid `0014`, and
verify Caleb's installed manifest still reports `builder: 1`. Stop on migration
drift, a conflicting `0015`, or a target-file modification not owned by this
feature.

### Step 2: Write failing contract tests

Freeze the approved direct runtime package set, `{ builder: 2, forms: 2,
growth: 1 }`, exact route inventory, `0015_caleb_attached_site_editor.sql`, the
empty global-region inventory, and the no-rich-text/no-link/no-video policy.

Run:

```powershell
npx vitest run src/lib/platform/installation/package-contract.test.ts src/lib/platform/installation/manifest.test.ts src/lib/platform/installation/manifest-files.test.ts src/lib/site-editor/approved-contract.test.ts
node scripts/preflight-installation-runtime.test.mjs
```

Expected: the new assertions fail because editor/content are not direct
dependencies and the attached-editor runtime does not exist.

### Step 3: Commit only the failing contract checkpoint

Commit:

```text
test: freeze Caleb attached editor contract
```

---

## Task 2: Add the Portable Additive Content Schema

**Platform files:**

- Create: `postgres/migrations/0015_caleb_attached_site_editor.sql`
- Create: `packages/testing/tests/caleb-attached-editor-postgres.test.ts`
- Create: `scripts/run-caleb-attached-editor-contract-check.mjs`
- Modify: `packages/testing/tests/managed-installation-postgres.test.ts`
- Modify: `scripts/run-managed-installation-contract-check.mjs`
- Modify: `package.json`

### Step 1: Write isolated failing PostgreSQL tests

Prove the exact tables, site-scoped keys, foreign keys, status checks, revision
tokens, append-only version/audit semantics, command-receipt uniqueness, and
revalidation-job lease transitions. Include two synthetic sites and prove they
cannot read, mutate, publish, roll back, replay, revalidate, or serve one
another's content/media.

### Step 2: Implement migration `0015`

Create only:

- `builder_draft_pages`
- `builder_published_pages`
- `builder_versions`
- `builder_audit_log`
- `builder_media_assets`
- `builder_content_command_receipts`
- `builder_content_revalidation_jobs`
- the minimum site-local functions required for atomic draft/public mutations,
  command replay, leased revalidation claims, and safe status reads

Keep physical Storage object keys separate from the public `MediaAsset.path`.
Revoke public/browser execution and direct table access. Do not alter inquiry,
lead, message, commerce, booking, retention, installation, or existing Staff
records.

### Step 3: Verify migration identity

Run the new contract runner, the updated managed-installation runner, the
native-inquiry runner, and Neon conformance suite. Advance the existing
contiguous-migration assertion from 14/`0014` to 15/`0015`, and make the
managed-installation runner include the new PostgreSQL contract test. Record
the computed SHA-256 for the reviewed SQL; any SQL change invalidates it.

### Step 4: Commit the platform checkpoint

Commit only the migration, tests, runner, manifest update, and package script:

```text
feat: add Caleb attached editor data plane
```

Do not apply the migration to Preview or Production in this task.

---

## Task 3: Pin the Editor Packages and Update the Installation Contract

**Caleb V3 files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/lib/platform/installation/manifest.ts`
- Modify: `src/lib/platform/installation/manifest.test.ts`
- Modify: `src/lib/platform/installation/manifest-files.test.ts`
- Modify: `src/lib/platform/installation/package-contract.test.ts`
- Modify: `scripts/preflight-installation-runtime.mjs`
- Modify: `scripts/preflight-installation-runtime.test.mjs`

### Step 1: Add exact direct dependencies

Install `@reuben-williams/editor@0.5.0` and
`@reuben-williams/content@0.5.0` as exact runtime dependencies. Keep every
existing direct package pinned to `0.5.0`; do not count a transitive dependency
as installed.

### Step 2: Update the generated-manifest source

Change the source manifest to the exact nine-package allowlist, schema map, and
route array from the approved spec. Do not hand-edit generated `.builder` JSON
yet. Extend preflight to reject any missing/extra package, route, schema, or
version.

### Step 3: Run focused tests and commit

Run the package, manifest, lockfile, and preflight tests. Commit:

```text
build: attach editor package contracts
```

---

## Task 4: Implement the Frozen Region Configuration and Validators

**Caleb V3 files:**

- Create: `src/lib/site-editor/site-config.ts`
- Create: `src/lib/site-editor/site-config.test.ts`
- Create: `src/lib/site-editor/content-validation.ts`
- Create: `src/lib/site-editor/content-validation.test.ts`
- Create: `src/lib/site-editor/media-seed-catalog.ts`
- Create: `src/lib/site-editor/media-seed-catalog.test.ts`
- Modify: `docs/media-manifest.md` only to add first-party seed IDs without
  changing provenance or hashes

### Step 1: Write failing inventory tests

Assert every Appendix A page/region exactly once, no global regions, only
`text`/`image`, semantic IDs, exact limits, locked routes/elements, and stable
seed IDs. Assert `/privacy` is view-only and the accepted receipt branch remains
locked.

### Step 2: Implement `CalebEditorSiteConfig`

Reuse compatible package types (`BuilderPage`, `BuilderRegionDefinition`,
`EditableValue`) without constructing `BuilderSiteConfig` or selecting an
adapter factory. Encode the exact route labels, fallbacks, and region policy.

### Step 3: Implement fail-closed value validation

Normalize plain text, reject markup-bearing alternate types/control characters,
enforce required/length rules, and validate canonical image values as
`{ type: "image", mediaId, src, alt }` with no link metadata. Map every seed ID
to the existing approved file and alt text.

### Step 4: Commit

```text
feat: define Caleb editable region policy
```

---

## Task 5: Build the Neon Adapter, Receipts, and Revalidation Queue

**Caleb V3 files:**

- Create: `src/lib/site-editor/postgres-content-adapter.ts`
- Create: `src/lib/site-editor/postgres-content-adapter.test.ts`
- Create: `src/lib/site-editor/content-command-store.ts`
- Create: `src/lib/site-editor/content-command-store.test.ts`
- Create: `src/lib/site-editor/revalidation-store.ts`
- Create: `src/lib/site-editor/revalidation-store.test.ts`
- Create: `src/lib/site-editor/content-resolution.ts`
- Create: `src/lib/site-editor/content-resolution.test.ts`
- Reuse: `src/lib/postgres/connection-string.ts`

### Step 1: Write failing adapter tests

Cover empty fallback, draft save, publish, rollback, undo, history, audit,
separate draft/published optimistic tokens, `409` conflicts, atomic failure,
immutable receipt replay, payload-digest mismatch, and two-site isolation.

### Step 2: Implement `CalebPostgresContentAdapter`

Map database snapshots to published platform shapes at every boundary. Never
trust browser site/actor/role/src values. Keep public and draft reads separate;
invalid overrides are ignored for public fallback but cannot be republished.

### Step 3: Implement crash-safe revalidation

Insert one outbox job in the same transaction as every public-pointer change.
Claim due rows with `FOR UPDATE SKIP LOCKED`, expiring leases, bounded backoff,
and completed/failed transitions. Mutation receipts always store and replay
`revalidation: "pending"`; only the status read reports later completion.

### Step 4: Commit

```text
feat: add versioned site content persistence
```

---

## Task 6: Add a Separate Website Authorization Boundary

**Caleb V3 files:**

- Create: `src/lib/staff/website-authorization.ts`
- Create: `src/lib/staff/website-authorization.test.ts`
- Create: `src/lib/staff/website-runtime.ts`
- Create: `src/lib/staff/website-runtime.test.ts`
- Modify only if needed for shared non-Growth utilities:
  `src/lib/staff/session.ts`
- Preserve behavior: `src/lib/staff/runtime.ts`
- Preserve behavior: `src/lib/staff/authorization.ts`

### Step 1: Write failing mixed-grant tests

Use one Owner/Administrator membership containing both Growth and website
grants. Prove the website loader filters `core.website` rows before parsing
`WEBSITE_CAPABILITIES`, rejects unknown website rows, enforces read/write
entitlements and AAL2, and leaves the existing Growth-only Speaking
Engagements tests unchanged.

### Step 2: Implement the local authorizer and privileged guard

Reuse the verified Supabase session, membership/revocation facts, origin check,
`builder_csrf`/`x-csrf-token`, and replay semantics without casting website
capabilities into `GrowthCapability` or passing `commerce.view`. Implement the
seven exact website operations from the spec, including AAL2-protected
revalidation retry.

### Step 3: Add safe denial and correlation evidence

Record secret-safe denials using the existing audit boundary. Do not put Staff
identity, role, site ID, or capability lists under browser control.

### Step 4: Commit

```text
feat: authorize Caleb website editing
```

---

## Task 7: Implement Content and Revalidation APIs

**Caleb V3 files:**

- Create: `src/lib/site-editor/content-route-handler.ts`
- Create: `src/lib/site-editor/content-route-handler.test.ts`
- Create: `src/app/api/builder/content/route.ts`
- Create: `src/lib/site-editor/revalidation-route-handler.ts`
- Create: `src/lib/site-editor/revalidation-route-handler.test.ts`
- Create: `src/app/api/builder/revalidation/route.ts`
- Create: `src/lib/site-editor/revalidation-worker.ts`
- Create: `src/lib/site-editor/revalidation-worker.test.ts`
- Create: `src/app/api/builder/workers/revalidation/route.ts`
- Modify: `vercel.json`

### Step 1: Write failing wire-contract tests

Freeze exact methods, query parameters, action discriminators, bodies,
responses, error codes, `x-csrf-token`, `idempotency-key`, size limits, and
same-origin behavior. Cover content/draft reads, history as
`resource=history`, save, publish, rollback, undo, revalidation status, retry,
conflict preservation, and immutable replay.

### Step 2: Implement thin route handlers

Routes derive site and actor from the website runtime, validate exact keys,
delegate to the adapter/store, and return typed safe results. A successful
public mutation may make one bounded post-commit refresh attempt but always
returns the receipt's `pending` result.

### Step 3: Add the signed recurring worker

Add `/api/builder/workers/revalidation` to `vercel.json` with
`*/5 * * * *`. Verify `Authorization: Bearer <CRON_SECRET>` using the existing
server-only secret. Test lease expiry and a simulated serverless crash.

### Step 4: Commit

```text
feat: add attached editor content APIs
```

---

## Task 8: Implement Private Media Upload and First-Party Delivery

**Caleb V3 files:**

- Create: `src/lib/site-editor/media-store.ts`
- Create: `src/lib/site-editor/media-store.test.ts`
- Create: `src/lib/site-editor/media-route-handler.ts`
- Create: `src/lib/site-editor/media-route-handler.test.ts`
- Create: `src/app/api/builder/media/route.ts`
- Create: `src/lib/site-editor/site-media-route-handler.ts`
- Create: `src/lib/site-editor/site-media-route-handler.test.ts`
- Create: `src/app/api/site-media/[mediaId]/route.ts`
- Modify: `.env.example`

### Step 1: Write failing media tests

Cover JPEG/PNG/WebP signatures, MIME mismatch, malformed decode, 10 MiB limit,
8192-per-dimension limit, 40 MP limit, required alt, immutable object keys,
metadata failure cleanup, exact package `MediaAsset`, canonical first-party
paths, cross-site rejection, draft-only 404/no-store, authenticated
draft/private-no-store, and published immutable caching.

### Step 2: Implement the server-only Storage client

Read only named server variables for the existing Supabase project, dedicated
private bucket, and service credential. Never expose provider credentials or
physical object keys. Fill `siteId`, `userId`, source, timestamps, dimensions,
`path`, and `url` on the server.

### Step 3: Implement list/upload/serve routes

`GET /api/builder/media` lists fixed-site assets. Multipart upload validates
file/label/alt before storage and returns exact `MediaAsset`. The first-party
serve route checks seeded/published/draft authorization before returning bytes
and correct cache/sniffing headers.

### Step 4: Commit

```text
feat: add private site media workflow
```

---

## Task 9: Add Preview Routing and Consolidated Security Headers

**Caleb V3 files:**

- Create: `src/lib/site-editor/preview-paths.ts`
- Create: `src/lib/site-editor/preview-paths.test.ts`
- Create: `src/components/site-editor/caleb-preview-bridge.tsx`
- Create: `src/components/site-editor/caleb-preview-bridge.test.tsx`
- Create: `src/app/admin/editor/preview/[[...page]]/page.tsx`
- Modify: `src/lib/security-headers.ts`
- Modify: `src/lib/security-headers.test.ts` or create it if absent
- Modify: `next.config.ts`

### Step 1: Write failing route/header tests

Prove empty optional catch-all maps to `/`, nested pages map canonically, only
declared paths pass, and preview messages require exact parent origin, site ID,
page, region, and protocol. Assert exactly one effective CSP per route.

### Step 2: Split header policies without duplicate CSP

Exclude both website-editor route families from the global header matcher.
Apply one consolidated host CSP permitting same-origin preview frames while the
host remains non-frameable. Apply one consolidated preview CSP permitting only
same-origin framing plus `SAMEORIGIN`, `private, no-store`, and `noindex`.

### Step 3: Implement the normalized bridge

Emit canonical public pathnames instead of private preview URLs and reject all
unexpected messages. Internal preview navigation stays inside the private
surface.

### Step 4: Commit

```text
feat: add isolated draft preview surface
```

---

## Task 10: Build the Staff Workspace and Typed Editor Controller

**Caleb V3 files:**

- Create: `src/components/admin/staff-workspace-shell.tsx`
- Create: `src/components/admin/staff-workspace-shell.test.tsx`
- Create: `src/components/admin/staff-workspace-shell.module.css`
- Create: `src/components/site-editor/caleb-attached-website-editor.tsx`
- Create: `src/components/site-editor/caleb-attached-website-editor.test.tsx`
- Create: `src/components/site-editor/caleb-region-inspector.tsx`
- Create: `src/components/site-editor/caleb-media-workspace.tsx`
- Create: `src/components/site-editor/caleb-editor-controller.ts`
- Create: `src/components/site-editor/caleb-editor-controller.test.ts`
- Create: `src/components/site-editor/caleb-attached-website-editor.module.css`
- Create: `src/app/admin/editor/website/page.tsx`
- Modify: `src/app/admin/editor/page.tsx`
- Modify: `src/app/admin/editor/speaking-engagements/page.tsx`
- Modify: `src/app/admin/editor/layout.tsx`
- Modify: `src/lib/staff/editor-paths.ts`
- Modify: `src/lib/staff/editor-paths.test.ts`

### Step 1: Write failing workspace and state tests

Cover Website Editor default routing, Speaking Engagements continuity,
desktop/tablet/mobile navigation, page/region selection, plain-text/image-only
controls, draft save, publish confirmation, history, restore/undo, media,
preserved local text on conflict, and every typed controller state.

### Step 2: Compose published editor primitives

Use `BuilderAppShell`, `ResponsiveNavigation`, `WebsitePreviewWorkspace`,
history/media display primitives, and package message/value types. Do not mount
the stock `AttachedSiteEditor`, rich-text inspector, manual URL field, or package
adapter factory.

### Step 3: Implement the local inspector/controller

Expose only a text input/textarea or staged image file+label+alt form. Send the
exact local API contract and version tokens. Poll revalidation status; show the
approved pending messages and require AAL2 before retrying a failed refresh.

### Step 4: Preserve Speaking Engagements

Move it under the shared shell without changing its Growth runtime, lead
queries, mutations, or tests. `/admin/editor` defaults to Website Editor and
continues to fail closed to the existing Staff login.

### Step 5: Commit

```text
feat: add Caleb staff website editor
```

---

## Task 11: Share Public Page Views and Resolve Published/Draft Content

**Caleb V3 files:**

- Create: `src/components/site-pages/page-view-registry.tsx`
- Create: `src/components/site-pages/page-view-registry.test.tsx`
- Create one shared view component for each current public route under
  `src/components/site-pages/`
- Create: `src/components/site-content/editable-text.tsx`
- Create: `src/components/site-content/editable-image.tsx`
- Create: `src/components/site-content/site-page-content.tsx`
- Create associated focused tests
- Modify: `src/app/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/speaking/page.tsx`
- Modify: `src/app/schools-colleges/page.tsx`
- Modify: `src/app/faith-events/page.tsx`
- Modify: `src/app/conferences-workshops/page.tsx`
- Modify: `src/app/book-media/page.tsx`
- Modify: `src/app/faq/page.tsx`
- Modify: `src/app/book-caleb/page.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/thank-you/page.tsx`
- Modify: `src/components/structured-data.tsx`

### Step 1: Write fallback and isolation tests before refactoring

Snapshot the approved current render for every route. Prove an empty/unavailable
content store renders the same code fallback and that a draft can appear only
under the authenticated preview route.

### Step 2: Extract shared route views

Make public routes and private preview call the same view components. Route
files keep metadata and fetch only published content; the preview registry
loads draft-over-published-over-fallback. Do not duplicate page markup.

### Step 3: Wire only Appendix A regions

Add selection attributes and resolved values only to declared regions. Keep
forms, legal copy, contacts, authority facts, links, buttons, video,
receipt-state data, and all other elements locked. FAQ visible content and
JSON-LD must use the same resolved array.

### Step 4: Commit

```text
feat: resolve editable content in Caleb pages
```

---

## Task 12: Regenerate Installation Artifacts and Add Runtime Evidence Tests

**Caleb V3 files:**

- Modify: `scripts/generate-installation-manifests.mjs`
- Modify: `scripts/generate-installation-key-binding.mjs` only if the current
  digest input contract requires it
- Modify: `scripts/preflight-installation-runtime.mjs`
- Modify: `src/lib/platform/installation/manifest.ts`
- Modify: `src/lib/platform/installation/health-source.ts`
- Modify: relevant focused tests
- Regenerate: `.builder/installation-manifest.json`
- Regenerate: `.builder/site-runtime.json`
- Regenerate: `.builder/installation-key-binding.json`

### Step 1: Add failing integrity tests

Require the nine packages, exact schema/route arrays, `0015` checksum evidence,
revalidation-worker reachability, and binding between manifest digest, runtime
marker, and installation key binding.

### Step 2: Regenerate from source

Run the existing generators; never hand-edit the three generated artifacts.
Keep the existing installation identity/key unless the generator contract
requires a reviewed rotation. Do not consume a new exchange.

### Step 3: Run preflight and commit

Commit source, tests, and generated non-secret artifacts:

```text
build: register attached editor runtime
```

---

## Task 13: Complete Local Verification

### Step 1: Run focused suites after every task

Use Vitest file targets during red-green-refactor. Before declaring the branch
ready, run:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run builder:preflight-installation
npm run builder:check-installation-secrets
npm run check:no-highlevel
git diff --check
```

### Step 2: Run isolated database verification

Run the platform `0015` contract runner plus the full migration/conformance
suites against disposable databases only. No automated test may point at
Caleb's Preview or Production Neon database.

### Step 3: Run the responsive/browser matrix

Test every public route plus login, Website Editor, Speaking Engagements, and
private preview at desktop, tablet, and representative mobile widths. Verify
fallback parity, selection, draft isolation, publish/rollback/undo, conflict,
media cache rules, CSP framing, accessibility, keyboard flow, no horizontal
overflow, no secret-bearing output, and no unexpected console/network errors.

### Step 4: Produce a local readiness report

Report exact commits, test counts, the `0015` checksum, manifest/runtime
digests, and clearly separate automated browser coverage from physical-device
testing.

---

## Task 14: Preview Rollout — Separate Explicit Authorization Gate

This task begins only after the user explicitly authorizes Preview provider and
database changes.

1. Prove the exact Preview Neon target and migration lineage through `0014`.
2. Create a recoverable Preview branch/checkpoint.
3. Apply only reviewed `0015` with the recorded checksum.
4. Create the dedicated private Supabase bucket and save only Preview-scoped
   server variables.
5. Provision only `core.website` read/write entitlements and the approved six
   website capabilities for Caleb Owner and Administrator/Operator.
6. Deploy the branch-scoped Preview and capture the new installation health
   evidence/digest without changing DNS.
7. Use clearly labeled test text/image content to verify draft isolation,
   concurrent conflict, publish, refresh completion, history, rollback, undo,
   media access/caching, audit attribution, outage fallback, and both Staff
   destinations.
8. Restore the tested public override to the code fallback state before the
   Preview gate is marked complete.

No Production database, Production bucket, public DNS, HighLevel, Stripe,
commerce order, or real inquiry is touched in this task.

---

## Task 15: Production Enablement — Separate Explicit Authorization Gate

This task begins only after Preview acceptance is complete and the user
explicitly authorizes Production database/provider/deployment actions.

1. Prove the exact Production Neon target and checksum-valid lineage through
   `0014`; create a fresh recovery branch.
2. Apply only reviewed `0015` and verify the installed checksum/schema.
3. Create/verify the Production private media bucket and save Production-only
   server variables; never copy Preview credentials.
4. Provision only the approved website entitlements/capabilities for the two
   approved roles.
5. Push the reviewed Caleb commits to the approved production branch and create
   the Vercel Production deployment.
6. Verify the installation digest/key binding and signed worker health.
7. Sign in through `/admin/editor`, open Website Editor and Speaking
   Engagements, preview every route, and confirm all public pages still render
   their original code fallbacks with no published override.
8. Verify Staff Login resolves to `https://calebjakes.com/admin/editor`, public
   DNS remains unchanged by this feature, and no real content is published as
   part of enablement.

Ordinary Staff publishing begins only after this no-change Production
acceptance passes.

---

## Rollback Checkpoints

- **Before Preview migration:** code rollback is the prior commit; no provider
  state exists.
- **After Preview migration but before publication:** redeploy the prior build;
  additive `0015` tables and private bucket may remain inert.
- **After Production deployment but before publication:** restore the prior
  Vercel deployment; retain additive data and media.
- **After any content publication:** deploy a compatible read-only build that
  still resolves published snapshots; never roll back to code that silently
  discards approved content. Use version restore for content and the verified
  Neon recovery branch only for a separately reviewed database emergency.
- Never delete media referenced by any version or rewrite append-only audit and
  command evidence.

## Completion Evidence

The work is complete only when the report distinguishes and supplies evidence
for all of the following:

- package/install contract and `0015` checksum;
- isolated PostgreSQL and authorization tests;
- full Caleb lint/typecheck/test/build/preflight/secret checks;
- responsive browser route matrix;
- protected Preview acceptance;
- Production no-change acceptance;
- current Staff Login/editor and Speaking Engagements navigation; and
- any physical-device tests actually performed (never inferred from responsive
  browser checks).
