# Caleb Managed Control-Plane Installation Design

- Date: 2026-08-31
- Repository: `Reuben-Williams/Caleb-Motivational-Speaker-V3`
- Stable site key: `caleb-jakes-v3`
- Public URL: `https://calebjakes.com/`
- Control plane: `https://control-staging.saveyour.app`
- Hosting: Vercel, manual installation handoff
- Implementation baseline: `codex/native-booking-preview`; first tightened review
  baseline `a1093a2` (later commits contain specification corrections only)
- Runtime baseline: Node.js 22 or newer
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

The repository gains three committed, reviewable runtime manifests:

- `.builder/installation-manifest.json` declares the exact installed
  `@reuben-williams/*` packages, schema versions, server routes, worker version,
  and engagement event registry version supported by this deployment.
- `.builder/site-runtime.json` binds the stable site key, Caleb's Neon
  `builder_sites.id`, installation-manifest digest, handler-registry digest,
  lease bounds, invocation timeout, worker version, and the tested deployment
  revision.
- `.builder/caleb-configuration-policy.json` declares the exact three allowed
  command types, command versions, idempotency contract, module IDs/versions,
  configuration versions, and Caleb configuration profile.

The configuration-policy file has this exact closed top-level shape:

- `version`: integer literal `1`;
- `stableSiteKey`: string literal `caleb-jakes-v3`; and
- `entries`: an array of exactly three objects sorted by `commandType` and then
  `commandVersion`.

Every entry accepts exactly these fields and no others:

- `commandType`: bounded command identifier;
- `commandVersion`: positive integer;
- `idempotency`: string literal `commandId`;
- `moduleId`: bounded module identifier;
- `moduleVersion`: canonical semantic version;
- `configVersion`: positive integer; and
- `configuration`: string literal `caleb-speaking-engagements-v1`.

The three entry values must exactly equal the allowlist table in **Command
handler registry**. Duplicate `(commandType, commandVersion)` or `moduleId`
values are invalid. `configurationPolicySha256` covers the complete canonical
top-level document, including `version`, `stableSiteKey`, and `entries`.

The published files are generated from code and audited runtime facts. The
first two are parsed by
the published `0.5.0` trust validators. Handwritten placeholders, a null
reachability revision, unverified routes, or a manifest/runtime digest mismatch
block installation setup.

The manifest lists only packages actually used by the production application.
The current direct application set is Core, Next, Forms, Growth Core, Growth
Customers, Growth Leads, and Growth Messaging at `0.5.0`; the CLI is an exact
`0.5.0` development dependency used for setup and verification. Transitive
packages remain lockfile-controlled and are not misrepresented as directly
activated modules.

After the exchange is accepted, setup also produces two reviewed binding
artifacts:

- `.builder/installation-registration.json`, generated by the published CLI,
  records the normalized control-plane URL, stable site key, public URL,
  installation ID, accepted key ID, control-plane signing keys, and exact
  control-plane endpoint paths.
- `.builder/installation-key-binding.json`, generated locally after accepted
  registration, has this exact closed schema:

  | Field | Required value |
  | --- | --- |
  | `version` | integer literal `1` |
  | `stableSiteKey` | string literal `caleb-jakes-v3` |
  | `installationId` | canonical lowercase UUID |
  | `acceptedKeyId` | the accepted bounded key identifier |
  | `installationManifestSha256` | 64 lowercase hexadecimal characters |
  | `handlerRegistrySha256` | 64 lowercase hexadecimal characters |
  | `configurationPolicySha256` | 64 lowercase hexadecimal characters |
  | `publicJwkSha256` | 64 lowercase hexadecimal characters |
  | `boundAt` | canonical UTC ISO-8601 instant |

  No additional fields are accepted. The file contains no private key material.

All digests use UTF-8 SHA-256 over canonical JSON with object keys sorted
lexicographically, arrays retained in declared order, and no insignificant
whitespace. `publicJwkSha256` hashes exactly the canonical public projection
`{alg:"EdDSA",crv:"Ed25519",kty:"OKP",x:<canonical-base64url-x>}`; the private
`d` value is excluded. `configurationPolicySha256` hashes the policy entries
sorted by command type and then command version.

Both binding files are committed after human review. The registration response
does not echo Caleb's installation public key, so the second file is the local
provenance check that detects later Vercel private-key drift. The control plane
remains the remote authority because only the accepted private key can produce
requests it will accept.

