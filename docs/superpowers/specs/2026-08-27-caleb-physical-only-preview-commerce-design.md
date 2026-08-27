# Caleb Physical-Only Preview Commerce Design

- Date: 2026-08-27
- Branch: `codex/caleb-commerce-integration`
- Status: written Option 1 spec approved in conversation
- Scope: one protected Preview test; no Production, DNS, Joyfound, or HighLevel changes

## Outcome

Prove one complete Stripe test-mode purchase of Caleb's physical book without requiring private
digital-asset storage. The test covers server-owned pricing, Stripe Connect direct charges, durable
commerce records, encrypted shipping evidence, one manual-fulfillment item, and one operational
email to `info@calebjakes.com`. It does not publish a real offer or imply that the final product,
price, tax, shipping, or fulfillment policy has been approved.

## Preview-Only Offer

The only enabled fixture is:

- stable key: `caleb-print-book-preview-test`
- internal SKU: `CJ-SPGP-PRINT-PREVIEW-TEST`
- title: `TEST ORDER — Shedding Pounds, Gaining Purpose`
- currency and quantity: USD, exactly one
- merchandise amount: 100 minor units ($1.00)
- tax: `not_collected`
- shipping: fixed 0 minor units, labeled `TEST Shipping — $0`
- destination: United States only
- delivery model: physical; one manual-fulfillment item after verified payment

The fixture lives in a server-only Preview catalog adapter, not in the production
`calebCommerceConfig` or public Joyfound catalog. The adapter creates stable, valid platform
`ProductRevision`, `OfferRevision`, and `OfferPriceRevision` records with deterministic UUIDs and
an active Offer only after the Preview guard passes. Digital products and entitlements are absent.
The production catalog continues to return no approved platform Offers.

## Non-Production Guard

All test pages, checkout commands, workers, and migration scripts use the same fail-closed guard.
Runtime access requires every condition below:

1. `COMMERCE_MODE=platform_test`, `COMMERCE_RUNTIME_ENABLED=true`, and a branch-scoped
   `COMMERCE_PREVIEW_FIXTURE_ENABLED=true`.
2. Vercel system variables are exposed and report `VERCEL=1`, `VERCEL_ENV=preview`,
   `VERCEL_TARGET_ENV=preview`, and `VERCEL_GIT_COMMIT_REF=codex/caleb-commerce-integration`.
3. `VERCEL_BRANCH_URL` and the configured `NEXT_PUBLIC_SITE_URL` identify the approved stable
   branch Preview host. The Production URL is explicitly rejected.
4. The parsed `DATABASE_URL` hostname exactly matches a separately configured, branch-scoped
   `COMMERCE_PREVIEW_DATABASE_HOST` allowlist value. The migration command performs this same
   check before opening a transaction.
5. Stripe uses a test secret, the Checkout result and webhook have `livemode=false`, and
   `STRIPE_CONNECTED_ACCOUNT_ID` equals the pinned test account `acct_1U8uzX1gSFcbhQ7k`.
6. The browser presents the Preview test-access credential; workers present the separate worker
   credential. Both are compared in constant time and never appear in URLs or logs.

There is no local-development exception in a deployed runtime. Automated tests inject an explicit
test guard adapter instead of weakening the Vercel checks. Missing, duplicated, copied, or
contradictory identity signals close the feature. Therefore copying the fixture variables into
Production cannot activate it.

### Protected provider ingress

Stripe and Resend keep using the stable branch Preview webhook URLs already configured with
Vercel's Protection Bypass for Automation query parameter. This is the provider-compatible method
for services that cannot send a custom bypass header; it leaves Vercel Authentication enabled for
the rest of Preview. The bypass is a dedicated, revocable Preview credential and is never copied
into code, Neon, application environment variables, screenshots, or test output. The app never
logs the request URL/query, and safe logging middleware redacts the bypass parameter if framework
instrumentation reports it. Vercel consumes the bypass before the app; Stripe and Resend raw-body
signature verification remains mandatory and unchanged. No bypass cookie is requested. Tests
prove provider POSTs reach each route, an absent/invalid bypass receives Vercel protection, and a
valid bypass with an invalid provider signature still receives an application rejection. Revoke
the dedicated bypass when this Preview exercise is closed.

