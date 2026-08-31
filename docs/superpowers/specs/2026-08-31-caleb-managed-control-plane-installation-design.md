# Caleb Managed Control-Plane Installation Design

- Date: 2026-08-31
- Repository: `Reuben-Williams/Caleb-Motivational-Speaker-V3`
- Stable site key: `caleb-jakes-v3`
- Public URL: `https://calebjakes.com/`
- Control plane: `https://control-staging.saveyour.app`
- Hosting: Vercel, manual installation handoff
- Status: design approved; written specification awaiting user review

## Outcome

Make Caleb V3 a fully managed client installation without moving the public
website, booking flow, commerce runtime, staff workspace, or customer data into
the control plane. Caleb's existing Vercel project hosts a server-only
installation worker. The worker pulls site-scoped commands from the control
plane, applies only registered handlers, records durable receipts and fenced
leases in Caleb's Production Neon database, and sends a sanitized signed health
report back to the control plane.

The installation is complete only when the registered `caleb-jakes-v3` site
shows the correct installation identity, exact package versions, compatible
schemas, healthy worker state, and no outstanding installation gate. This
design does not authorize a public DNS change, booking submission, commerce
order, HighLevel mutation, or package activation outside the approved Caleb
package set.

## Approved Constraints

- Use the embedded runtime approach. Do not create a sidecar Vercel project and
  do not give the control plane direct access to Caleb's database.
- Use exact published `@reuben-williams/*` version `0.5.0` contracts. Internal
  `@your-builder/*` source names are not valid client dependencies.
- Caleb V3 remains one GitHub repository, one Vercel project, one site-local
  Neon data plane, and one central control-plane site/installation identity.
- Production Neon is authoritative for Caleb's site identity, command receipts,
  run leases, managed configuration, and operational evidence.
- The control plane may coordinate approved installation commands, package
  entitlements, provisioning, and health. It does not become the public form or
  editor data plane.
- Package installation, assignment, entitlement, provisioning, activation, and
  acceptance remain separate auditable gates.
- The runtime must fail closed when identity, credentials, manifest digests,
  package versions, schema versions, storage, or command validation do not
  match.
- Existing native booking, Resend delivery, Turnstile, Upstash namespaces,
  Stripe test work, staff authentication, and editor behavior stay isolated.
- No secret, private JWK, database URL, exchange token, provider credential, or
  customer record may enter Git history, command output evidence, logs, health
  reports, or browser responses.
- Unrelated user-owned videos, generated output, and existing working-tree
  changes must not be staged with this release.

## Considered Approaches

### A. Embedded runtime in Caleb V3

This is the approved approach. The Vercel deployment executes the worker next
to Caleb's site-local adapters and Neon database. It preserves data ownership,
has the smallest outage boundary, and uses the published client contracts.

### B. Separate Vercel sidecar

A sidecar would isolate installation traffic from the public website but would
add another project, deployment, credential set, operational bill, and failure
surface. It is unnecessary for the current load and budget.

### C. Direct control-plane database access

Direct access would reduce client runtime code but would enlarge the central
security boundary and let one platform service reach client data planes. It is
rejected.

## Architecture

### 1. Reviewed runtime manifests

The repository gains two committed, reviewable manifests:

- `.builder/installation-manifest.json` declares the exact installed
  `@reuben-williams/*` packages, schema versions, server routes, worker version,
  and engagement event registry version supported by this deployment.
- `.builder/site-runtime.json` binds the stable site key, Caleb's Neon
  `builder_sites.id`, installation-manifest digest, handler-registry digest,
  lease bounds, invocation timeout, worker version, and the tested deployment
  revision.

Both files are generated from code and audited runtime facts, then parsed by
the published `0.5.0` trust validators. Handwritten placeholders, a null
reachability revision, unverified routes, or a manifest/runtime digest mismatch
block installation setup.