`reachabilityEvidenceRevision` identifies the immutable Vercel deployment ID
of the earlier candidate used to prove the scheduled route exists. It does not
claim to identify the later rebuilt deployment containing that evidence value;
that final deployment receives a second route and health verification after
registration.

### 2. Installation configuration boundary

The server-only configuration loader consumes exactly the published
installation variables:

- `BUILDER_CONTROL_PLANE_URL`
- `BUILDER_INSTALLATION_ID`
- `BUILDER_INSTALLATION_KEY_ID`
- `BUILDER_INSTALLATION_PRIVATE_JWK`

The Neon adapter additionally uses `BUILDER_DATABASE_URL`, a pooled connection
for a dedicated installation-worker database role. It is separate from the
general `DATABASE_URL` used by public inquiries and editor traffic. The role
may read Caleb's site identity and execute only the installation receipt,
run-lease, managed-configuration, and safe health functions.

The one-time exchange token is never a runtime environment variable. The setup
CLI reads it from standard input only. The accepted private Ed25519 JWK is
stored under `.builder/secrets/` locally and in Vercel Production as a Sensitive
environment value. `.builder/secrets/`, setup locks, journals, and temporary
registration state are ignored by Git. The accepted public registration
metadata may be committed only after it is reviewed and contains no private
key material.

A Caleb-specific `createCalebInstallationRuntime` composition module is the
only place allowed to construct the published runtime. Before construction it:

1. parses all three runtime manifests and both registration binding files;
2. recomputes the installation-manifest, handler-registry, and canonical Caleb
   configuration-policy SHA-256 digests;
3. verifies worker version `0.5.0`, a 120-second run lease, a 45-second
   invocation timeout, and the recorded reachability deployment ID;
4. compares the environment control-plane URL, installation ID, and key ID to
   `.builder/installation-registration.json` and verifies its four endpoint
   paths exactly match the published `0.5.0` contract:
   `/api/platform/v1/installations/commands/pull`,
   `/api/platform/v1/installations/commands/{commandId}/result`,
   `/api/platform/v1/installations/health`, and
   `/api/platform/v1/installations/credentials/rotate`;
5. derives the public JWK from the environment private JWK and compares its
   digest to `.builder/installation-key-binding.json`;
6. compares every installation, manifest, registry, policy, and public-key
   binding field to the active Neon `builder_site_installations` row;
7. verifies the Neon `builder_sites` UUID and stable key; and
8. constructs `createSiteInstallationRuntime` only after all checks pass.

Any discrepancy raises a safe configuration error before a control-plane pull,
database lease, handler execution, or health report.

### 3. Scheduled installation worker

Caleb V3 exposes one fixed server-only scheduled route:
`GET /api/builder/workers/installation`. Vercel invokes it every five minutes
and sends `Authorization: Bearer <CRON_SECRET>`. The route uses the existing
constant-time bearer-token verifier. The same authenticated GET may be used for
an explicitly authorized operator wake; no second operational endpoint exists.

The route accepts no query string or request body and no site ID, installation ID,
package, command, credential, or recipient value from the request. Its only
job is to authenticate the scheduled invocation and call the embedded runtime
with server-selected configuration.

The Vercel function maximum duration is 60 seconds. The runtime invocation
timeout is 45 seconds and the run lease is 120 seconds. Concurrent wakes are
harmless because the Neon run-lease adapter permits one fenced owner at a time.

Responses always include `Cache-Control: private, no-store` and a safe JSON
code only:

- `200 installation_worker_complete` with bounded `pulled`, `acknowledged`, and
  `healthReported` values;
- `200 installation_worker_idle` when another fenced invocation owns the lease;
- `400 parameters_not_allowed` for query/body input;
- `401 unauthorized` for the wrong method or bearer token;
- `503 service_unavailable` for invalid runtime configuration or unavailable
  durable storage;
- `503 installation_worker_failed` for a sanitized runtime failure; and
- `504 installation_worker_timeout` when the 45-second invocation budget ends.

The worker uses the generic published `createSiteInstallationRuntime` boundary,
not the Supabase-specific convenience constructor. This permits Caleb's Neon
adapters to implement the same site identity, command receipt, run lease, and
health interfaces without introducing a Supabase data plane.

### 4. Neon runtime adapters

Four small adapters each have one responsibility:

- **Site identity store:** reads Caleb's site UUID and stable key from
  `builder_sites`; it never accepts identity from the request or command.
- **Command receipt store:** implements the published `reserve`, `complete`,
  and `find` interface. It binds site ID, command ID, idempotency key, command
  type/version, and payload hash to a 30-second receipt lease token. There is
  no receipt-release operation in the published contract.