## Platform Contracts and Persistence

Use the installed `@reuben-williams` platform packages rather than introducing a second commerce
lifecycle:

- `@reuben-williams/growth-commerce` records, commands, lifecycle, unit of work, and outbox;
- `@reuben-williams/next/commerce/server` Neon repositories, Stripe metadata signer, Checkout
  planner/client, webhook verifier, normalizer, reconciliation service, shipping cipher, keyring,
  audited shipping access, rotation, and retention workers;
- `@reuben-williams/growth-messaging`, `@reuben-williams/growth-core`, and
  `@reuben-williams/next/messaging/server` delivery lifecycle, leased outbox worker, Resend provider,
  and Resend webhook adapter.

The additive Neon migration implements those existing contracts for this app. It may add adapter
tables or columns required by the published contracts, but it must not invent parallel pending
Order, email, shipping, or fulfillment aggregates. Unique constraints cover site plus checkout
attempt, provider event, fulfillment order line, delivery idempotency key, provider message
reference, and Resend `svix-id`. Migrations are idempotent and run only after the Preview database
identity guard passes.

The currently installed package release cannot complete this slice unchanged. Before the website
integration, patch and release the platform packages, then pin the website to that exact release:

1. Correct Stripe reconciliation so `commerce.order.reconcile_payment` includes the contract's
   required `currency` and `totalMinor` values.
2. Add an evidence-only `checkout_awaiting_payment` normalization/reconciliation path for a valid
   completed Session whose payment is not yet paid.
3. Add the Neon implementation of the existing Messaging delivery and leased Outbox contracts,
   including a fenced submission-start marker and provider-reference reconciliation.
4. Add the paid-physical-order saga contract described below. It coordinates existing Commerce,
   Shipping, Fulfillment, and Messaging commands; it does not add a replacement aggregate.
5. Add a Stripe Checkout-creation evidence port. It accepts the authenticated API response using
   the stable provider key `(siteId, providerConnectionId, providerCheckoutRef)`, stores a SHA-256
   digest of the canonical provider reference, account, `livemode`, and signed Checkout metadata,
   and returns a stable UUID Commerce evidence/event ID. An exact replay returns the original ID;
   the same provider key with a different digest is a conflict. That returned ID is the
   `acceptedProviderEventId` required by `commerce.checkout.record_opened`.
6. Extend the Stripe runtime port with connected-account Session expiration/retrieval for Checkout
   repair, and extend Shipping snapshot creation so ciphertext and `retentionDueAt` are committed
   atomically. Plaintext shipping fields are never accepted by a saga/outbox record.

The package release must pass its own contract, lifecycle, concurrency, and adapter tests before
the Caleb website consumes it. The website build fails if the pinned release lacks any required
contract.

An `Order` does not exist before payment. The authoritative lifecycle is:

`BuyerIntent -> Checkout -> Stripe paid evidence -> Order -> manual Fulfillment`

The fixture uses one deterministic synthetic test customer. Its identifiers and normalized
`example.test` identity are server-owned; no real customer record is created.

The synthetic BuyerIntent freezes non-marketing consent facts rather than leaving consent open:

- normalized identity: HMAC of `caleb.preview.order@example.test` using the Preview identity secret;
- `consentChoice`: `transactional_only`;
- exact consent copy: `This is a test-only operational purchase. No marketing consent is requested.`;
- `consentCopyDigest`: SHA-256 of that exact UTF-8 copy;
- `policyVersion`: `caleb-preview-commerce-test-v1`;
- resolution after binding: `consentResolution=not_granted`, with no `consentEvidenceId`.

