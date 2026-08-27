# Caleb Physical-Only Preview Commerce Implementation Plan

**Spec:** `docs/superpowers/specs/2026-08-27-caleb-physical-only-preview-commerce-design.md`

**Website branch:** `codex/caleb-commerce-integration`

**Platform branch:** `codex/caleb-commerce-automations-design`

## Target flow

An authorized operator opens the protected `/store/test` Preview page -> the server validates the
branch, host, database, Stripe test account, and access credential -> one server-owned $1 physical
book fixture creates a durable BuyerIntent and Checkout -> Stripe Checkout runs as a direct charge
in the pinned connected test account -> signed Stripe evidence creates one pending Order -> a leased
saga retrieves the canonical Session, encrypts its US shipping address with a seven-day retention
deadline, creates one manual Fulfillment, reconciles the $1 payment, and appends one operational
Messaging request -> a separate leased worker sends one clearly labeled test email to
`info@calebjakes.com` -> the read-only success page shows server-owned status.

R2, digital products, entitlements, the customer library, Production, DNS, Joyfound, HighLevel, and
real shipment remain outside this plan.

## Authorization boundaries

Approval of this plan authorizes implementation and automated local verification only after the
user separately approves the plan. It does not authorize:

- publishing package releases;
- pushing either branch;
- changing Vercel environment variables;
- deploying or promoting a Vercel build;
- sending a Stripe test transaction or Resend email;
- changing Production, DNS, Joyfound, HighLevel, or provider billing;
- deleting provider data or test records.

Those actions retain the explicit gates below. No secret value belongs in source, fixtures, test
output, evidence, commits, or chat.

## Hard stop gates

### Gate P1: Repository and package authority

Before package work, confirm both clean worktrees still point to the approved repositories and
branches. Before package publication, confirm the website repository can install the exact private
`@reuben-williams` packages through its repository-scoped GitHub Packages access. Do not replace
that access with a broad personal token and do not publish from an unreviewed dirty worktree.

### Gate P2: Protected Preview identity

Before any migration, provider call, or worker run, prove the shared fail-closed guard sees:

- the approved Vercel Preview branch and stable branch hostname;
- `COMMERCE_MODE=platform_test` and the branch-scoped fixture flag;
- the exact Preview Neon hostname allowlist;
- Stripe test mode and connected account `acct_1U8uzX1gSFcbhQ7k`;
- distinct browser and worker credentials;
- a URL that is neither Production nor a public custom domain.

Missing, duplicate, copied, or contradictory identity signals stop the operation before database
or provider access. Tests use an injected guard; deployed code has no local exception.

### Gate P3: Platform release acceptance

The website cannot work around missing platform behavior. All new Commerce, Shipping, Messaging,
Outbox, and Stripe contracts must be implemented and accepted in the Site Editor Platform first.
The release pipeline determines the next exact public package versions; do not guess a version or
use unpublished `@your-builder/*` workspace imports in Caleb's repository.

### Gate P4: Digital delivery remains closed

Do not provision R2, upload placeholders, create digital Offers, grant entitlements, or enable
library/asset routes. `assetStorageReady` and `digitalDeliveryReady` must remain false until a
separate approved design has real source assets and a protected-storage decision.

## Phase A: Patch and release the shared platform packages

### Task 1: Freeze the new platform behavior with failing contract tests

**Platform files**

- Modify: `packages/growth-commerce/src/contracts.ts`
- Modify: `packages/growth-commerce/src/ports.ts`
- Modify: `packages/growth-commerce/src/records.ts`
- Modify: `packages/growth-commerce/src/index.ts`
- Modify: `packages/growth-messaging/src/operations.ts`
- Modify: `packages/growth-messaging/src/records.ts`
- Modify: `packages/growth-messaging/src/index.ts`
- Add/modify focused tests under `packages/growth-commerce/test/` and
  `packages/growth-messaging/test/`

**Red**

Add tests requiring:

- a Checkout-creation evidence port keyed by site, provider connection, and provider Checkout;
- exact digest replay returning the original stable UUID and digest conflict rejection;
- an evidence-only `checkout_awaiting_payment` result;
- a paid-physical-order saga record containing references only, never shipping plaintext;
- a fenced Messaging submission-start record and provider-reference reconciliation;
- stable step and delivery idempotency keys.

Run the narrow package tests, then:

`npm run test:caleb-commerce:contracts`

`npm run test:messaging:contracts`

Confirm failures are missing contracts, not live network or credential failures.

**Green**

Add only the additive records, ports, and exports needed by the approved design. Preserve existing
aggregate boundaries; do not add a second Order, Fulfillment, Shipping, or Delivery lifecycle.

### Task 2: Correct Stripe normalization and payment reconciliation

**Platform files**

- Modify: `packages/next/src/commerce/server/stripe/contracts.ts`
- Modify: `packages/next/src/commerce/server/stripe/normalizer.ts`
- Modify: `packages/next/src/commerce/server/stripe/reconciliation.ts`
- Modify: `packages/next/src/commerce/server/neon-stripe-reconciliation.ts`
- Modify focused Stripe and Neon reconciliation tests

**Red**

Require payment reconciliation to include `currency` and `totalMinor`. Require a valid completed
but unpaid Session to be accepted as `checkout_awaiting_payment` without creating an Order,
Shipping snapshot, Fulfillment, or Delivery. Require a later authenticated async success event to
advance the same Checkout and an async failure to close it without an Order.

Run:

`npm run test:stripe:contracts`

`npm run test:stripe:test-mode`

**Green**

Implement the missing command fields and evidence-only state. Keep signature, account, livemode,
metadata, catalog, amount, and replay checks mandatory.

### Task 3: Add Checkout-creation evidence and repair persistence

**Platform files**

- Add: `packages/next/src/commerce/server/stripe/checkout-evidence.ts`
- Add: `packages/next/src/commerce/server/stripe/checkout-repair.ts`
- Modify: `packages/next/src/commerce/server/stripe/index.ts`
- Modify: `packages/next/src/commerce/server/neon-commerce.ts`
- Add focused evidence, conflict, lease, and repair tests

**Red**

Prove that accepting the authenticated Stripe create response:

- hashes canonical provider facts;
- returns a stable Commerce evidence UUID;
- queues one `finalize_checkout_open` task atomically;
- replays exactly and rejects conflicting facts;
- completes open/bind/resolve-not-granted/identity-erasure without a browser retry;
- commits finalization and repair completion together under an owner/fence lease.

**Green**

Implement a Neon adapter over the new platform port. Persist provider references and digests only;
never persist a Checkout URL, secret, synthetic identity, or shipping address in repair records.

### Task 4: Extend connected-account Session recovery safely

**Platform files**

- Modify: `packages/next/src/commerce/server/stripe/stripe-client.ts`
- Modify: `packages/next/src/commerce/server/stripe/contracts.ts`
- Add/modify Stripe client and cleanup-race tests

**Red**

Require connected-account retrieval, complete line-item pagination, Session expiration, and stable
expiration idempotency. Cover payment winning the expiry race, provider-confirmed expired/unpaid,
ambiguous/unreachable state, no-Session expiry, and a later expired webhook replay.

**Green**

Implement retrieve-before-action and retrieve-after-expiration. Only provider-confirmed
expired/unpaid evidence may drive `commerce.checkout.expire`; ambiguous state produces manual
attention and no terminal mutation. Never use Checkout cancellation when a Session exists.

### Task 5: Make encrypted shipping retention atomic

**Platform files**

- Modify: `packages/next/src/commerce/server/shipping-access.ts`
- Modify: `packages/next/src/commerce/server/neon-shipping.ts`
- Modify shipping cipher/keyring/retention tests only as required

**Red**

Require Shipping snapshot creation to commit ciphertext and `retentionDueAt` in the same Neon
transaction. Assert no adapter or saga input accepts shipping plaintext for persistence, audited
reads require a reason and permission, rotation rewraps keys, and retention creates a
non-reversible tombstone.

Run:

`npm run test:shipping-security`

`npm run test:neon:conformance`

**Green**

Extend the existing Shipping repository/service rather than adding an app-specific address table.
Keep normalized plaintext in memory only between canonical Session retrieval and encryption.

### Task 6: Add the resumable paid-physical-order saga

**Platform files**

- Add: `packages/next/src/commerce/server/paid-order-saga.ts`
- Modify: `packages/next/src/commerce/server/index.ts`
- Modify: `packages/next/src/commerce/server/neon-commerce.ts`
- Add focused saga, duplicate-event, crash, and manual-attention tests

**Red**

Require the approved order:

1. complete Checkout and create one pending Order;
2. retrieve/revalidate the canonical Session, encrypt shipping, and atomically store retention;
3. create one pending manual Fulfillment per physical line;
4. reconcile payment with exact currency and total so the Order becomes paid;
5. append one operational Messaging request.

Fail after every step and prove a leased retry resumes without duplicate effects. Prove conflicting
amounts, addresses, snapshots, lines, or states enter manual attention. Prove accepted event and
saga records contain no address plaintext.

**Green**

Coordinate the existing modules with stable step keys. Do not claim cross-module atomicity and do
not advance a step until its preceding durable effect exists.

### Task 7: Add Neon Messaging and a crash-safe leased Outbox adapter

**Platform files**

- Add: `packages/next/src/messaging/server/neon-messaging.ts`
- Add: `packages/next/src/messaging/server/neon-outbox.ts`
- Modify: `packages/next/src/messaging/server/workers.ts`
- Modify: `packages/next/src/messaging/server/resend-provider.ts`
- Modify: `packages/next/src/messaging/server/resend-webhook.ts`
- Modify: `packages/next/src/messaging/server/index.ts`
- Add focused Neon, lease-fence, crash-window, idempotency, and webhook tests

**Red**

Require claim/renew/complete/fail ownership checks, a fenced pre-submission marker, stable Resend
idempotency, provider message reconciliation, a 23-hour automatic-retry cutoff, `svix-id`
deduplication, monotonic outcomes, and `email.suppressed -> failed/provider_suppressed`.

Prove the paid saga can append its outbox row while Resend is unavailable and that the delivery
worker alone remains unavailable.

**Green**

Implement Neon against the existing Messaging and Outbox contracts. Keep the existing Supabase
adapter intact. Never put email bodies, recipient addresses beyond approved delivery records, or
provider secrets into generic job payloads or logs.

### Task 8: Verify, package, and gate the platform release

**Platform files**

- Modify release manifests/evidence only where the release tooling requires it
- Modify package exports and generated public-name manifests through the repository's release
  scripts, not by hand-editing packed artifacts

Run:

- `npm run typecheck`
- `npm test`
- `npm run test:caleb-commerce:contracts`
- `npm run test:shipping-security`
- `npm run test:stripe:contracts`
- `npm run test:stripe:test-mode`
- `npm run test:messaging:contracts`
- `npm run test:neon:conformance`
- `npm run check:release`
- `npm run release:pack`
- `npm run release:rehearse`
- `git diff --check`

Inspect packed contents and dependency names. Confirm the public release includes only expected
`@reuben-williams` packages, exact versions and integrity metadata, no source secrets, and no local
paths. Stop for explicit authorization before `npm run release:publish`, push, or website install.

## Phase B: Integrate the accepted release into Caleb V3

### Task 9: Pin the accepted package release and split capability gates

**Website files**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `src/lib/platform/environment.ts`
- Add: `src/lib/platform/environment.test.ts`

**Red**

Require independent `checkoutCreateReady`, `stripeWebhookReady`, `resendWebhookReady`,
`statusReady`, `paidOrderSagaReady`, `resendDeliveryWorkerReady`, `assetStorageReady`, and
`digitalDeliveryReady` results. Prove physical Checkout and paid persistence do not depend on R2,
Resend sending, customer status auth, or one another beyond the approved capability definitions.

**Green**

Pin the exact accepted `@reuben-williams/core`, `growth-commerce`, `growth-messaging`, and `next`
releases. Replace the all-or-nothing provider gate with the approved independent capabilities.
Keep public-prefixed values non-secret and every API key, signing secret, HMAC, access credential,
worker credential, and encryption key server-only.

### Task 10: Add one shared Preview identity guard and guarded Neon migration

**Website files**

- Add: `src/lib/platform/preview-guard.ts`
- Add: `src/lib/platform/preview-guard.test.ts`
- Add: `src/lib/platform/neon-commerce-schema.ts`
- Add: `src/lib/platform/neon-commerce-schema.test.ts`
- Add: `scripts/migrate-commerce-preview.mjs`
- Modify: `package.json`

**Red**

Test every individual mismatch: environment, target environment, branch, stable host, public site
URL, Production host, parsed database hostname, Stripe livemode/key family, connected account,
fixture flag, missing Vercel system variables, and credential reuse. Assert no database connection
or provider call occurs after rejection.