- **Installation run-lease store:** acquires, renews, and releases the single
  site/installation worker lease using a monotonically increasing fencing
  token.
- **Growth configuration adapter:** persists only supported, approved module
  configurations after validating site identity, installation lease, command
  ID, module/version, configuration version, and profile.

The existing portable `builder_command_receipts` table does not provide the
full installation receipt contract. A checksum-verified
`0013_managed_installation_runtime.sql` migration adds:

- `builder_site_installations`, keyed by `site_id` with a unique
  `installation_id`, containing the stable site key, accepted key ID, manifest
  digest, handler-registry digest, configuration-policy digest, public-JWK
  digest, worker version, active status, and binding timestamps;
- `builder_installation_command_receipts`, keyed by
  `(site_id, command_id)` with a unique `(site_id, idempotency_key)`, containing
  installation ID, type, version, payload hash, `received|succeeded|failed|retry`
  status, result, attempt, receipt lease token/expiry, retry time, and timestamps;
- `builder_installation_worker_leases`, keyed by `site_id`, containing the
  bound installation ID, current lease owner, monotonically increasing bigint
  fencing token, lease expiry, and timestamps; and
- `builder_module_configurations`, unique on `(site_id, module_id)`, containing
  module/configuration versions, profile, setup status, entitlement state,
  disabled-by-default state, last command ID, and timestamps; and
- the minimum transaction functions for receipt reserve/complete/find,
  run-lease acquire/renew/release, identity verification, managed Growth
  configuration, and sanitized health facts.

Receipt reservation locks any row matching the site-scoped command ID or
idempotency key. A different type, version, or payload hash returns `conflict`.
An active `received` lease returns `in_progress`; an expired one is reclaimed
with a new token and incremented attempt. A future `retry` result replays until
its retry time; once due, it may be reacquired. `succeeded` and `failed` always
replay. Completion succeeds only for the exact unexpired receipt lease token
and clears the lease fields atomically.

The migration creates the installation binding table empty. After an exchange
is accepted, an operator-only provisioning transaction inserts exactly the
reviewed site UUID, stable key, installation ID, accepted key ID, manifest
digest, registry digest, configuration-policy digest, public-JWK digest, and
worker version. The installation-worker role has read access but cannot insert,
replace, or delete that binding.

Run-lease acquire verifies `builder_sites.id`, `stable_key`, and the active
`builder_site_installations` binding in the same transaction. An active different owner receives
`acquired=false`. An expired lease may be reclaimed and increments the fencing
token. Renewal and release require the exact site, installation, owner, and
fencing token; release clears ownership and expiry but never decreases or
reuses the token.

The migration is additive after the approved `0012` manifest. It grants only
the dedicated installation-worker role the minimum select/execute privileges
and revokes public execution. It does not rewrite inquiry, contact, lead,
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

The initial fully managed registry is exactly:

| Command type | Command version | Module ID | Module version | Config version | Profile |
| --- | ---: | --- | --- | ---: | --- |
| `growth.customers.configure-v2` | 1 | `growth.customers` | `1.1.0` | 1 | `caleb-speaking-engagements-v1` |
| `growth.leads.configure-v2` | 1 | `growth.leads` | `1.1.0` | 1 | `caleb-speaking-engagements-v1` |
| `growth.messaging.configure` | 1 | `growth.messaging` | `1.0.0` | 1 | `caleb-speaking-engagements-v1` |

The implementation creates the published Growth configuration handlers, filters
them against this exact triple allowlist, and asserts that the resulting set has
exactly these three entries before computing the registry digest. It does not
enable Bookings, Campaigns, Chat, AI, Automations, Dashboard, Commerce, or other
modules merely because the published package family contains those contracts.
Adding a handler later requires a reviewed manifest/registry digest change and
a new deployment.

The published handler-registry digest binds only command type, command version,
and `commandId` idempotency. The separate configuration-policy manifest and
digest bind the module versions, configuration version, and
`caleb-speaking-engagements-v1` profile that the published digest omits. A
policy change therefore requires a reviewed file change, a new policy digest,
a new Neon installation binding, and a new deployment even when handler type
and version remain unchanged.

Every handler validates a closed payload shape and independently honors the
command idempotency key for external effects. Handlers cannot select a site,
installation, lease, provider, recipient, or capability from command payload
data.