Because resolution is explicitly `not_granted`, `commerce.buyer_intent.close_consent` is not
called; that command is reserved for an intent resolved as `pending`. Identity erasure still runs
immediately after resolution.

## Checkout and Retry Flow

1. An authorized operator opens `/store/test`. The page is visibly marked `TEST / PREVIEW`, shows
   only the fixture, and never accepts price, currency, tax, shipping charge, connected account,
   revision IDs, or fulfillment facts from the browser.
2. The server issues a random, single-purpose checkout-attempt nonce with a 20-minute expiry. A
   unique Neon row binds the nonce digest to the site and fixture. Browser retries reuse the same
   attempt; a new purchase requires an explicit new attempt.
3. Deterministic UUIDs derived from site plus nonce identify the BuyerIntent and Checkout. In one
   platform unit of work, the server creates the pending BuyerIntent and creates the Checkout with
   the exact revision quotes and deterministic test customer. The BuyerIntent deliberately remains
   `pending`, as required by the Checkout planner.
4. After that transaction commits, `buildStripeCheckoutPlan` validates the still-pending
   BuyerIntent and creates a direct-charge Checkout Session in the pinned connected test account.
   Signed platform metadata is attached to the Session and PaymentIntent. The existing stable key
   `stripe-checkout:{siteId}:{checkoutId}:{offerPriceRevisionId}` is used for every retry.
5. After Stripe returns, the Checkout-creation evidence port accepts or replays the canonical
   response and atomically queues a durable `finalize_checkout_open` repair task. It returns its
   stable evidence UUID. One unit of work supplies that UUID as
   `acceptedProviderEventId`, records the Checkout open, binds the BuyerIntent to the Checkout,
   resolves it to the deterministic synthetic customer with `consentResolution=not_granted`, and
   erases its normalized identity HMAC. If the request times out before this unit commits, the next
   call repeats the exact Stripe request with the same key and receives the original result, then
   completes the same transitions. If a webhook arrives first, its signed `checkoutId` resolves the
   already committed Checkout and queues reconciliation until the open/bind/resolve unit completes.
6. The success page is read-only. It looks up server-side status through a short-lived signed
   customer-session token; query strings cannot create orders, fulfillments, messages, or access.

The leased Checkout repair worker scans creation evidence whose finalization marker is absent and
replays the same open/bind/resolve/erase unit without needing a browser retry. Finalization and the
repair-task completion marker commit together. Cleanup always reloads the BuyerIntent and Checkout
states; it never infers that a BuyerIntent is resolved merely because Session evidence exists.

If repair cannot complete before attempt expiry, cleanup holds the attempt lease and retrieves the
canonical Session in the pinned connected-account context immediately before taking action:

1. If it is `complete` and paid, cleanup performs no expiry mutation and enqueues the normal paid
   reconciliation path from authenticated retrieval evidence.
2. If it is open and unpaid, cleanup requests Stripe Session expiration with a stable idempotency
   key, then retrieves the Session again. If payment won the race and the Session is now complete
   and paid, it follows rule 1.
3. Only when the second retrieval proves the Session is expired and unpaid does cleanup accept the
   provider-expiration evidence, apply `commerce.checkout.expire` with that evidence ID, expire a
   still-pending BuyerIntent, erase its identity HMAC, and close the attempt.
4. Any ambiguous, inconsistent, or unreachable provider state produces no local cancellation or
   expiry; it enters reconciliation/manual attention and retries safely.

The Session-exists path never applies `commerce.checkout.cancel`. A later
`checkout.session.expired` webhook for an already-expired Checkout is durably accepted as replay or
evidence-only and does not attempt a second state transition. This compare-and-reconcile sequence
prevents cleanup from stranding a test payment.