**Green**

Use one guard in pages, API routes, workers, and migration. Add an idempotent Neon schema for the
published platform contracts and unique keys from the spec. The migration must verify the Preview
database hostname before opening its transaction and must not contain Production connection data.

### Task 11: Implement the server-owned fixture and BuyerIntent consent

**Website files**

- Add: `src/lib/platform/caleb-preview-catalog.ts`
- Add: `src/lib/platform/caleb-preview-catalog.test.ts`
- Add: `src/lib/platform/checkout-attempts.ts`
- Add: `src/lib/platform/checkout-attempts.test.ts`

**Red**

Require the exact stable key, SKU, title, $1 USD amount, quantity one, no tax, $0 test shipping,
US-only physical delivery, deterministic valid revision IDs, and active status only behind the
guard. Reject browser-authored price, currency, quantity, tax, shipping, account, revision, and
fulfillment facts.

Freeze the exact `transactional_only` consent copy, UTF-8 digest, policy version, synthetic
identity HMAC, `not_granted` resolution, no close-consent command, and immediate identity erasure.
Require a random 20-minute attempt nonce stored only as a digest and one explicit new-attempt
operation per new test purchase.

**Green**

Build server-only platform revision records and deterministic IDs. Do not add the fixture to the
public Store/Joyfound configuration or production catalog.

### Task 12: Compose Checkout creation, repair, and read-only status

**Website files**

- Modify: `src/lib/platform/checkout-route.ts`
- Add/modify focused Checkout route tests
- Modify: `src/app/api/commerce/checkout/route.ts`
- Modify: `src/lib/platform/status-route.ts`
- Modify: `src/app/api/commerce/orders/status/route.ts`
- Modify: `src/app/store/test/page.tsx`
- Modify: `src/components/commerce/test-checkout-panel.tsx`
- Add a read-only test success/status component and tests as required

**Red**

Cover initial attempt, browser retry, Stripe timeout recovery, webhook-before-open repair, expired
attempt cleanup, and status-token tampering. Assert the Stripe idempotency key and platform IDs stay
stable, `record_opened` receives the accepted creation-evidence UUID, and query parameters cannot
create or mutate business records.

**Green**

Compose the published planner, Stripe client, evidence adapter, platform unit of work, and repair
worker. Keep access credentials out of URLs. Make every screen conspicuously `TEST / PREVIEW` and
show only server-owned fixture facts.

### Task 13: Compose signed Stripe and Resend webhook ingress

**Website files**

- Modify: `src/lib/platform/stripe-webhook-runtime.ts`
- Modify: `src/app/api/commerce/stripe/webhook/route.ts`
- Add: `src/lib/platform/resend-webhook-runtime.ts`
- Modify: `src/app/api/commerce/resend/webhook/route.ts`
- Add focused raw-body, account, livemode, replay, delayed-payment, and redaction tests

**Red**

Require raw-body verification before parsing; the eight-event allowlist; exact connected account;
`livemode=false`; canonical connected-account Session retrieval; all line-item pages; metadata,
catalog, currency, quantity, and total reconciliation; awaiting-payment evidence; replay safety;
Resend Svix verification and dedupe. Assert invalid signatures create no mutation.

Add a safe request logger test proving the Vercel protection-bypass query value, raw bodies,
addresses, email contents, and secrets never reach logs.

**Green**

Compose the platform verifiers and repositories. Keep Vercel Authentication enabled; use only the
already configured provider-specific Preview bypass URLs, and never read or persist the bypass in
application code.

### Task 14: Compose leased repair, saga, delivery, and retention workers

**Website files**

- Modify: `src/lib/platform/worker-runtime.ts`
- Modify: `src/app/api/commerce/workers/reconciliation/route.ts`
- Add dedicated internal worker routes only where separation is required
- Add focused worker-auth, lease, crash, retry, and disabled-capability tests

**Red**

Require separate leases and capability checks for Checkout finalization/cleanup, paid-order saga,
Resend delivery, provider reconciliation, and shipping retention. Prove worker credentials are
constant-time checked, cannot activate browser Checkout, and are not shared with provider webhook
signatures or the Preview browser credential.

**Green**

Compose the published Neon adapters and workers. Preserve completed checkpoints, apply bounded
retry/backoff, and emit safe manual-attention codes for ambiguous states. A missing Resend API key
must leave one durable delivery pending without blocking the paid Order.

