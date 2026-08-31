# Caleb Managed Control-Plane Installation Implementation Plan

> **Status:** Implementation plan only. The design is approved, but this plan
> does not authorize code changes, provider changes, database writes, exchange
> token use, deployment, package activation, DNS changes, booking inquiries, or
> commerce orders.

**Goal:** Attach Caleb V3 to the SaveYour control plane as a fully managed,
site-isolated installation while keeping Caleb's public website, native booking,
staff workspace, commerce runtime, and customer data in Caleb's existing Vercel
and Neon data plane.

**Architecture:** Caleb's Vercel project will host a protected, scheduled
installation worker. The worker will use the published
`@reuben-williams/*@0.5.0` contracts, a closed three-command handler registry,
and a dedicated least-privilege Neon role. Production Neon will durably store
installation identity, fenced leases, idempotent command receipts, managed
module configuration, and sanitized health facts. The control plane will only
coordinate signed, site-scoped installation commands and health; it will never
receive direct database access or arbitrary code/SQL capability.

**Technology:** Next.js 16, TypeScript, Vitest, Vercel Functions and Cron,
Neon/PostgreSQL, `pg`, published `@reuben-williams/*@0.5.0` packages, Ed25519
installation credentials, and the existing SaveYour control plane.

**Repositories:**

- Caleb V3: `D:\Motivational Speaker Caleb\V3`
- Canonical migration worktree:
  `D:\Project Morales\site-editor-platform\.worktrees\caleb-automations-design`

**Safety boundary:** Preserve `next-env.d.ts`, the two user-owned video files,
`output/`, and every unrelated working-tree change. Stage each checkpoint by
explicit path. Never print or commit a database URL, private JWK, exchange token,
cron secret, provider credential, customer record, or protected receipt body.

---

## Task 1: Freeze the Exact Client Package and Repository Contract

**Caleb V3 files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `src/lib/platform/native-package-contract.test.ts`
- Create: `src/lib/platform/installation/package-contract.test.ts`

### Step 1: Write the failing managed-installation package test

Assert all directly used client packages are pinned to the literal version
`0.5.0`, the CLI is a literal `0.5.0` development dependency, and no internal
`@your-builder/*` package or broad version range is present. Assert the direct
runtime package set is exactly Core, Next, Forms, Growth Core, Growth Customers,
Growth Leads, and Growth Messaging.

Run:

```powershell
npx vitest run src/lib/platform/native-package-contract.test.ts src/lib/platform/installation/package-contract.test.ts
```

Expected: the new installation-specific assertions fail before the contract is
implemented.

### Step 2: Freeze ignored local secret/setup state

Add these local-only paths to `.gitignore`:

- `.builder/secrets/`
- `.builder/setup-lock.json`
- `.builder/setup-journal.json`
- `.builder/installation-registration.pending.json`
- `.builder/*.tmp`

Add only variable names and explanations to `.env.example`:

- `BUILDER_CONTROL_PLANE_URL`
- `BUILDER_INSTALLATION_ID`
- `BUILDER_INSTALLATION_KEY_ID`
- `BUILDER_INSTALLATION_PRIVATE_JWK`
- `BUILDER_DATABASE_URL`
- existing `CRON_SECRET`

Document that the exchange token is stdin-only and is never an environment
variable.

### Step 3: Verify the exact lockfile closure

Run `npm ci`, the focused package tests, typecheck, and a source scan rejecting
`@your-builder/*`. The lockfile may include transitive packages, but the
installation manifest must never present them as directly activated modules.

### Step 4: Commit the package checkpoint

Stage only the six paths named above and commit:

```text
build: freeze managed installation contracts
```

---

## Task 2: Add the Additive Portable Installation Schema

**Platform worktree files:**

- Create: `postgres/migrations/0013_managed_installation_runtime.sql`
- Create: `packages/testing/tests/managed-installation-postgres.test.ts`
- Create: `scripts/run-managed-installation-contract-check.mjs`
- Modify: `package.json`
- Modify: `packages/content/tests/migration-manifest.test.ts`
- Modify: `packages/content/src/migration-manifest.ts` only if the discovered
  manifest contract requires an explicit entry