The manifest lists only packages actually used by the production application.
The current direct application set is Core, Next, Forms, Growth Core, Growth
Customers, Growth Leads, and Growth Messaging at `0.5.0`; the CLI is an exact
`0.5.0` development dependency used for setup and verification. Transitive
packages remain lockfile-controlled and are not misrepresented as directly
activated modules.

### 2. Installation configuration boundary

The server-only configuration loader consumes exactly the published
installation variables:

- `BUILDER_CONTROL_PLANE_URL`
- `BUILDER_INSTALLATION_ID`
- `BUILDER_INSTALLATION_KEY_ID`
- `BUILDER_INSTALLATION_PRIVATE_JWK`

The one-time exchange token is never a runtime environment variable. The setup
CLI reads it from standard input only. The accepted private Ed25519 JWK is
stored under `.builder/secrets/` locally and in Vercel Production as a Sensitive
environment value. `.builder/secrets/`, setup locks, journals, and temporary
registration state are ignored by Git. The accepted public registration
metadata may be committed only after it is reviewed and contains no private
key material.

### 3. Scheduled installation worker

Caleb V3 exposes one fixed server-only scheduled route:
`/api/builder/workers/installation`. It accepts no site ID, installation ID,
package, command, credential, or recipient value from the request. Its only
job is to authenticate the scheduled invocation and call the embedded runtime
with server-selected configuration.

The route uses a bounded invocation timeout shorter than the runtime lease. A
Vercel schedule or an explicitly authorized operational invocation may wake it.
Concurrent wakes are harmless because the Neon run-lease adapter permits one
fenced owner at a time.

The worker uses the generic published `createSiteInstallationRuntime` boundary,
not the Supabase-specific convenience constructor. This permits Caleb's Neon
adapters to implement the same site identity, command receipt, run lease, and
health interfaces without introducing a Supabase data plane.

### 4. Neon runtime adapters

Four small adapters each have one responsibility:

- **Site identity store:** reads Caleb's site UUID and stable key from
  `builder_sites`; it never accepts identity from the request or command.
- **Command receipt store:** reserves a command by installation ID,
  idempotency key, command ID, semantic digest, attempt, execution token, and
  generation; it completes or releases only for the current owner.
- **Installation run-lease store:** acquires, renews, and releases the single
  site/installation worker lease using a monotonically increasing fencing
  token.
- **Growth configuration adapter:** persists only supported, approved module
  configurations after validating site identity, installation lease, command
  ID, module/version, configuration version, and profile.

The existing portable `builder_command_receipts` table does not provide the
full installation reservation/generation contract. An additive, checksum-
verified migration after the approved `0012` manifest adds the dedicated
installation receipt and run-lease structures and the minimum transaction
functions needed by these adapters. It does not rewrite inquiry, contact, lead,
message, commerce, or privacy records.

The published runtime marker currently names the durable-store contract
`supabase-command-receipts-v1`. In this release that string is treated as the
published semantic contract identifier, not as a provider requirement. The
Neon adapter must pass the same conformance tests before the marker is emitted.

### 5. Command handler registry

The handler registry is explicit and digest-bound. It contains only command
types and versions supported by Caleb's installed, approved modules. Unknown
types receive `UNSUPPORTED_COMMAND_TYPE`; known types with another version
receive `UNSUPPORTED_COMMAND_VERSION`.

The initial fully managed slice permits configuration commands for the native
Customers, Leads, and Messaging modules already used by Caleb. It does not
enable Bookings, Campaigns, Chat, AI, Automations, Dashboard, Commerce, or other
modules merely because the published package family contains those contracts.
Adding a handler later requires a reviewed manifest/registry digest change and
a new deployment.

Every handler validates a closed payload shape and independently honors the
command idempotency key for external effects. Handlers cannot select a site,
installation, lease, provider, recipient, or capability from command payload
data.

### 6. Health reporting

Caleb V3 builds a sanitized health report from:

- durable-store availability;
- exact manifest packages and schemas;
- worker initialization and version;
- queue depth, oldest age, and dead-letter counts;
- supported integration states;
- entitlement snapshot age when available; and
- safe uppercase error codes.

The embedded runtime signs and posts this report to the control plane's
`/api/platform/v1/installations/health` endpoint using the installation private
key. Caleb V3 does not expose its database or an unrestricted diagnostic
endpoint. Secrets, stack traces, SQL, provider bodies, email addresses, form
payloads, and customer identifiers never enter health evidence.

Health is `healthy` only when the runtime initialized, the scheduled execution
succeeded, the durable store is available, versions match, and no safe error
code remains. Otherwise the control plane shows a degraded, stopped, attention,
or blocked state with a non-sensitive reason.

### 7. Existing application boundaries

The managed runtime is separate from:

- `POST /api/inquiries` and its Upstash/Turnstile/Neon/Resend workflow;
- inquiry email and retention workers;
- Stripe checkout and webhook routes;
- staff authentication and membership authorization; and
- public page rendering and DNS.

An installation failure must not mutate these paths. A public-site failure must
not relax installation authentication or data-plane identity checks.

## Data Flow

1. The control plane issues a one-time exchange for `caleb-jakes-v3`.
2. Before reading that token, the setup CLI validates the manifest, runtime
   marker, stable key, manifest digest, worker version, and non-null tested
   deployment revision.
3. The CLI generates an installation-scoped Ed25519 key pair, sends the public
   key and signed registration proof, and protects the private key locally.
4. Manual hosting setup produces the exact four server environment values and
   a handoff receipt. The operator copies them directly into Vercel Production;
   values are never sent through chat or committed.
5. A scheduled invocation loads those values, verifies Caleb's Neon site
   identity, and acquires the fenced installation run lease.
6. The runtime signs an outbound pull request. The control plane returns only
   commands leased to that installation.
7. For each command, the runtime validates its envelope, type, version,
   payload, semantic digest, attempt, and lease expiry, then reserves durable
   execution ownership.
8. The selected handler applies the operation. Completion is recorded only if
   the execution token and generation still own the reservation.
9. The runtime acknowledges the result to the control plane using the command
   lease token. A replay returns the durable result instead of reapplying it.
10. The same invocation builds and posts sanitized signed health, then releases
    the run lease.

## Security and Failure Handling

- Missing or malformed installation configuration prevents runtime creation.
- Stable-key, site-UUID, installation-ID, manifest, worker-version, handler-
  registry, schema, or reachability-revision mismatch fails closed.
- Expired control-plane command leases are not executed.
- A semantic digest mismatch for the same idempotency key is a terminal
  conflict, never a retryable overwrite.
- A worker that loses its run lease or receipt generation cannot complete,
  acknowledge, or release work owned by its successor.
- Database unavailability prevents command execution and reports degraded
  health when a safe signed report remains possible.
- Pull, command execution, acknowledgement, and health-report failures use
  distinct safe codes. Retries are bounded by control-plane command attempts
  and never loop inside one invocation.
- Handler exceptions become sanitized terminal results. Stack traces and raw
  error messages stay in secret-safe server logs only when logging is required.
- Partial package activation cannot report healthy. Assignment, entitlement,
  provisioning, activation, and acceptance receipts remain independently
  inspectable.
- Setup uses a protected single-process lock and recoverable journal. An
  interrupted manual handoff resumes from reviewed state rather than generating
  another installation accidentally.
- The exchange can be revoked and reissued if it expires before acceptance.
  Accepted installation credentials rotate through the published overlap
  procedure; they are not replaced by editing Git files.

## Testing

Implementation follows red-green-refactor. Required automated evidence covers:

1. exact parsing and digest agreement for both `.builder` manifests;
2. failure before token consumption when runtime evidence is absent or stale;
3. installation configuration validation and browser-bundle exclusion;
4. Neon site identity success, wrong-key rejection, and cross-site isolation;
5. run-lease acquisition, renewal, contention, expiry reclamation, fencing, and
   ownership loss;