### Task 15: Keep digital and public commerce surfaces closed

**Website files**

- Modify: `src/lib/platform/runtime-boundaries.ts`
- Modify: `src/lib/platform/runtime-boundaries.test.ts`
- Modify: `src/app/api/commerce/assets/[assetId]/route.ts`
- Modify: `src/app/api/commerce/library/route.ts`
- Modify public Store/test route tests where needed

**Red**

Require the public Store to keep its approved Joyfound handoff, the Preview fixture to be absent
outside `/store/test`, and asset/library/digital-entitlement routes to remain disabled even when
physical Checkout is ready. Prove no R2 variable is required by any physical path.

**Green**

Return stable closed responses for unapproved capabilities without suggesting that digital files
or customer-library access exist.

## Phase C: Verify, stage, and perform the separately authorized test

### Task 16: Full local and package-consumer verification

Run focused tests after every red/green task. Then run in the website worktree:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

Run package-boundary, secret, PII, generated-output, and plaintext-shipping scans. Confirm no test
address, API response body, provider URL, secret, `.env.local`, Vercel value, or release tarball is
staged. Confirm the build consumes the exact released package versions, not local links.

### Task 17: Provision branch-scoped Preview configuration and deploy

After explicit authorization for package publication, push, Vercel configuration, and Preview
deployment:

1. Publish the accepted package set and run `npm run release:verify-published` in the platform.
2. Install the exact versions in Caleb V3 and repeat Task 16.
3. Verify the Preview-only variable names are present without reading secret values back. This
   includes the Preview guard, database hostname allowlist, browser/worker credentials, customer
   session secret, Stripe metadata signing secret, versioned Shipping keys, shipping evidence HMAC,
   verified Resend sender, and independent capability configuration from the spec.
4. Do not copy those values to Production. Keep all secret values Sensitive; the browser-visible
   Turnstile site key remains Config because its public prefix is intentional.
5. Redeploy the stable branch Preview and run the guarded migration once.
6. Confirm both provider webhook URLs still resolve through Vercel's dedicated Preview protection
   bypass and reject invalid provider signatures.
7. Probe direct routes, capability status, public Store handoff, inactive digital routes, desktop
   and mobile layout, console/network errors, redirects, and clean logs.

Stop if the deployment identity, database host, connected Stripe account, package versions, or
provider ingress differs from the approved values. Do not promote to Production or change DNS.

### Task 18: Controlled one-order Preview acceptance

Only after the existing explicit test authorization is reconfirmed immediately before execution:

1. Open the protected `/store/test` branch Preview as the authorized operator.
2. Create one attempt and complete one $1 Stripe test-mode Checkout with synthetic Stripe test data.
3. Stop at the first broken boundary; do not submit a replacement order until the failure is
   classified and replay safety is proven.
4. Verify exactly one Stripe effect, one accepted provider event/saga, one paid Order, one encrypted
   Shipping snapshot with the seven-day deadline, one pending manual test Fulfillment, one Delivery,
   one Resend provider message, and one email to `info@calebjakes.com`.
5. Verify the success status is read-only; full shipping data is absent from email, logs, events,
   saga/outbox payloads, and diagnostics; digital routes remain closed.
6. Exercise duplicate webhook and safe worker replay checks without making a second purchase.
7. Produce a Preview go/no-go report. Do not promote the build, switch DNS, alter Joyfound or
   HighLevel, or dispatch a shipment.
8. When the test is closed, erase/tombstone Preview shipping evidence immediately or by its
   seven-day deadline and revoke the dedicated Preview provider-bypass credential.

## Commit sequence

Prefer small reviewable commits at these boundaries:

1. platform Commerce/Stripe contracts and failing tests;
2. Checkout creation evidence, repair, and connected-account cleanup;
3. atomic Shipping retention and paid-order saga;
4. Neon Messaging/Outbox and Resend crash safety;
5. platform release verification evidence;
6. website package pin, capability gates, and Preview guard;
7. guarded Neon schema, fixture, consent, and attempts;
8. Checkout/status/webhook composition;
9. worker composition and closed digital boundaries;
10. complete local verification;
11. separately authorized package publication and Preview deployment evidence;
12. separately authorized single-order acceptance report.

Do not combine provider secrets, generated packages, screenshots containing customer/provider data,
or unrelated user changes with any commit.