### Step 1: Preflight the authoritative migration lineage

Before editing, confirm the named platform worktree is on
`codex/caleb-commerce-automations-design`, is clean for the target paths, and
contains checksum-matching `0001` through `0012`. Stop if any migration differs
from the exact sequence already applied to Caleb's approved databases.

### Step 2: Write failing clean-database and privilege tests

Tests must prove:

- migrations `0001` through `0013` are contiguous and checksum-stable;
- all four installation tables have the approved columns, unique constraints,
  foreign keys, check constraints, and timestamps;
- every receipt state transition is fenced and idempotent;
- every run lease uses a monotonically increasing fencing token;
- binding and rotation functions use exact compare-and-set inputs;
- the worker role cannot create, replace, rotate, or delete a binding;
- the operator role cannot be impersonated by public/browser roles; and
- Caleb and a second synthetic site cannot read, modify, or delete one another's
  identity, receipts, leases, configuration, or health facts.

Expected: fail because migration `0013` and its functions do not exist.

### Step 3: Implement `0013_managed_installation_runtime.sql`

Create only the approved additive objects:

- `builder_site_installations`
- `builder_installation_command_receipts`
- `builder_installation_worker_leases`
- `builder_module_configurations`
- five operator-only binding/rotation compare-and-set functions
- worker-only receipt, run-lease, managed-configuration, identity, and safe
  health functions

Do not alter inquiry, contact, lead, message, retention, commerce, staff, or
privacy records. Revoke public execution and grant the installation worker only
the minimum required function calls and safe identity reads.

### Step 4: Run the isolated Postgres contract suite

Run the new contract runner against an ephemeral database, then run the existing
migration manifest and Neon conformance suites. No test may point at Caleb's
Preview or Production database.

### Step 5: Commit the platform checkpoint

Commit only the migration, tests, runner, package script, and required manifest
change on the canonical platform branch:

```text
feat: add managed installation data plane
```

No package is published; `@reuben-williams/*` remains at `0.5.0`.

---

## Task 3: Generate and Validate the Closed Runtime Manifests

**Caleb V3 files:**

- Create: `src/lib/platform/installation/canonical-json.ts`
- Create: `src/lib/platform/installation/canonical-json.test.ts`
- Create: `src/lib/platform/installation/configuration-policy.ts`
- Create: `src/lib/platform/installation/configuration-policy.test.ts`
- Create: `src/lib/platform/installation/manifest.ts`
- Create: `src/lib/platform/installation/manifest.test.ts`
- Create: `src/lib/platform/installation/key-binding.ts`
- Create: `src/lib/platform/installation/key-binding.test.ts`
- Create: `scripts/generate-installation-manifests.mjs`
- Create: `scripts/generate-installation-key-binding.mjs`
- Create: `.builder/installation-manifest.json`
- Create: `.builder/site-runtime.json`
- Create: `.builder/caleb-configuration-policy.json`

### Step 1: Write failing canonicalization and schema tests

Freeze lexicographically sorted object keys, declared array order, UTF-8
SHA-256, lowercase hexadecimal digests, canonical UUIDs, canonical UTC
timestamps, strict unknown-field rejection, and public-JWK projection without
`d`.

### Step 2: Freeze the exact Caleb configuration policy

Generate and validate exactly these entries:

| Command | Version | Module | Module version | Config version |
| --- | ---: | --- | --- | ---: |
| `growth.customers.configure-v2` | 1 | `growth.customers` | `1.1.0` | 1 |
| `growth.leads.configure-v2` | 1 | `growth.leads` | `1.1.0` | 1 |
| `growth.messaging.configure` | 1 | `growth.messaging` | `1.0.0` | 1 |

Every entry uses idempotency `commandId` and configuration profile
`caleb-speaking-engagements-v1`. Any fourth handler, duplicate, wrong version,
wrong profile, or extra field fails closed.