6. receipt reservation, exact replay, concurrent replay, semantic conflict,
   generation takeover, completion, and release;
7. approved handler success plus unsupported type/version and malformed payload
   rejection;
8. scheduled-route authentication, fixed server-selected inputs, timeout, and
   no-query/no-body behavior;
9. signed pull, acknowledgement, and health-report request contracts;
10. health success, degraded/stopped states, safe-code filtering, and secret/PII
    redaction;
11. Preview and Production database isolation and migration checksum/order;
12. regressions for native booking, email delivery, retention, staff login,
    editor access, commerce, and public routes; and
13. lint, typecheck, the complete unit suite, production build, secret scan,
    package-lock integrity, and `git diff --check`.

An isolated test database is used for adapter and migration tests. No test may
write to Caleb's Production Neon database before the separately authorized
production migration and installation steps.

## Deployment and Acceptance

1. Implement and verify locally without consuming the exchange token.
2. Apply the additive migration only to an approved Preview/rehearsal Neon
   target and run the full runtime integration suite.
3. Create a Vercel candidate deployment with protected candidate credentials.
4. Verify the public site, native booking, staff login, editor, and commerce
   behavior remain unchanged.
5. Record the tested Vercel/Git revision in `.builder/site-runtime.json`, rebuild,
   and prove the manifest and runtime digests still match.
6. Confirm the scheduled worker route is reachable only through its approved
   authenticated invocation path.
7. Create a fresh Production Neon backup, re-audit migrations `0001` through
   `0012`, and apply only the reviewed additive installation migration after
   explicit production authorization.
8. Issue a fresh one-time exchange if the current exchange has expired. Paste
   it directly into the local CLI prompt and complete the manual Vercel handoff.
9. Redeploy with the accepted installation credentials, wake the runtime, and
   confirm one healthy signed report before any package activation.
10. Assign, provision, and activate only the approved Caleb package set in
    dependency order.
11. Verify the control plane displays the correct site/installation identity,
    exact package versions, compatible schemas, healthy worker, successful
    receipts, and no blocked setup gate.
12. Produce a secret-safe acceptance and rollback report.

The installation setup command uses the installed published CLI path:

```text
node ./node_modules/@reuben-williams/cli/src/run.js setup-installation --project . --control-plane-url https://control-staging.saveyour.app --stable-site-key caleb-jakes-v3 --public-url https://calebjakes.com/ --hosting manual --exchange-token-stdin
```

The command is not rerun until its runtime prerequisites pass. The one-time
token is pasted into the local terminal only.

## Rollback

- Before installation acceptance, remove only unaccepted local setup state and
  revoke the unused exchange.
- After acceptance but before command activation, revoke or rotate the
  installation credential and restore the prior Vercel deployment.
- After activation, stop the scheduled worker, disable further control-plane
  commands, restore the prior Vercel deployment, and preserve receipts for
  audit. Do not delete receipts or reuse an expired lease.
- The additive installation tables may remain dormant during rollback. Their
  removal requires a separate reviewed data migration and is not part of an
  emergency application rollback.
- Existing booking, commerce, staff, and customer records are never rolled back
  through installation tables.

## Explicit Non-Goals

- Public DNS cutover or domain transfer
- Replacing Vercel, Neon, Resend, Turnstile, Upstash, Stripe, or central staff
  identity
- Moving Caleb's customer data into the control plane
- Re-enabling or modifying HighLevel
- Submitting a booking inquiry or commerce order
- Activating every published platform module
- Publishing a new `@reuben-williams/*` release
- Copying or vendoring the site-editor-platform repository into Caleb V3
- General-purpose remote code execution, arbitrary SQL, arbitrary environment
  mutation, or arbitrary file editing through control-plane commands
