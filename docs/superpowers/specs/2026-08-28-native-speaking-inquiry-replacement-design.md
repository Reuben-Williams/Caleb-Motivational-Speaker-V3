# Native Speaking Inquiry Replacement Design

- Date: 2026-08-28
- Repository: `Reuben-Williams/Caleb-Motivational-Speaker-V3`
- Target branch: `main`
- Status: approved by the user on 2026-08-29
- Production boundary: no DNS change and no commerce order

## Outcome

Replace the active HighLevel speaking-inquiry dependency with a native Caleb data
plane that uses the approved site-editor platform contracts. A valid form
submission creates one durable website submission, one contact, and one lead in
the `Speaking Engagements` pipeline for each distinct event inquiry. Resend sends
the organizer acknowledgement and the internal notification to Caleb. The
existing form, Turnstile protection, Upstash rate limits, deterministic inquiry
IDs, and truthful thank-you state remain.

The replacement is complete only when the fixed Vercel production hostname can
accept and display an inquiry without reading or writing HighLevel. Public DNS
stays unchanged until that acceptance passes.

## Approved Constraints

- Caleb no longer uses HighLevel. No new production inquiry may depend on it.
- One distinct event inquiry creates exactly one lead/opportunity, even when the
  organizer already exists.
- An identical replay returns the original inquiry receipt and does not create a
  second contact, lead, notification request, or email.
- Neon is the durable system of record.
- Upstash remains a transient coordination layer for rate limiting and short
  processing leases; it is not the authoritative inquiry database.
- Resend sends transactional email from the verified Caleb sender domain.
- Turnstile remains in Managed mode.
- The public acknowledgement confirms receipt only. It does not promise
  availability, pricing, a response time, or a completed booking.
- Commerce, Stripe, the `$7.99` audiobook add-on, digital fulfillment, and the
  protected customer library are outside this replacement.
- No DNS change, HighLevel mutation, production commerce activation, or commerce
  test order is authorized by this spec.

## Considered Approaches

### A. Re-enable the former Resend-only implementation

This is the smallest change, but email would remain the business acceptance
boundary and Upstash would be the only inquiry record. Caleb would not receive a
native customer/lead pipeline. This does not satisfy the approved platform
direction.

### B. Use the site-editor control plane as the public form endpoint

This centralizes every client immediately, but the current client attachment
model keeps each site's customer data in its site-local data plane. Routing
public Caleb inquiries through the control plane would enlarge the outage and
privacy boundary and contradict the approved site-local architecture.

### C. Site-local Neon persistence using published platform contracts

This is the approved approach. Caleb V3 owns the public route and its isolated
Neon database. The implementation consumes the exact published
`@reuben-williams/*` domain and UI contracts, adds a Caleb-scoped Neon adapter,
and exposes the lead through the native editor surface. It gives Caleb an
immediate native workflow without introducing a second CRM service.

## Architecture

### Public route

`POST /api/inquiries` remains the only public mutation endpoint. It continues to
enforce JSON-only requests, the body-size limit, Zod validation, Turnstile,
rate limits, deterministic inquiry identity, and secret-safe logging.

The route uses the default Node.js runtime. It does not expose database,
provider, contact, lead, or delivery identifiers in the browser response.

### Native inquiry gateway

Replace `HighLevelInquiryGateway` with `NativeInquiryGateway`. The gateway uses
the platform Postgres data-plane boundary and performs one retry-safe database
transaction that:

1. stores the immutable form submission and consent evidence;
2. resolves or creates one contact from site-scoped normalized email and phone
   identities, failing closed when those identities point to different contacts;
3. creates one `website_form` lead for the distinct inquiry;
4. records the initial `created` lead event with status `new` and service key
   `speaking-engagement`;
5. appends two transactional email requests to a durable outbox; and
6. stores the deterministic public inquiry ID as the replay key.

The public route uses a dedicated, server-only data-plane runtime identity with
the minimum create/ingestion and message-queue capabilities. It is not Caleb's
or the operator's staff identity, cannot read the editor workspace, and is never
derived from request input.

The lead is the native equivalent of the former HighLevel opportunity. The UI
labels this tenant's workspace `Speaking Engagements`, while the underlying
published Growth Leads status vocabulary remains `new`, `contacted`,
`qualified`, `won`, `lost`, or `spam`.

The adapter maps the published domain source `website_form` to the persisted
source `public_form`. `builder_leads` remains unchanged and does not gain a
submission column. The authoritative link is one version-1
`builder_form_submission_results` row with `result_code='enhanced'`,
`contact_id`, and `lead_id`. The database enforces uniqueness for:

- `(site_id, key_id, inquiry_identity_digest)` in a dedicated append-only
  submission-identity ledger;
- `(site_id, idempotency_key)` on `builder_form_submissions`;
- normalized email identity within one site;
- `(site_id, submission_id, version)` on submission results, with exactly one
  enhanced version-1 result per accepted website inquiry; and
- `(site_id, idempotency_key)` on outbox messages.