### Step 3: Generate provisional runtime manifests

Generate the installed package facts and exact runtime bounds:

- worker version `0.5.0`
- run lease `120` seconds
- invocation timeout `45` seconds
- pull limit `1`
- command lease `60` seconds
- receipt lease `30` seconds
- handler timeout `20` seconds

At this stage `reachabilityEvidenceRevision` must remain an explicit blocked
placeholder that the strict validator rejects. The generator may produce a
review artifact, but setup cannot run and the exchange token cannot be
consumed.

### Step 4: Run tests and commit

Run the focused manifest tests, typecheck, and secret scan. Commit only the
generator, safe manifests, validators, and tests:

```text
feat: define Caleb installation manifests
```

---

## Task 4: Implement the Least-Privilege Neon Adapters

**Caleb V3 files:**

- Create: `src/lib/platform/installation/postgres-client.ts`
- Create: `src/lib/platform/installation/postgres-client.test.ts`
- Create: `src/lib/platform/installation/postgres-identity-store.ts`
- Create: `src/lib/platform/installation/postgres-identity-store.test.ts`
- Create: `src/lib/platform/installation/postgres-receipt-store.ts`
- Create: `src/lib/platform/installation/postgres-receipt-store.test.ts`
- Create: `src/lib/platform/installation/postgres-run-lease-store.ts`
- Create: `src/lib/platform/installation/postgres-run-lease-store.test.ts`
- Create: `src/lib/platform/installation/postgres-growth-configuration.ts`
- Create: `src/lib/platform/installation/postgres-growth-configuration.test.ts`

### Step 1: Write failing adapter conformance tests

Use deterministic fakes first, then an isolated Postgres database. Cover site
identity, wrong stable key, wrong installation, cross-site access, receipt exact
replay/conflict/contention/expiry/retry/completion, run-lease contention/renewal/
reclamation/fencing/loss, and managed configuration with disabled-by-default
state.

### Step 2: Implement one responsibility per adapter

Call only the migration's approved functions. Do not accept site identity from
an HTTP request or remote command. Never expose raw SQL errors, connection
details, receipt payloads, or customer records to logs or health.

### Step 3: Prove dedicated-role behavior

Run the same conformance suite with the installation-worker role and assert that
direct table mutation and operator binding/rotation calls fail.

### Step 4: Run focused tests and commit

Commit only the four adapters, the server-only connection boundary, and tests:

```text
feat: add fenced installation storage
```

---

## Task 5: Build the Exact Handler Registry and Managed Configuration Path

**Caleb V3 files:**

- Create: `src/lib/platform/installation/handlers.ts`
- Create: `src/lib/platform/installation/handlers.test.ts`
- Create: `src/lib/platform/installation/handler-policy.ts`
- Create: `src/lib/platform/installation/handler-policy.test.ts`

### Step 1: Write failing registry tests

Assert the published Growth factories are filtered to exactly three command
type/version pairs and the computed registry digest matches the manifest.
Reject unknown command types, unsupported versions, malformed payloads, an
accidental fourth handler, wrong module/config version, or wrong profile.

### Step 2: Implement the closed registry

Construct the published handlers, filter them through the committed Caleb
policy, and assert an exact set equality before runtime construction. Persist
configuration only through the fenced Growth configuration adapter.

### Step 3: Verify idempotent effects

Prove exact command replay cannot create a second configuration version or
change a module outside Caleb's allowlist.

### Step 4: Run focused tests and commit

```text
feat: register Caleb managed growth handlers
```

---

## Task 6: Compose the Fail-Closed Embedded Runtime

**Caleb V3 files:**

