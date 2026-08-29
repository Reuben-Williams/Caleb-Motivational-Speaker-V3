# Native Speaking Engagements workflow

## Purpose

This is the active operating guide for Caleb Jakes website booking inquiries.
The website no longer sends booking data to HighLevel. It uses the shared
site-editor platform packages, Caleb's Neon database, Upstash, Cloudflare
Turnstile, and Resend.

The public promise is precise: a visitor receives a booking receipt only after
the inquiry has been committed to Caleb's database. Email delivery can retry
after that commit without losing or duplicating the inquiry.

## The complete flow

```text
Booking form
  -> schema validation
  -> Turnstile verification
  -> 15-minute and 24-hour rate limits
  -> short duplicate-processing lease
  -> one atomic Neon transaction
       submission + consent
       contact resolution
       Speaking Engagements lead
       immutable event
       two email outbox records
  -> public CJ-XXXXXXXXXXXX receipt
  -> immediate Resend worker attempt
  -> five-minute retry worker
  -> private Speaking Engagements workspace
  -> 400-day retention and verified deletion lifecycle
```

## 1. Validation and security

The server validates every field again even though the browser also validates
the form. The Turnstile token is verified before rate limits or storage. The
token itself is never stored as inquiry data.

Upstash applies two limits to a one-way digest of the organizer email and, when
explicitly trusted by configuration, the client address:

- five attempts in 15 minutes;
- twenty attempts in 24 hours; and
- a two-minute lease while an identical event is being committed.

If Turnstile, Upstash, or Neon is unavailable, the website fails closed and
offers Caleb's published phone and email. It never claims that an inquiry was
received when the database commit failed.

## 2. Distinct event identity and replay

Each distinct event inquiry receives a deterministic public ID in the form
`CJ-XXXXXXXXXXXX`. Identity uses the normalized work email plus the event facts:
audience, event type, dates, audience size, location, attendance mode, program
length, goals, budget, and additional details.

Changing a display name, phone, organization, role, referral source, UTM value,
or referrer does not create a second event. Changing an actual event fact does.
An exact replay returns the original ID and acceptance time.

The active and previous HMAC keys are checked during key rotation, so a routine
rotation does not duplicate old inquiries.

## 3. Contact and Speaking Engagements lead creation

One Neon transaction performs all accepted-inquiry writes:

1. store the form payload and immutable privacy acknowledgement;
2. match an existing site-scoped contact by normalized email or phone;
3. stop for review if email and phone point to different contacts;
4. otherwise create or reuse the contact;
5. create one new `Speaking Engagements` lead for the distinct event;
6. append the lead-created event; and
7. enqueue the organizer and internal emails.

If any required write fails, the complete transaction rolls back.

## 4. Email delivery and retries

The atomic transaction creates exactly two outbox records:

- an organizer acknowledgement sent to the normalized organizer email, with
  replies directed to `info@calebjakes.com`; and
- an internal notification sent only to `info@calebjakes.com`, with replies
  directed to the organizer.

The adapter rejects any other sender/recipient pairing. Each message has a
stable Resend idempotency key. The request schedules an immediate best-effort
delivery attempt; a Vercel Cron worker checks every five minutes for anything
still ready.

Neon leases each message for 60 seconds. A stale worker cannot complete a newer
lease. Retryable failures wait 1, 5, 15, and 60 minutes. A fifth failed attempt
becomes `dead_letter`. A permanent provider rejection enters `dead_letter`
immediately. A connection failure with an uncertain provider outcome enters
`reconciliation_required` instead of risking a blind duplicate send.

Every attempt is append-only. The staff workspace exposes safe states, never
provider response bodies or secrets.

## 5. Pipeline, notes, and tasks

The private route is `/admin/editor/speaking-engagements`. It is not linked from
the public site and is marked no-index/no-store.

Approved staff can:

- list distinct event inquiries;
- open the organizer and submitted event summary;
- move a lead through `New`, `Contacted`, `Qualified`, `Won`, `Lost`, or
  `Spam review`;
- add a bounded note or task; and
- inspect safe organizer/internal notification states.