If no Stripe Session was created before attempt expiry, the cleanup worker cancels the created
Checkout, expires the pending BuyerIntent, erases its identity HMAC, and tombstones the attempt. If
a finalized Session later expires, `checkout.session.expired` expires the Checkout; its resolved
BuyerIntent has already had its identity erased. Paid, failed, cancelled, expired, and manually
closed Preview orders all receive a terminal diagnostic and the seven-day shipping-retention
deadline where applicable. The application closes unresolved attempts before Stripe's idempotency
retention window, so an expired local attempt is never replayed as a new provider operation.

## Stripe Evidence and Order Creation

The configured endpoint listens to **events on connected accounts**. It accepts only the eight
configured commerce events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`

The route verifies the raw body and Stripe signature before parsing, requires the top-level
`event.account` and configured account to equal `acct_1U8uzX1gSFcbhQ7k`, requires
`livemode=false`, and rejects all other event types. Checkout creation, connected-account health
retrieval, migration/fixture validation, and tests pin this same account. For Checkout events the
route retrieves the canonical Session and all line items
in the connected-account context; pagination is used if Stripe returns more than one page. Signed
metadata, server catalog revisions, currency, quantity, and charged totals must reconcile exactly.

`checkout.session.completed` creates payment effects only when the retrieved Session is
`status=complete` and `payment_status=paid`. A valid but unpaid completed Session is signature-
verified, durably receipted as `checkout_awaiting_payment`, acknowledged, and produces no Commerce,
Shipping, Fulfillment, or Messaging mutation. A later, separately signed
`checkout.session.async_payment_succeeded` event can supersede it and start paid processing;
`checkout.session.async_payment_failed` closes it without creating an Order. Failed or expired
events never create an Order.

The verified paid event is first accepted/replayed and atomically enqueues one deterministic saga
record. A leased worker applies these idempotent steps in order, resuming from the last committed
step after any crash:

1. record Checkout completion and create the Order in `pending` state using stable IDs and the
   reconciled server-owned line items;
2. use the stored `providerCheckoutRef` to retrieve the canonical Checkout Session again in the
   pinned connected-account context. Revalidate `complete`/`paid`, signed metadata, and totals;
   normalize its US shipping address only in memory, immediately encrypt it, and in one Neon
   transaction create the deterministic Shipping snapshot ciphertext together with
   `retentionDueAt = paidAt + 7 days`, then apply `commerce.order.record_shipping_snapshot` while
   the Order is still pending;
3. create exactly one pending manual Fulfillment per physical Order line, referencing that
   `shippingSnapshotId`;
4. apply `commerce.order.reconcile_payment` with `currency` and `totalMinor`, transitioning the
   Order to `paid`;
5. append exactly one operational Messaging delivery request to the leased Outbox.

Each step has its own unique idempotency key derived from the accepted Stripe event and aggregate.
The saga never advances if the prior effect is missing, and a conflicting amount, address,
snapshot, line, or state enters manual attention. This ordered saga is intentionally not described
as one cross-module database transaction. The accepted-event or saga row contains only the
`providerCheckoutRef`, never shipping plaintext. If connected-account retrieval or encryption
fails, step 2 retries without persisting an address; if its snapshot commit succeeds, the retention
deadline exists in that same commit even if every later saga step fails. Refund and dispute events
update only the existing Order.

## Shipping Safety and Manual Fulfillment

Stripe's normalized US shipping address is stored only after verified payment and only through the
platform shipping-evidence service. It is envelope-encrypted at rest with AES-256-GCM data keys
wrapped by the versioned keyring. Preview uses branch-scoped secrets:

- `SHIPPING_KEK_VERSIONS`
- `SHIPPING_KEK_CURRENT_VERSION`
- `SHIPPING_KEK_<version>`
- `SHIPPING_EVIDENCE_HMAC_SECRET`

Only a Caleb-site staff session with `commerce.fulfillment.read` may decrypt it, and every read
requires a purpose/reason and writes an access audit. Key rotation rewraps data keys without
revealing addresses. Preview shipping evidence is due for erasure seven days after the test Order
is paid (or immediately after the test is closed, whichever is earlier), unless an explicit legal
hold exists. Retention replaces ciphertext with a non-reversible tombstone; application logs and
emails never contain the full address. Database-backup expiry is handled by Neon's configured
backup retention; erased records are not reintroduced into the live database.

No shipment is purchased or dispatched. The queue item is labeled `TEST` and can only be marked as
a manual test exercise.

## Email and Resend Evidence

Saga step 5 requests exactly one operational email through the platform Messaging delivery/outbox
contracts. The Preview fixture publishes immutable revision 1 of the operational Commerce email
template `caleb-preview-order-fulfillment-test` (`kind=fulfillment`, `purpose=operational`) with
deterministic template/revision IDs and an explicit `publishedAt` value:

- sender: `Caleb Jakes Orders <orders@mail.calebjakes.com>`
- recipient allowlist: only `info@calebjakes.com`
- subject template: `[TEST] Caleb Preview Order — {{order_id}}`
- body: test label, Order ID, SKU, quantity, charged total, and manual-fulfillment state; no full
  shipping address and no marketing copy
- exact variables: `order_id`, `sku`, `quantity`, `total`, and `fulfillment_state`

The authenticated worker claims the outbox row with a lease fence. Before calling Resend it writes
a fenced submission-start record containing the delivery ID, stable idempotency key
`caleb-preview-order/{orderId}`, attempt number, and start time. After acceptance it persists the
provider message ID under the same fence before completing the lease. Transient failures retry with
backoff and the same key. If a process dies after submission starts but before the provider ID is
saved, an expired lease may automatically repeat the same request only while the original Resend
idempotency window is safely open. At or beyond 23 hours from submission start, a delivery without
a provider ID enters reconciliation/manual attention and is never automatically resubmitted. The
Neon delivery and submission records remain the durable authority beyond Resend's 24-hour window.

The Resend webhook verifies the raw payload with `svix-id`, `svix-timestamp`, and `svix-signature`.
It deduplicates by `svix-id`, resolves the stored provider message ID, and applies only the existing
monotonic delivery outcomes: `delivered`, `bounced`, `complained`, or `failed`. Resend
`email.suppressed` maps to `failed` with reason `provider_suppressed`, matching the published
adapter. Out-of-order or replayed events cannot resend email or repeat commerce effects.

## Independent Capability Gates

Do not replace the current all-or-nothing gate with another broad gate. Expose these server-side
capabilities independently:

- `checkoutCreateReady`: Preview guard, Neon, pinned Stripe test connection
  `acct_1U8uzX1gSFcbhQ7k`, metadata signer, customer session secret, and fixture catalog are valid.
- `stripeWebhookReady`: Neon, Stripe endpoint secret, metadata signer, connected account, and the
  Preview guard are valid. It does not depend on Resend, customer auth, workers, or R2.
- `resendWebhookReady`: Neon, Resend webhook secret/API verification support, and Preview guard are
  valid. It does not depend on Stripe, customer auth, workers, or R2.
- `statusReady`: Neon, customer-session secret, and Preview guard are valid.
- `paidOrderSagaReady`: Neon, worker secret, shipping keyring, paid-order saga package contract,
  Messaging outbox persistence, and Preview guard are valid. It does not depend on the Resend API,
  Resend webhook, customer auth, or R2.
- `resendDeliveryWorkerReady`: Neon Messaging/outbox persistence, worker secret, published template
  revision, verified sender, recipient allowlist, Resend API key, and Preview guard are valid. It
  does not gate Stripe ingestion or the paid-order saga.
- `assetStorageReady`: all private R2 bindings are valid.
- `digitalDeliveryReady`: `assetStorageReady` plus at least one approved digital product and asset.

R2, private asset routes, the customer library, and digital entitlements remain disabled. A missing
Resend configuration must not prevent Stripe from safely recording a payment, creating the
encrypted Shipping snapshot and manual Fulfillment, transitioning the Order to paid, or appending
the durable Messaging outbox row; only delivery remains pending. A missing customer-session secret
must not block webhook ingestion.

## Error Rules

- Unsupported methods or media types, oversized bodies, browser-authored commerce facts, invalid
  credentials, expired attempts, and disabled capabilities return stable fail-closed responses.
- Signature, environment, branch, database, connected-account, metadata, or amount mismatches make
  no business mutation and emit only a safe diagnostic code.
- Logs contain correlation, checkout, order, and provider-event identifiers, never secrets, raw
  provider bodies, email content, or addresses.
- Every ambiguous provider outcome is recoverable by the existing idempotency key, provider
  evidence, and reconciliation worker. No retry creates a new business identifier.

## Verification and Acceptance

Before the authorized test order:

1. Unit tests prove that every Production or identity mismatch fails closed, while physical
   Checkout can be ready without R2 and every digital/private-asset route stays disabled.
2. Contract tests prove valid platform fixture records, server-owned $1 totals, fixed $0 shipping,
   test connected-account scoping, frozen non-marketing BuyerIntent consent values, exact identity
   erasure behavior, and rejection of browser-authored facts.
3. Concurrency tests prove retry/time-out recovery and webhook-before-session-persistence behavior.
   Checkout-creation evidence tests prove stable IDs, exact digest replay, conflict rejection, and
   valid `acceptedProviderEventId` use for `record_opened`. Crash tests prove stored creation
   evidence finalizes open/bind/resolve/erase without a browser retry. Cleanup race tests prove an
   unpaid Session uses provider-confirmed expiry and the Commerce `expire` transition, a payment
   that wins the race enters paid reconciliation, ambiguous states make no terminal mutation, and
   a later expired webhook is replay/evidence-only.
4. Webhook tests prove raw-body verification, exact account/livemode/event checks, delayed-payment
   rules, connected-account retrieval, pagination, amount reconciliation, and replay safety.
5. Persistence tests prove one paid Order, one manual-fulfillment item, one email delivery request,
   connected-account Session retrieval, no plaintext shipping in event/saga/outbox storage,
   encrypted shipping evidence with an atomically created retention deadline, audited reads, and
   retention tombstoning under duplicate events and a failure after snapshot creation.
6. Capability tests prove the paid-order saga completes and appends an outbox row while Resend is
   unavailable, while the separate delivery worker remains safely unavailable.
7. Messaging tests prove the published template revision renders only its exact variables, leased
   delivery writes a fenced pre-submission record, stable Resend idempotency survives a crash,
   `svix-id` dedupes, states remain monotonic out of order, `email.suppressed` maps to the published
   failure vocabulary, and no second send occurs near or after the provider's 24-hour window.
8. Provider-ingress tests prove Vercel Protection Bypass reaches only the signed webhook handlers,
   no bypass value reaches logs, and invalid provider signatures still fail.
9. Lint, typecheck, all tests, production build, and Vercel Preview build pass. Protected Preview
   probes confirm the public Store still hands off to Joyfound and inactive library/asset routes
   remain closed.

Then perform one clearly labeled $1 Stripe test order with synthetic Stripe test data, verify the
single Stripe effect, Neon records, one queue item, one email to `info@calebjakes.com`, encrypted
shipping record, success-page status, and clean logs. Stop at the first broken boundary. Do not
promote the deployment or change DNS.

## Explicitly Out of Scope

- Production deployment, live Stripe mode, or final pricing;
- approved taxes, paid shipping, inventory, labels, or real shipment;
- real customer data or marketing email;
- audiobook, workbook, course, R2, private library, or digital entitlements;
- public Store cutover, `joyfound.calebjakes.com`, DNS, or HighLevel changes.