- Create: `src/lib/platform/installation/config.ts`
- Create: `src/lib/platform/installation/config.test.ts`
- Create: `src/lib/platform/installation/registration.ts`
- Create: `src/lib/platform/installation/registration.test.ts`
- Create: `src/lib/platform/installation/client.ts`
- Create: `src/lib/platform/installation/client.test.ts`
- Create: `src/lib/platform/installation/health-source.ts`
- Create: `src/lib/platform/installation/health-source.test.ts`
- Create: `src/lib/platform/installation/runtime.ts`
- Create: `src/lib/platform/installation/runtime.test.ts`
- Create: `tests/server-only.ts` only if the existing server-only guard cannot
  be reused

### Step 1: Write failing configuration and trust tests

Cover missing/malformed variables, wrong control-plane URL, wrong installation
or key ID, private/public JWK mismatch, manifest/registry/policy digest drift,
wrong Neon site UUID or stable key, non-active binding, stale deployment
evidence, unexpected endpoints, browser import, and safe error redaction.

### Step 2: Implement `createCalebInstallationRuntime`

Before constructing `createSiteInstallationRuntime`, parse all safe artifacts,
derive and compare every digest and identity binding, verify the exact four
published control-plane endpoint paths, check the active Neon binding, and
construct the published generic runtime with the Neon adapters and exact
handler registry.

### Step 3: Implement bounded health facts

Report only installation identity, worker/version/schema compatibility, safe
receipt/lease counts, allowed module states, and bounded safe codes. The first
slice reports empty queues/integrations and performs no customer/provider probe.

### Step 4: Verify runtime time budgets

Prove pull limit 1, minimum 30 seconds remaining before command execution,
60-second command lease, 30-second receipt lease, 20-second handler timeout,
signed result acknowledgement, and signed health report.

### Step 5: Run focused tests and commit

```text
feat: compose Caleb installation runtime
```

---

## Task 7: Add the Protected Scheduled Vercel Worker

**Caleb V3 files:**

- Create: `src/lib/platform/installation/route-handler.ts`
- Create: `src/lib/platform/installation/route-handler.test.ts`
- Create: `src/app/api/builder/workers/installation/route.ts`
- Modify: `vercel.json`

### Step 1: Write failing route tests

Cover GET with the exact constant-time `CRON_SECRET` bearer check, wrong method,
wrong token, query/body rejection, idle contention, complete, invalid config,
storage failure, sanitized runtime failure, 45-second timeout, and
`Cache-Control: private, no-store` on every response.

### Step 2: Implement the fixed-input route

The route accepts no site, installation, package, command, credential, recipient,
or other runtime parameter. It invokes only the server-composed Caleb runtime
and returns the approved bounded status codes and counts.

### Step 3: Add the five-minute schedule

Append `/api/builder/workers/installation` with schedule `*/5 * * * *` without
changing the existing inquiry email and retention schedules. Configure a
60-second Vercel maximum duration while keeping the internal timeout at 45
seconds.

### Step 4: Run route tests and commit

```text
feat: schedule Caleb installation worker
```

---

## Task 8: Add Secret-Safe Preflight, Rotation, and Operator Runbooks

**Caleb V3 files:**

- Create: `scripts/preflight-installation-runtime.mjs`
- Create: `scripts/preflight-installation-runtime.test.mjs`
- Create: `scripts/check-installation-secrets.mjs`
- Create: `scripts/check-installation-secrets.test.mjs`
- Create: `docs/runbooks/managed-control-plane-installation.md`
- Create: `docs/runbooks/managed-installation-key-rotation.md`
- Create: `docs/evidence/managed-installation-release-checklist.md`
- Modify: `package.json`

### Step 1: Write failing preflight tests

The preflight must block before stdin/token access when packages, runtime files,
digests, reachability evidence, routes, environment names, Neon identity, or
binding state are absent or inconsistent. Output may contain safe codes and
digests, never secret values.

### Step 2: Implement the release preflight

Add scripts for manifest validation, secret/bundle scanning, route contract
checks, package-lock integrity, environment-name inventory, database target
classification, migration audit, and binding comparison.

### Step 3: Document normal operation and key rotation

The beginner-readable runbooks must cover:

- how the embedded worker works;
- where Caleb's data remains;
- how to interpret idle, healthy, degraded, stopped, and failed states;
- how to pause command pulls;
- the `active -> rotation_pending -> active` maintenance-window sequence;
- ownership-checked old-key backup, overlap, rollback, and deletion;
- why no commands may run during binding drift; and
- exact rollback boundaries that preserve receipts and customer data.

### Step 4: Run documentation/source checks and commit

```text
docs: add managed installation operations
```

---

## Task 9: Complete Local and Isolated-Database Verification

### Step 1: Run every focused suite

Run the manifest, key binding, package, adapters, handlers, configuration,
runtime, health, route, and script suites plus the platform migration suite.

### Step 2: Run all Caleb V3 regression checks

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:no-highlevel
git diff --check
```

Also run a tracked-source/build-output secret scan and prove installation code
cannot enter the browser bundle.

### Step 3: Recheck existing product boundaries

Verify desktop and 390-pixel mobile public pages, native booking, Turnstile,
Resend outbox routes, staff sign-in/editor, privacy workers, Stripe test-only
commerce surfaces, direct routes, console/network errors, reduced motion, and
overflow. Do not submit an inquiry or order.

### Step 4: Produce a local go/no-go report

The report must identify exact commits, tests, migration checksum, manifests,
remaining blocked placeholder, and the next provider authorization. Stop on any
skipped or failing acceptance item.

---

## Task 10: Prove Preview Without Consuming the Exchange Token

> **Authorization gate:** This task requires separate approval for Preview
> database migration and Vercel Preview deployment. It does not authorize
> Production, an exchange, package activation, DNS, an inquiry, or an order.

### Step 1: Audit the Preview database target

Resolve the target without printing credentials, prove it is the approved
Preview branch, verify migrations `0001–0012`, create/verify a recoverable
checkpoint, and dry-run only `0013`.

### Step 2: Apply `0013` and create a Preview worker role

Apply only the checksum-reviewed additive migration. Create the dedicated role
with minimum grants and save its pooled connection as Preview-only
`BUILDER_DATABASE_URL`. Do not insert an accepted installation binding.

### Step 3: Deploy a protected candidate

Add only non-registration candidate settings, deploy the exact reviewed commit,
and verify `/api/builder/workers/installation` exists, rejects unauthorized and
parameterized calls, and returns safe fail-closed configuration status.

### Step 4: Record immutable reachability evidence

Write the candidate Vercel deployment ID to
`.builder/site-runtime.json`, regenerate/review all digests, rebuild, and deploy
the rebuilt candidate. Reverify the route and every application regression.

### Step 5: Commit the evidence-bound manifests

Commit only the safe reviewed manifest change:

```text
chore: bind Caleb installation reachability
```

The exchange token remains unused.

---

## Task 11: Complete the Production Exchange and Initial Binding

> **Authorization gate:** This task requires explicit authorization for a fresh
> Production backup, applying only migration `0013`, consuming one exchange,
> saving Vercel Production secrets, inserting the initial operator binding,
> deploying, waking the worker, and producing one signed health report. It does
> not authorize DNS, booking inquiries, commerce orders, or unrelated modules.

### Step 1: Back up and audit Production

Create a fresh Neon recovery branch, prove the target identity, audit checksums
`0001–0012`, dry-run `0013`, and compare the Production schema to the tested
Preview schema.

### Step 2: Apply `0013` and provision the dedicated role

Apply only the reviewed migration. Create the minimum installation-worker role
and save its pooled URL as sensitive Production-only `BUILDER_DATABASE_URL`.
No public site traffic or native inquiry role changes.

### Step 3: Run the fail-before-token setup preflight

The CLI must reach the stdin boundary only after manifests, deployment evidence,
routes, target identity, migration, and safe environment-name inventory pass.

### Step 4: Issue and consume one fresh exchange

Use the control plane's manual installation flow and run exactly:

```text
node ./node_modules/@reuben-williams/cli/src/run.js setup-installation --project . --control-plane-url https://control-staging.saveyour.app --stable-site-key caleb-jakes-v3 --public-url https://calebjakes.com/ --hosting manual --exchange-token-stdin
```

Paste the token into stdin only. Never place it in chat, a file, history,
environment variables, or evidence.

### Step 5: Review and bind safe registration metadata

Review `.builder/installation-registration.json`, derive
`.builder/installation-key-binding.json` locally, and confirm that neither file
contains private key material. Commit only these two reviewed safe artifacts.

### Step 6: Insert the initial operator binding

Using the operator role, call only `builder_bind_site_installation_v1` with the
reviewed site UUID, stable key, installation ID, key ID, digests, public-JWK
digest, and worker version. Read it back and compare every field. The worker
role must still be unable to bind or rotate.

### Step 7: Save sensitive Vercel Production values and deploy

Save the exact registration variables and private JWK as sensitive
Production-only values, deploy the reviewed commit, authenticate one operator
wake, and verify one healthy signed report. Do not send a control-plane command
yet.

---

## Task 12: Assign, Provision, Activate, and Accept Only Caleb's Package Set

> **Authorization gate:** Package assignment, provisioning, and activation are
> distinct auditable mutations. Obtain explicit authorization immediately before
> this task.

### Step 1: Compare control-plane and site-local identity

Confirm stable site key `caleb-jakes-v3`, public URL, central site UUID,
installation ID, accepted key ID, package versions, schema version, runtime
digests, worker health, and deployment evidence.

### Step 2: Assign only the approved package/module set

Do not assign or activate Bookings, Campaigns, Chat, AI, Automations, Dashboard,
Commerce, or any other module merely because a package exists. Preserve the
separation between installed package, entitlement, provisioning, activation,
and acceptance.

### Step 3: Provision in dependency order

Provision the approved Core/Forms/Growth prerequisites followed by only:

1. `growth.customers`
2. `growth.leads`
3. `growth.messaging`

The worker processes one command per invocation. Verify one durable receipt,
one acknowledged result, the expected disabled-by-default configuration, and
no duplicate effect for an exact replay before continuing.

### Step 4: Verify setup gates and application regressions

Confirm Installation registered, Installation health, compatible Growth
package selected, activation complete, Gate 2 evidence, and Ready for launch.
Recheck the public site, native booking without submission, staff editor,
email/retention workers, and Stripe test-only boundaries.

### Step 5: Exercise rollback without deleting evidence

Prove the worker can be paused, the prior Vercel deployment can be restored,
and installation tables can remain dormant with receipts preserved. Do not drop
tables, delete receipts, reuse expired leases, reactivate HighLevel, or roll
back customer data.

### Step 6: Produce the final acceptance report

Record secret-safe evidence for commits, deployment IDs, migration checksum,
manifest digests, package versions, installation identity, health, receipts,
module states, application regression results, rollback, and any manual follow-
up. Public DNS remains separately authorized and outside this plan.

---

## Completion Criteria

The managed installation is complete only when:

- the Caleb V3 repository uses exact published `@reuben-williams/*@0.5.0`
  contracts with no internal package dependency;
- migration `0013` is checksum-reviewed, isolated, additive, and applied only
  to explicitly approved targets;
- the dedicated worker role has minimum grants and cannot bind/rotate;
- all three manifests and both registration binding artifacts validate and
  agree with Vercel, Neon, and the control plane;
- private-key provenance and every installation digest are bound fail-closed;
- the fixed scheduled route is authenticated, parameter-free, no-store, and
  bounded to one command per invocation;
- receipt and run-lease fencing survives concurrency, expiry, retry, and replay;
- only the three approved Caleb Growth handlers can execute;
- signed health contains no secret, PII, customer record, or raw provider data;
- package assignment, entitlement, provisioning, activation, and acceptance are
  separately evidenced;
- all local, isolated-database, Preview, Production, and responsive application
  regression checks pass;
- credential rotation and rollback are documented and rehearsed safely; and
- no DNS change, booking inquiry, commerce order, HighLevel mutation, new
  package publication, or unrelated module activation occurred.