Status changes use optimistic concurrency. If two staff members edit the same
lead, a stale version is rejected instead of silently overwriting newer work.

## 6. Staff identity and authorization

The central site-editor Supabase tenant verifies identity only. Caleb's Neon
database is authoritative on every request for:

- site membership and active/inactive state;
- `owner` or `administrator_operator` role;
- current capability grants and scope;
- the Growth Leads module entitlement;
- authorization and entitlement versions; and
- session revocation.

The browser cannot select a role, site, member ID, capability, or entitlement.
Reads require `leads.read`; notification inspection also requires
`messages.read`; status changes require `leads.update`; notes and tasks require
`tasks.manage`. Mutations also require same-origin, double-submit CSRF, and an
idempotency key.

Caleb is the Owner. The operator uses the approved
`administrator_operator` membership. If identity or provisioning is incomplete,
the private workspace remains unavailable while the public booking form stays
independent.

## 7. Privacy, retention, and deletion

Accepted inquiry records use the reviewed 400-day policy. Terminal email bodies
and destinations are redacted after seven days. The daily retention worker runs
under the dedicated `builder_retention_worker` database role; request callers
cannot choose a site or retention duration.

Due records are removed across the submission, consent, identity ledger, lead,
lead events, outbox, attempts, and unneeded contact identities. A privacy
tombstone retains only the HMAC subject evidence, reason, policy version,
aggregate deleted counts, and execution time. A verified privacy request may
schedule earlier removal.

Privacy questions and requests currently go to `info@calebjakes.com` or the
published phone number.

## 8. Failure states and recovery

| State | Meaning | Operator action |
| --- | --- | --- |
| `service_unavailable` before receipt | Turnstile, Upstash, or Neon could not safely accept | Check Vercel logs and provider health; visitor retries or contacts Caleb |
| `inquiry_processing` | Identical event is inside the short lease | Wait a few seconds and retry |
| `failed_retryable` | Resend returned a retryable error | Cron retries automatically |
| `dead_letter` | Permanent rejection or retry limit | Correct the delivery issue, then use an approved reconciliation operation |
| `reconciliation_required` | Provider outcome is uncertain | Check Resend by idempotency/reference evidence before any resend |
| staff `401` | Identity absent, expired, invalid, or revoked | Sign in again or confirm the central staff account |
| staff `403` | Membership, entitlement, role, or capability denied | Correct Caleb's Neon authorization records; never add a browser bypass |
| staff `409` | Stale edit or idempotency conflict | Reload the lead and apply the intended change again |

Monitor Vercel function failures, Cron runs, Neon availability, Upstash limits,
Resend delivery states, outbox dead letters, reconciliation records, and daily
retention results. Never print inquiry payloads or secrets in logs.

## 9. What was faithfully migrated

The native implementation preserves the approved business behavior from the
verified HighLevel source:

- one contact per person where identities agree;
- one opportunity-equivalent record per distinct event inquiry;
- a dedicated `Speaking Engagements` pipeline beginning at `New`;
- Caleb/operator visibility into organizer and event details;
- an organizer confirmation and internal notification;
- status movement, notes, tasks, and an assignee-ready staff workflow; and
- Caleb as Owner with the operator working as Administrator/Operator.

It intentionally does not copy provider-specific contact fields, merge tags,
workflow triggers, book-funnel branches, or hidden provider behaviors. The book
funnel remains separate from the speaking-inquiry workflow. Commerce, including
the physical book and optional audiobook add-on, remains outside this native
booking release until its separately approved release gate.

## Required server configuration names

The website requires the names documented in `.env.example`. Secrets must be
stored only in Vercel and local secret files, never in Git. After any value is
added or rotated, create a new deployment. Production must use the Production
Neon, Upstash, Turnstile, Resend, worker secrets, and fixed Caleb identities;
Preview credentials must not be scoped to Production.

The approved builder packages remain pinned to version `0.5.0`. That release
ships TypeScript source with JavaScript-style internal specifiers, so the
install and prebuild lifecycle runs a deterministic compatibility preparation.
It changes only missing internal source extensions, is safe to rerun, and fails
closed if any installed builder package is not exactly `0.5.0`.
