# Native Speaking Inquiry Replacement Implementation Plan

> **Status:** Awaiting implementation-plan approval
>
> **Approved design:**
> `docs/superpowers/specs/2026-08-28-native-speaking-inquiry-replacement-design.md`
>
> **Production boundary:** No DNS change, HighLevel mutation, commerce
> activation, Stripe order, or customer-library work.

## Goal

Replace Caleb V3's HighLevel-dependent speaking-inquiry runtime with a native,
site-local Neon workflow. One valid distinct event inquiry must durably create
one submission, one resolved contact, one `Speaking Engagements` lead, and two
idempotent email jobs. The public receipt must be truthful even when Resend is
temporarily unavailable. Caleb and the operator must be able to inspect and
manage those leads through an authenticated site-editor workspace.

## Repositories and Branches

- Caleb client application:
  `D:\Motivational Speaker Caleb\V3`, branch `main`
- Reusable platform source and portable migrations:
  `D:\Project Morales\site-editor-platform\.worktrees\caleb-automations-design`,
  branch `codex/caleb-commerce-automations-design`
- Published client contracts: exact `@reuben-williams/*` version `0.5.0`

The commerce integration branch is not merged into `main`. The native inquiry
slice installs only its approved direct packages and does not activate commerce
routes, Stripe, products, or fulfillment.

## Fixed Technical Decisions

- Next.js App Router on Vercel's Node.js runtime
- site-local Neon/Postgres as the durable system of record
- Upstash only for rate limiting and a short request-processing lease
- Turnstile Managed verification before persistence
- Resend transactional delivery after database acceptance
- database-fenced outbox claims and append-only attempts
- central site-editor Supabase Auth for staff identity verification only
- Caleb's Neon tables for membership, roles, capabilities, entitlements, and
  revocation
- published Growth Leads records and UI for `Speaking Engagements`
- 400-day reviewed inquiry retention policy
- test-driven implementation with narrow commits at each green checkpoint

## Global Safety Rules

1. Do not stage or rewrite the user's existing `next-env.d.ts`, video files, or
   `output/` directory.
2. Do not expose, print, commit, or copy provider credentials.
3. Do not use Preview provider credentials in Production or share customer data
   between environments.
4. Do not apply a migration until the exact Neon target, installed checksums,
   backup/recovery point, and rollback path are verified.
5. Do not claim receipt unless the Neon transaction committed.
6. Do not fall back to HighLevel after native acceptance.
7. Do not add a public admin link or index an owner-data route.
8. Do not send an email except to the verified internal inbox or the organizer
   address stored on the accepted submission.

## Task 1: Freeze Package and Branch Provenance

**Caleb V3 files:**