Managed configuration is stored in the migration-created
`builder_module_configurations` row unique on `(site_id, module_id)`. The
transaction records module version, config version, profile, setup status,
disabled-by-default state, last configuration command ID, and timestamp. It
requires both the active run fencing token and the current receipt lease. The
same command ID replays only if every persisted identity field matches; a
different identity is a terminal conflict. Configuration does not activate the
module or change its entitlement.

### 6. Health reporting

Caleb V3 builds a sanitized health report from:

- durable-store availability;
- exact manifest packages and schemas;
- worker initialization and version;
- queue depth, oldest age, and dead-letter counts;
- supported integration states;
- entitlement snapshot age when available; and
- safe uppercase error codes.

The first managed slice reports no customer-data queues or third-party provider
integrations: `queues` and `integrations` are empty objects. Neon availability
comes from the dedicated safe health transaction; pull/report failures use
runtime safe codes. Entitlement and backup ages remain `null` until a reviewed
site-local source exists. Booking email, Resend, Stripe, Turnstile, Upstash, and
customer records are intentionally not probed by the installation health
source.

The embedded runtime signs and posts this report to the control plane's
`/api/platform/v1/installations/health` endpoint using the installation private
key. Caleb V3 does not expose its database or an unrestricted diagnostic
endpoint. Secrets, stack traces, SQL, provider bodies, email addresses, form
payloads, and customer identifiers never enter health evidence.

Worker health is `healthy` only when the runtime initialized, the scheduled execution
succeeded, the durable store is available, versions match, and no safe error
code remains. Otherwise the control plane shows a degraded, stopped, attention,
or blocked worker state with a non-sensitive reason. This is runtime health,
not overall installation acceptance: assignment, entitlement, provisioning,
activation, and acceptance gates may still keep the installation incomplete.

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
4. Setup records the accepted registration metadata. The local binding step
   derives the public JWK digest from the protected key and writes the safe
   installation key-binding artifact.
5. Manual hosting setup produces the exact four published server environment
   values and a handoff receipt. The operator also supplies the dedicated
   `BUILDER_DATABASE_URL`. Values are copied directly into Vercel Production;
   they are never sent through chat or committed.
6. `createCalebInstallationRuntime` proves the manifests, registration, key
   binding, environment, handler registry, timing budget, and Caleb Neon site
   identity agree before constructing the runtime.
7. A scheduled invocation acquires the 120-second fenced installation run
   lease.
8. An injected installation-client wrapper signs an outbound pull request with
   an explicit limit of one command and a 60-second control-plane command lease.
   It rejects rather than executes any returned command whose lease is expired
   or has less than 30 seconds remaining.
9. For the command, the runtime validates its envelope, type, version,
   payload, semantic digest, attempt, and lease expiry, then reserves durable
   receipt ownership for 30 seconds.
10. A timeout wrapper gives the selected handler at most 20 seconds and passes
    it a composed abort signal. Completion is recorded only if the receipt
    lease token is still current and the run fencing token remains valid.
11. The runtime acknowledges the result to the control plane using the command
   lease token. A replay returns the durable result instead of reapplying it.
12. The same invocation builds and posts sanitized signed health, then releases
    the run lease.

## Security and Failure Handling

- Missing or malformed installation configuration prevents runtime creation.
- Stable-key, site-UUID, installation-ID, manifest, worker-version, handler-
  registry, configuration-policy, public-key-binding, schema, or reachability-
  revision mismatch fails closed.
- Expired control-plane command leases are not executed.
- A semantic digest mismatch for the same idempotency key is a terminal
  conflict, never a retryable overwrite.
- A worker that loses its run fencing token or receipt lease token cannot
  complete, acknowledge, renew, or release work owned by its successor.
- Database unavailability prevents command execution and reports degraded
  health when a safe signed report remains possible.
- Pull, command execution, acknowledgement, and health-report failures use
  distinct safe codes. Retries are bounded by control-plane command attempts
  and never loop inside one invocation.
- Handler exceptions become sanitized terminal results. Stack traces and raw
  error messages stay in secret-safe server logs only when logging is required.
- Worker health may be healthy before package activation because it measures
  runtime readiness. Overall installation acceptance remains blocked until
  assignment, entitlement, provisioning, activation, and acceptance receipts
  all pass independently.
- Setup uses a protected single-process lock and recoverable journal. An
  interrupted manual handoff resumes from reviewed state rather than generating
  another installation accidentally.
- The exchange can be revoked and reissued if it expires before acceptance.
  Accepted installation credentials rotate through the maintenance-window
  procedure below; they are not replaced by editing Git files alone.

### Credential rotation