An exact replay returns the stored acceptance. A changed event payload receives
a new inquiry identity and may create another lead for the same contact.

Inquiry identity includes the normalized organizer email and all event-defining
fields: audience, event type, preferred dates, audience size, location,
attendance mode, program length, goals, budget, and additional event details.
It excludes the organizer's display name, phone, organization/role, referral
answers, UTM values, and referrer path. Therefore correcting contact or
attribution data does not create a second event opportunity, while changing an
event-defining field does.

For every request the service computes candidates from the active inquiry HMAC
key and every retained previous key, queries the identity ledger for all
candidates in one transaction, and returns the original submission and receipt
if any candidate matches. A newly accepted inquiry stores the active candidate.
Previous secrets remain configured until every identity created with them has
expired under the retention policy; rotating a key cannot create a second lead.

### Platform boundary

Use the exact previously approved `0.5.0` `@reuben-williams/*` release. The
direct package set for this slice is limited to the published Core, Next, Forms,
Growth Core, Growth Customers, Growth Leads, and Growth Messaging contracts and
the Growth Leads UI. Their transitive dependencies remain lockfile-controlled.

The Caleb adapter must preserve platform table names and record shapes rather
than inventing a separate `caleb_crm` lifecycle. The additive Neon migrations
begin after the already approved `0001`-`0009` manifest. They port the exact
base-submission, contact, lead, result, event, consent, general outbox, outbox
attempt, and privacy-lifecycle structures required by the published contracts.
They also add only the inquiry identity/receipt ledger needed for HMAC rotation.
Column differences required by the portable Neon member model use
`builder_site_members.member_id`, while domain projections retain the published
record shapes. Commerce tables and migrations remain unchanged.

### Email delivery

Database acceptance is the public success boundary. After the transaction
commits, the request asks the same database-leased worker service to attempt both
queued Resend deliveries immediately:

- organizer acknowledgement; and
- internal notification to `info@calebjakes.com`.

Each delivery uses a stable provider idempotency key. A temporary Resend failure
does not erase or reject the stored inquiry. It leaves the outbox item retryable
and the public response truthfully confirms only receipt. A protected
operational worker route requires a dedicated worker secret, accepts POST only,
and never accepts site, recipient, sender, lease, or capability values from the
browser. Because Vercel Cron invokes a GET handler, a separate GET-only
scheduler shim runs every five minutes, validates `CRON_SECRET`, accepts no
request parameters, and calls the same worker service directly.

Both the immediate attempt and Cron call the same claim function. Neon owns the
60-second fenced lease, attempt number, and lease token; Upstash does not lease
email work. A stale worker cannot complete a newer lease. Transient failures use
bounded exponential delays of 1, 5, 15, and 60 minutes, then enter
`dead_letter`. An uncertain Resend outcome enters `reconciliation_required`
rather than resending after the provider idempotency window is exhausted.
Completed, retried, dead-lettered, and reconciliation outcomes are append-only
attempt records. Safe editor projections expose status without provider bodies.

The Resend adapter allowlists the verified Caleb sender, Caleb's published
reply-to address, `info@calebjakes.com` for the internal notification, and the
normalized organizer email linked to the accepted submission for the receipt.
No arbitrary recipient supplied by an editor or request body is accepted.

### Privacy and retention

The Privacy page must be updated in the same release. It may no longer say that
the application does not store complete inquiry payloads or that a separate CRM
holds the records. It must accurately disclose site-local storage, form
security/rate-limiting processing, and transactional email delivery without
inventing legal assurances.

Preserve the previously approved 400-day accepted-inquiry retention contract by
porting the complete reusable Forms privacy lifecycle, not only a deadline
column. This includes reviewed retention-policy evidence, consent events,
deletion requests, privacy tombstones, a dedicated retention-worker role,
authorized purge functions, and tests for restrictive foreign keys and
append-only records. The provisioned Caleb policy is 400 days and may be
shortened only through the platform's authorized policy command.

The cleanup lifecycle covers every copy of inquiry PII in submission payloads,
contact identities, message bodies, outbox payloads, delivery records, and
temporary notification projections. Once a delivery becomes terminal, its body
and destination are redacted on the earliest safe cleanup schedule while the
provider reference digest, state, safe reason code, and idempotency evidence are
retained only as long as required by the inquiry policy. A verified deletion
request can shorten the lifecycle. Caleb's published contact email and phone
remain the request path until the native privacy-request workspace is activated.

### Editor experience

The existing editor route is not currently an authorization boundary; its
commerce and Automations pages are denied demo shells. Before any inquiry PII is
projected, this release must add the approved provider-neutral staff session and
Postgres authorization adapters. The central site-editor Supabase Auth tenant
verifies identity only; Caleb's Neon database remains authoritative for site
membership, role, grants, assignments, entitlements, authorization version, and
session revocation.