- Modify: `.npmrc`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/platform/native-package-contract.test.ts`

**Step 1: Write the failing package contract**

Assert that the direct dependencies are exactly version `0.5.0` for:

- `@reuben-williams/core`
- `@reuben-williams/next`
- `@reuben-williams/forms`
- `@reuben-williams/growth-core`
- `@reuben-williams/growth-customers`
- `@reuben-williams/growth-leads`
- `@reuben-williams/growth-messaging`

Also assert that no commerce package or internal `@your-builder/*` package is a
new direct dependency.

Run:

```powershell
npx vitest run src/lib/platform/native-package-contract.test.ts
```

Expected: fail because `main` does not yet declare the platform packages.

**Step 2: Install the exact release**

Reuse the secret-safe GitHub Packages registry configuration already rehearsed
on the commerce branch. Install the exact direct set without copying platform
source into Caleb V3.

Run the focused test again, then:

```powershell
npm ci
npm run typecheck
```

Expected: the package contract and typecheck pass with a lockfile containing
only the approved `0.5.0` release closure.

**Step 3: Commit the green checkpoint**

```powershell
git add -- .npmrc package.json package-lock.json src/lib/platform/native-package-contract.test.ts
git commit -m "build: attach native inquiry platform contracts"
```

## Task 2: Add the Portable Native Inquiry Schema

**Platform worktree files:**

- Create: `postgres/migrations/0010_native_growth_intake.sql`
- Create: `postgres/migrations/0011_native_speaking_inquiry_delivery.sql`
- Create: `postgres/migrations/0012_native_forms_privacy_lifecycle.sql`
- Create: `packages/testing/tests/native-speaking-inquiry-postgres.test.ts`
- Create: `scripts/run-native-speaking-inquiry-contract-check.mjs`
- Modify: `package.json`
- Modify: `packages/testing/tests/postgres-migration-manifest.test.ts` if the
  existing manifest test uses that file; otherwise extend the current migration
  manifest test discovered during implementation

**Step 1: Write failing clean-database and schema-contract tests**

The tests must prove that migrations `0001` through `0012` are contiguous and
checksum-stable and that a clean Postgres database contains the published table
shapes required for:

- form submissions, results, and consent evidence;
- contacts and site-scoped identities;
- leads and lead events;
- the general message outbox and append-only attempts;
- the inquiry HMAC identity/receipt ledger;
- staff authorization and entitlements; and
- retention policies, deletion requests, tombstones, and purge receipts.

Expected failure: `0010` through `0012` and the native contracts do not exist.

**Step 2: Implement `0010_native_growth_intake.sql`**

Port the exact reusable Forms/Growth record shapes used by the published
contracts. Preserve `public_form` persistence, `created` lead events, status
`new`, and the authoritative version-1 enhanced submission result linking the
submission, contact, and lead. Do not add `submission_id` to `builder_leads`.

Add least-privilege ingestion functions that derive the site/runtime identity
from the database session, never from public JSON.

**Step 3: Implement `0011_native_speaking_inquiry_delivery.sql`**

Add the append-only inquiry identity ledger, stable public receipt, general
message outbox, append-only delivery attempts, fenced 60-second leases, retry
state, dead-letter state, and reconciliation-required state. Enforce stable
site-scoped idempotency keys and prohibit arbitrary recipient mutation.

**Step 4: Implement `0012_native_forms_privacy_lifecycle.sql`**

Port the complete reusable Forms privacy lifecycle. Cover every PII copy in
submissions, identities, messages, outbox data, attempts, and projections.
Provision a reviewed 400-day Caleb policy through a site-scoped command rather
than a global default.

**Step 5: Run the platform checks**

```powershell
npm run test:native-inquiries:contracts
npm run test:staff-auth:contracts
npm run test:neon:conformance
npm run typecheck
```

Expected: clean schema creation, checksum verification, RLS/authorization,
retention, and conformance checks pass.

**Step 6: Commit the platform checkpoint**

Commit only the new migrations, tests, runner, and script entry on
`codex/caleb-commerce-automations-design`.

## Task 3: Build the Atomic Caleb Neon Adapter

**Caleb V3 files:**

- Create: `src/lib/inquiries/native-contracts.ts`
- Create: `src/lib/inquiries/native-gateway.ts`
- Create: `src/lib/inquiries/native-gateway.test.ts`
- Create: `src/lib/inquiries/postgres-inquiry-repository.ts`
- Create: `src/lib/inquiries/postgres-inquiry-repository.test.ts`
- Create: `src/lib/platform/postgres-data-plane.ts`
- Create: `tests/server-only.ts`
- Modify: `vitest.config.ts`

**Step 1: Write failing transaction tests**

Use a deterministic fake transaction boundary first. Cover:

- new contact and new inquiry;
- existing contact and distinct new inquiry;
- exact replay;
- concurrent exact replay;
- HMAC previous-key replay;
- attribution-only correction without a second lead;
- event-defining change with a second lead for the same contact;
- conflicting email/phone identities failing closed;
- rollback after any record or outbox failure; and
- no provider or database identifiers in the public receipt.

Expected failure: no native repository or gateway exists.

**Step 2: Implement the repository transaction**

Use the published Postgres data-plane boundary. In one retry-safe transaction:

1. query every active/previous HMAC candidate;
2. return the original acceptance if any candidate exists;
3. store the immutable submission and consent evidence;
4. resolve or create the contact and normalized identities;
5. create the `website_form` lead and initial `created` event;
6. create the enhanced version-1 submission result;
7. append the organizer and internal notification outbox jobs; and
8. write the active-key receipt ledger row.

The repository receives a fixed server-side site/runtime session. It never
accepts a site ID, member ID, capability list, sender, or recipient from the
request.

**Step 3: Implement the gateway mapping**

Map `website_form` to persisted `public_form`, service key
`speaking-engagement`, and UI label `Speaking Engagements`. Preserve the exact
event-identity field inclusion/exclusion contract from the approved design.

**Step 4: Run focused tests and commit**

```powershell
npx vitest run src/lib/inquiries/native-gateway.test.ts src/lib/inquiries/postgres-inquiry-repository.test.ts
npm run typecheck
```

Commit only the native data-plane adapter and tests.

## Task 4: Make Neon the Public Acceptance Boundary

**Caleb V3 files:**

- Modify: `src/lib/inquiries/service.ts`
- Modify: `src/lib/inquiries/service.test.ts`
- Modify: `src/lib/inquiries/runtime.ts`
- Modify: `src/lib/inquiries/runtime.test.ts`
- Modify: `src/lib/inquiries/upstash-store.ts`
- Modify: `src/lib/inquiries/upstash-store.test.ts`
- Modify: `src/lib/inquiries/route-handler.test.ts`
- Modify: `src/app/api/inquiries/route.ts`

**Step 1: Rewrite the service tests before the implementation**

Freeze the public behaviors for invalid input, failed Turnstile, rate limiting,
processing conflicts, database unavailability, accepted inquiries, and exact
replays. Assert Turnstile and rate limiting run before Neon and that Resend is
not the acceptance boundary.

**Step 2: Narrow Upstash to coordination**

Keep the current 15-minute and 24-hour rate limits and a short processing lease.
Remove authoritative accepted/contact/opportunity state from the request path.
The Neon transaction resolves every replay after a lease race or expiration.

**Step 3: Replace the runtime dependency graph**

Construct the fixed Postgres data plane and `NativeInquiryGateway`. Remove every
`HIGHLEVEL_*` requirement and replace it with validated `DATABASE_URL`, stable
site/runtime identity, and minimum capability configuration. Keep secret-safe
diagnostics.

**Step 4: Run the route/service/runtime suite**

```powershell
npx vitest run src/lib/inquiries/service.test.ts src/lib/inquiries/runtime.test.ts src/lib/inquiries/route-handler.test.ts src/lib/inquiries/upstash-store.test.ts
```

Expected: database commit returns `accepted`; exact replay returns the stored
receipt; database failure returns `503`; no test instantiates HighLevel.

**Step 5: Commit the green checkpoint**

Commit only the public inquiry runtime changes and tests.

## Task 5: Implement Database-Leased Resend Delivery

**Caleb V3 files:**

- Modify: `src/lib/inquiries/resend-delivery.ts`
- Modify: `src/lib/inquiries/email-renderer.ts`
- Modify: `src/lib/inquiries/email-renderer.test.ts`
- Create: `src/lib/inquiries/outbox-worker.ts`
- Create: `src/lib/inquiries/outbox-worker.test.ts`
- Create: `src/lib/inquiries/worker-auth.ts`
- Create: `src/lib/inquiries/worker-auth.test.ts`
- Create: `src/app/api/inquiries/workers/email/route.ts`
- Create: `src/app/api/cron/inquiries-email/route.ts`
- Create: `vercel.json`

**Step 1: Write failing delivery and concurrency tests**

Cover recipient allowlisting, provider idempotency, immediate/Cron races,
fenced lease takeover, stale completion rejection, delays of 1/5/15/60 minutes,
dead letter, uncertain-outcome reconciliation, and append-only attempts.

**Step 2: Implement one worker service**

Both the post-commit immediate attempt and scheduled invocation call the same
claim/process/complete functions. Neon owns lease state and attempt numbering;
Upstash is not involved.

**Step 3: Add two protected adapters**

- `POST /api/inquiries/workers/email` validates the dedicated operational worker
  secret and accepts no public job parameters.
- `GET /api/cron/inquiries-email` validates Vercel's `CRON_SECRET`, accepts no
  query/body parameters, and directly invokes the same worker service.

Configure the GET shim in `vercel.json` for `*/5 * * * *`. This requires the
already approved Vercel Pro project; current Vercel Hobby projects cannot run a
five-minute schedule.

**Step 4: Run tests and commit**

```powershell
npx vitest run src/lib/inquiries/email-renderer.test.ts src/lib/inquiries/outbox-worker.test.ts src/lib/inquiries/worker-auth.test.ts
npm run typecheck
```

Commit the worker, routes, schedule, and tests.

## Task 6: Add Staff Authentication and Speaking Engagements

**Caleb V3 files:**

- Create: `src/lib/staff/session.ts`
- Create: `src/lib/staff/session.test.ts`
- Create: `src/lib/staff/authorization.ts`
- Create: `src/lib/staff/authorization.test.ts`
- Create: `src/lib/staff/lead-repository.ts`
- Create: `src/lib/staff/lead-repository.test.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/editor/layout.tsx`
- Create: `src/app/admin/editor/speaking-engagements/page.tsx`
- Create: `src/app/api/admin/speaking-engagements/[leadId]/route.ts`
- Create: `src/components/admin/speaking-engagements-workspace.tsx`
- Create: `src/components/admin/speaking-engagements-workspace.test.tsx`
- Modify: `src/app/robots.ts`

**Step 1: Write failing authorization tests**

Cover valid owner/operator sessions, wrong issuer/audience, expired sessions,
revocation, inactive membership, missing entitlement, missing capability,
cross-site access, browser-supplied role/site rejection, and private/no-store
responses.

**Step 2: Verify identity and authorize from Neon**

Use the published provider-neutral staff-session verifier and Postgres staff
authorization adapter. Supabase Auth verifies identity only. Every read and
mutation reloads Caleb's Neon membership and capabilities.

**Step 3: Add the native workspace**

Render the published Growth Leads UI through a Caleb adapter labeled
`Speaking Engagements`. Support only approved contract operations: view leads,
view the linked organizer/event summary, move pipeline status, add supported
tasks/notes, and inspect safe notification state.

**Step 4: Keep the route private**

Do not add the route to the public header/footer. Add non-indexing metadata and
`Cache-Control: private, no-store` for every owner-data response.

**Step 5: Run tests and commit**

Run the staff and workspace suites, typecheck, and commit only the authenticated
editor slice.

## Task 7: Complete Privacy and Retention Operations

**Caleb V3 files:**

- Modify: `src/app/privacy/page.tsx`
- Create: `src/lib/privacy/retention-worker.ts`
- Create: `src/lib/privacy/retention-worker.test.ts`
- Create: `src/app/api/privacy/workers/retention/route.ts`
- Create: `src/app/api/cron/inquiries-retention/route.ts`
- Modify: `vercel.json`

**Step 1: Write failing privacy-contract tests**

Assert the public copy describes site-local inquiry storage, Turnstile/rate
limiting, Resend delivery, and the real request path. Assert it no longer says a
separate CRM stores records or that complete submissions are not stored.

Test 400-day policy, verified deletion, tombstones, PII redaction, restrictive
foreign keys, and safe retained evidence.

**Step 2: Implement retention processing**

Add a POST-only operational retention worker and a separate daily GET Cron shim
protected by `CRON_SECRET`. Both call the authorized database purge function;
neither accepts a site or retention duration from the request.

**Step 3: Run tests and commit**

Commit the privacy page, retention runtime, schedule change, and tests.

## Task 8: Remove the HighLevel Runtime and Document the Native Workflow

**Caleb V3 files:**

- Delete after native tests are green:
  `src/lib/inquiries/highlevel-client.ts` and its test
- Delete after native tests are green:
  `src/lib/inquiries/highlevel-contract.ts` and its test
- Delete after native tests are green:
  `src/lib/inquiries/highlevel-field-manifest.ts` and its test
- Delete after native tests are green:
  `src/lib/inquiries/highlevel-gateway.ts` and its test
- Delete after native tests are green:
  `src/lib/inquiries/highlevel-mapping.ts` and its test
- Delete: `src/lib/inquiries/__fixtures__/highlevel/`
- Modify: `.env.example` if present on the execution branch
- Create: `docs/runbooks/native-speaking-inquiry-workflow.md`
- Create: `docs/evidence/native-speaking-inquiry-release-checklist.md`
- Modify: `docs/runbooks/highlevel-speaking-inquiry-workflow-setup.md`

**Step 1: Add a source scan that fails while HighLevel is reachable**

The scan must reject HighLevel imports, runtime environment reads, HTTP hosts,
and fixtures from production/test source. Historical evidence and the archived
runbook may retain clearly labeled source facts.

**Step 2: Remove the adapter and update operations documentation**

The native workflow guide must explain, in beginner-readable language:

1. validation and security checks;
2. distinct event identity and replay behavior;
3. contact and `Speaking Engagements` lead creation;
4. organizer/internal email delivery and retries;
5. pipeline status, tasks, and notes;
6. privacy, retention, and deletion;
7. staff access and roles;
8. failure states, monitoring, and recovery; and
9. what was faithfully carried over from HighLevel versus intentionally left
   behind.

Mark the HighLevel setup runbook as historical and inactive; do not modify
HighLevel itself.

**Step 3: Run the source scan and commit**

Commit code removal and the native operating documentation.

## Task 9: Verify Locally Before Any Provider Mutation

Run in Caleb V3:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Also run:

- a secret scan over tracked source and built output;
- a no-HighLevel runtime scan;
- route tests for direct/deep URLs;
- 390-pixel mobile and desktop booking-page checks;
- Turnstile loading, keyboard, error, and reduced-motion checks;
- thank-you receipt-state checks; and
- editor authentication/no-store/non-indexing checks.

Do not continue if any test is skipped because a provider is unavailable; record
the blocked acceptance explicitly.

## Task 10: Apply and Prove the Native Preview

**Preflight:**

1. resolve the approved Preview Neon host/database without printing credentials;
2. verify it is not Production;
3. read installed migration names/checksums;
4. create or verify a recoverable Neon branch/checkpoint;
5. confirm migrations `0001` through `0009` match the approved manifest; and
6. produce a dry-run manifest for `0010` through `0012`.

Apply only the verified additive migrations to the approved Preview database.
Seed the fixed Preview site/runtime identity, 400-day policy, staff membership,
capabilities, and entitlements through reviewed site-scoped commands.

Deploy a branch-scoped Vercel Preview with Preview-only values. Submit one
clearly labeled native test inquiry only after Turnstile succeeds. Verify:

- one submission and consent record;
- one contact;
- one `Speaking Engagements` lead;
- one version-1 enhanced result;
- two outbox items and no duplicate delivery;
- expected emails;
- correct editor projection;
- exact replay returns the original receipt; and
- zero HighLevel calls.

No DNS or commerce action occurs.

## Task 11: Create and Verify the Production Candidate

Before applying Production migrations, repeat the exact target/checksum/backup
preflight against Caleb's Production Neon database. Apply only verified
`0010`-`0012`, then deploy the approved commit to the fixed Vercel production
hostname while public DNS remains unchanged.

Run one clearly labeled native production-candidate inquiry and verify the same
database, email, editor, replay, and zero-HighLevel evidence. Check Vercel logs,
cron registration, SSL on the fixed hostname, direct routes, mobile layout,
console/network errors, and operational worker status.

If acceptance fails, roll back to a native fail-closed deployment that presents
Caleb's phone/email alternatives and preserves stored Neon records. Do not
reactivate HighLevel.

## Task 12: Retire Credentials and Produce the Go/No-Go Report

Only after the native production-candidate acceptance is green:

1. remove all `HIGHLEVEL_*` variables from Vercel;
2. revoke the HighLevel runtime token without modifying Caleb's historical
   workflows or records;
3. redeploy;
4. prove the booking route remains ready with no HighLevel configuration;
5. verify scheduled outbox and retention shims are registered; and
6. issue a launch report covering code revision, migrations, tests, providers,
   editor access, emails, rollback, remaining manual actions, and DNS readiness.

Public DNS remains unchanged until separately authorized.

## Completion Criteria

The implementation is complete when:

- the published 0.5.0 platform contracts are pinned and verified;
- portable migrations `0001`-`0012` are checksum-verified;
- a valid inquiry atomically creates one native contact and one lead;
- exact replay creates no duplicate lead or email;
- Resend failure cannot erase an accepted inquiry;
- the authenticated editor displays the lead with safe delivery status;
- 400-day retention/deletion behavior is tested;
- HighLevel is absent from the runtime and Vercel configuration;
- all local and hosted acceptance checks are green;
- no DNS or commerce change occurred; and
- the native workflow and rollback procedure are documented.