The runtime has one active key binding. Rotation uses the control plane's
published overlap window for remote acceptance but deliberately pauses local
command execution rather than supporting two local keys:

1. An operator compare-and-set changes the current Neon installation binding
   from `active` to `rotation_pending`; scheduled wakes then return fail-closed
   before pulling commands.
2. The published CLI rotation command creates and registers the next key using
   a bounded overlap period. It updates the protected local JWK and accepted
   key ID only after the control plane accepts the new key.
3. The binding generator writes revised safe registration/key-binding files.
   The operator transaction replaces the Neon key ID/public-JWK digest only
   when the old key ID/digest and `rotation_pending` state still match.
4. The operator updates the two Vercel key values, deploys the reviewed safe
   binding files, and verifies the composition boundary succeeds while the
   Neon binding remains paused.
5. An operator compare-and-set changes the matching Neon binding back to
   `active`. The next wake must post healthy signed evidence with the new key
   before the overlap expires.
6. The old control-plane key is allowed to expire or is revoked through the
   published procedure only after new-key health succeeds.

If rotation fails before the overlap ends, the operator may restore the old
protected key, safe files, Vercel values, and Neon binding with a compare-and-
set, then reactivate it. After the overlap ends, the old key is never reused;
the operator must finish the new binding or perform an explicitly authorized
rebind. No command runs while Git, Neon, Vercel, and control-plane key state do
not agree.

## Testing

Implementation follows red-green-refactor. Required automated evidence covers:

1. exact parsing and digest agreement for all three `.builder` runtime manifests;
2. failure before token consumption when runtime evidence is absent or stale;
3. registration metadata, key-binding and configuration-policy drift,
   canonical-digest agreement, installation configuration validation, and
   browser-bundle exclusion;
4. Neon site identity success, wrong-key rejection, and cross-site isolation;
5. run-lease acquisition, renewal, contention, expiry reclamation, fencing, and
   ownership loss;
6. receipt reservation, exact replay, concurrent replay, semantic conflict,
   expired-lease takeover, token-guarded completion, retry timing, and find;
7. the exact three-entry handler allowlist, configuration identity/fencing,
   disabled-by-default persistence, unsupported type/version, malformed payload,
   and accidental extra-handler rejection;
8. scheduled-route method/authentication, five-minute schedule, fixed server-
   selected inputs, status codes, no-store policy, timeout, and no-query/no-body
   behavior;
9. explicit one-command/60-second pull, insufficient-lease rejection,
   30-second receipt lease, 20-second handler timeout, signed acknowledgement,
   and signed health-report contracts;
10. health success, degraded/stopped states, safe-code filtering, and secret/PII
    redaction;
11. Preview and Production database isolation and migration checksum/order;
12. regressions for native booking, email delivery, retention, staff login,
    editor access, commerce, and public routes; and
13. lint, typecheck, the complete unit suite, production build, secret scan,
    package-lock integrity, and `git diff --check`.

Credential tests also cover the `active -> rotation_pending -> active`
compare-and-set sequence, old/new key overlap, failed pre-expiry rollback,
post-expiry old-key rejection, and zero command pulls during binding drift.

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
5. Record the immutable candidate Vercel deployment ID in
   `.builder/site-runtime.json`, rebuild, and prove the manifest and runtime
   digests still match. The recorded ID intentionally identifies the earlier
   reachability candidate; the rebuilt deployment is tested again.
6. Confirm the scheduled worker route is reachable only through its approved
   authenticated invocation path.
7. Create a fresh Production Neon backup, re-audit migrations `0001` through
   `0012`, and apply only the reviewed additive installation migration after
   explicit production authorization.
8. Issue a fresh one-time exchange if the current exchange has expired. Paste
   it directly into the local CLI prompt and complete the manual Vercel handoff.
9. Generate and review `.builder/installation-key-binding.json`, commit both
   safe registration binding files, and verify their values against the
   control-plane site detail without exposing credentials.
10. Using the operator database role, insert the active
    `builder_site_installations` row from the reviewed registration and key-
    binding artifacts. Read it back and prove every identity and digest matches;
    do not give the worker role permission to perform this step.
11. Redeploy with the accepted installation credentials and dedicated Neon
    worker role, wake the runtime, and
   confirm one healthy signed report before any package activation.
12. Assign, provision, and activate only the approved Caleb package set in
    dependency order.
13. Verify the control plane displays the correct site/installation identity,
    exact package versions, compatible schemas, healthy worker, successful
    receipts, and no blocked setup gate.
14. Produce a secret-safe acceptance and rollback report.

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