Every page render, query, and mutation derives the site and subject from the
verified server session, reloads current membership and capability state, and
fails closed on expiry, revocation, wrong issuer/audience, missing entitlement,
or cross-site access. Caleb receives the `owner` role and the operator receives
the previously approved `administrator_operator` role; neither role is selected
by the browser. Reads require `leads.read`; state updates require
`leads.update`; task changes require `tasks.manage`; notification inspection
requires `messages.read`. Responses containing owner data use `Cache-Control:
private, no-store` and editor pages remain non-indexable.

After that boundary exists, the private editor gains a `Speaking Engagements`
entry backed by the published Growth Leads workspace. Caleb can:

- view each distinct website inquiry once;
- see the linked organizer and submitted event summary;
- move the lead through the native pipeline;
- add tasks and notes supported by the existing contracts; and
- see safe notification-delivery status.

A discreet `Staff Login` link in the public footer routes only to
`/admin/login`. The editor route remains unlinked, no-index, and no-store. If
central staff identity, Caleb membership, or entitlement provisioning is
incomplete, the workspace remains unavailable; the public booking route does
not weaken or bypass staff authorization.

## Data Mapping

| Booking form concept | Native record |
| --- | --- |
| Full name, work email, phone | Contact and site-scoped identities |
| Privacy acknowledgement | Immutable submission consent evidence |
| Organization and role | Submission payload and lead summary |
| Audience, event type, dates, size, location, mode, length | Immutable submission payload |
| Goals, budget, additional details | Immutable submission payload |
| Referral and UTM values | Submission attribution metadata |
| Website Inquiry ID | Public receipt and deterministic replay key |
| HighLevel opportunity | Growth Lead in `Speaking Engagements` |

The public payload is not copied into logs. The internal email may contain the
approved operational fields because its recipient is Caleb's monitored inbox.

## Failure and Recovery Behavior

- Invalid input, failed Turnstile, and rate limits preserve the current public
  responses.
- A transient Neon error returns a fail-closed `503`; it never claims receipt.
- A transaction conflict reruns the exact lookup and returns the original
  acceptance when the inquiry already exists.
- Upstash loss disables rate/lease coordination and fails closed; it does not
  downgrade to unbounded submission.
- Resend loss after database commit leaves a retryable outbox item and still
  returns the stored inquiry receipt.
- A duplicate request cannot send duplicate emails because database and provider
  idempotency keys are stable.
- HighLevel credentials remain untouched until native staging passes. They are
  then removed from Vercel and the runtime token is revoked as a separate,
  auditable cleanup action.

## Configuration

The native runtime requires these Production values, without exposing them:

- `DATABASE_URL`
- a stable Caleb site ID and dedicated server runtime identity used by the
  platform data plane
- the minimum native data-plane capability list
- central staff-session issuer, audience, and verification configuration
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `INQUIRY_NOTIFICATION_EMAIL`
- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- the current inquiry HMAC keyring values
- the dedicated outbox worker secret

The runtime no longer requires any `HIGHLEVEL_*` value. Environment removal and
token revocation occur only after the native production-candidate test passes.

## Testing

Implementation follows red-green-refactor. Required automated evidence includes:

1. migration checksum/order and clean-database tests;
2. transaction tests for new contact, existing contact/new inquiry, exact replay,
   conflicting replay, HMAC rotation, attribution-only replay, event-changing
   resubmission, rollback, and concurrent duplicate submission;
3. service tests proving Turnstile and rate limits run before persistence;
4. database-fenced outbox, immediate/Cron race, Resend recipient authorization,
   idempotency, retry, dead-letter, and reconciliation tests;
5. route tests proving safe response and logging contracts;
6. staff-session, revocation, capability, cross-site, no-store, and editor
   adapter/UI tests for the `Speaking Engagements` pipeline;
7. 400-day retention, verified deletion, tombstone, and PII cleanup tests across
   submissions, identities, outbox, messages, and delivery records; and
8. complete lint, typecheck, unit suite, production build, secret scan, and
   `git diff --check`.

Protected Vercel acceptance uses one clearly labeled native test inquiry. It
must prove one Neon contact, one lead, two idempotent delivery records, the
correct editor projection, and zero HighLevel calls. No DNS or commerce action
is part of that test.

## Cutover and Rollback

1. Apply the additive migration to Caleb's approved Neon database only.
2. Deploy the native runtime to a protected Preview and run the labeled test.
3. Create a production-candidate deployment on the fixed Vercel hostname.
4. Repeat the labeled native test and verify the editor record and email state.
5. Remove all `HIGHLEVEL_*` variables and revoke the runtime token.
6. Redeploy and prove the booking route remains ready without HighLevel.
7. Request separate DNS authorization.

Until DNS changes, rollback is the prior Vercel deployment. After native
acceptance, rollback must not reactivate HighLevel; it uses a native fail-closed
deployment that displays Caleb's phone and email alternatives while preserving
already stored Neon inquiries.

## Explicit Non-Goals

- Importing or deleting Caleb's historical HighLevel records
- Editing or publishing any HighLevel workflow
- DNS cutover or domain transfer
- Stripe checkout, prices, the audiobook add-on, orders, fulfillment, or the
  customer library
- Generalizing every HighLevel automation in this booking replacement
- Marketing email or SMS consent
