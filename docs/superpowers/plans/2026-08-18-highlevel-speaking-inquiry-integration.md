# HighLevel Speaking Inquiry Integration Implementation Plan

**Spec:** `docs/superpowers/specs/2026-08-18-highlevel-speaking-inquiry-integration-design.md`

**Live audit:** `docs/evidence/highlevel-mcp-audit-2026-08-18.md`

## Target flow

A visitor completes the existing custom V3 booking form -> Vercel validates the
payload and Turnstile response -> Upstash enforces rate limits, identity
versioning, duplicate protection, and delivery checkpoints -> the server
resolves exactly one HighLevel contact -> it finds or creates exactly one
Speaking Engagements opportunity for the distinct inquiry -> the website
returns the inquiry receipt -> the separate HighLevel workflow acknowledges the
prospect, notifies Caleb, and creates a manual follow-up task.

The opportunity is the submission success boundary. HighLevel workflow actions
are asynchronous. The existing book funnel, `BOOK FUNNEL`, marketing pipelines,
templates, and live Thryv site remain unchanged.

## Hard stop gates

Do not begin application implementation until all four gates pass.

### Gate H1: Canonical repository

The configured remote URL still uses
`Demonstration-Test/Caleb-Motivational-Speaker-V3`, but GitHub currently resolves
repository ID `1312397718` to the private
`Reuben-Williams/Caleb-Motivational-Speaker-V3` repository. Resolve the intended
owner, reconnect Vercel to that final owner, and verify that pushes and automatic
deployments target the same repository ID.

### Gate H2: HighLevel REST contract

The connected original HighLevel MCP is verified for read-only orientation but
does not expose opportunity creation, pipeline creation, custom-field creation,
or workflow management. Obtain an approved dashboard session and a separate
location-scoped runtime/provisioning PIT. Validate the exact REST API version,
pagination, field shapes, contact create/update behavior, opportunity listing,
opportunity creation, and custom-field reads before writing the production
client.

### Gate H3: Duplicate-opportunity behavior

HighLevel currently reports `allowDuplicateOpportunity: false`. Prove with a
controlled, labeled test that direct API creation can create two distinct
Speaking Engagements opportunities for one contact without changing that global
setting. If it cannot, stop and return to design approval. Do not enable the
global setting because it may alter existing book-funnel behavior.

### Gate H4: Operational timezone

HighLevel currently reports `America/Los_Angeles`, while the public website's
booking-date policy uses `America/New_York`. Obtain Caleb's written confirmation
of the operational timezone before configuring workflow due dates. Do not copy
the HighLevel profile address or phone into public content.

## Task 1: Record and pin the provider capability contract

**Files**

- Add: `docs/evidence/highlevel-rest-capability-report.md`
- Add: `src/lib/inquiries/highlevel-contract.ts`
- Add: `src/lib/inquiries/highlevel-contract.test.ts`
- Add: `src/lib/inquiries/__fixtures__/highlevel/*.json`

**Red**

Create redacted fixtures from approved read-only REST responses and require a
strict parser for:

- location duplicate settings;
- paginated exact-email contact results;
- paginated exact-phone contact results;
- paginated contact/pipeline opportunity results with opportunity custom
  fields;
- pipeline and stage inventory;
- Contact and Opportunity field inventory with ID, key, object, type, and
  options;
- contact create/update results;
- opportunity create/get results.

Run:

`npm test -- src/lib/inquiries/highlevel-contract.test.ts`

Confirm the failure identifies the missing contract parser rather than a live
network dependency.

**Green**

Implement the smallest typed parsers. Pin the HighLevel API version and endpoint
paths in the capability report. Fixtures must omit tokens, names, email
addresses, phone numbers, addresses, free-text inquiry values, and provider
preview URLs.

**Stop condition**

If the opportunity listing does not return Website Inquiry ID across complete
pagination, or the provider cannot create distinct opportunities without a
global duplicate-setting change, stop at H3.

## Task 2: Version inquiry identity and accepted retention

**Files**

- Modify: `src/lib/inquiries/canonical.ts`
- Modify: `src/lib/inquiries/service.test.ts`
- Add: `src/lib/inquiries/identity.ts`
- Add: `src/lib/inquiries/identity.test.ts`

**Red**

Require:

- an explicit active HMAC key ID;
- active and retained previous keys to produce lookup candidates;
- a duplicate found with a previous key to return its original inquiry ID;
- canonical payload changes to produce a distinct inquiry identity;
- Turnstile tokens, timestamps, provider IDs, and headers to remain excluded;
- accepted identity records to use a 400-day retention contract.

Run:

`npm test -- src/lib/inquiries/identity.test.ts src/lib/inquiries/service.test.ts`

**Green**

Add a pure identity-keyring module around the existing canonical serializer.
Keep rate-limit identity separate from business identity. Do not log any digest
secret or canonical payload.

## Task 3: Define the durable inquiry state machine and contact lease

**Files**

- Add: `src/lib/inquiries/state.ts`
- Add: `src/lib/inquiries/state.test.ts`
- Add: `src/lib/inquiries/upstash-store.test.ts`
- Modify: `src/lib/inquiries/upstash-store.ts`
- Modify: `src/lib/inquiries/service.ts`
- Modify: `src/lib/inquiries/service.test.ts`

**Red**

Specify the exact states and transitions:

- `processing -> contact_resolved -> accepted`;
- `processing/contact_resolved -> business_failed`;
- `business_failed -> processing` only through a new owned lease;
- `accepted` is terminal for 400 days.

Require atomic owner-token checks for reservation, contact checkpoint, failure,
and acceptance. Require the email-identity contact lease to support:

- five-second acquisition budget;
- unpredictable owner token;
- 90-second TTL;
- renewal every 30 seconds;
- 75-second maximum contact-resolution budget;
- lost-renewal abort;
- compare-owner release.

Run:

`npm test -- src/lib/inquiries/state.test.ts src/lib/inquiries/upstash-store.test.ts src/lib/inquiries/service.test.ts`

**Green**

Implement the typed state and atomic Upstash operations. Use Redis Lua/EVAL or
equivalent compare-and-set semantics where a transaction spans multiple values.
Do not persist the full form payload.

## Task 4: Validate the location-specific field manifest

**Files**

- Add: `src/lib/inquiries/highlevel-field-manifest.ts`
- Add: `src/lib/inquiries/highlevel-field-manifest.test.ts`
- Add: `src/lib/inquiries/highlevel-mapping.ts`
- Add: `src/lib/inquiries/highlevel-mapping.test.ts`

**Red**

Require startup validation to reject:

- missing semantic fields;
- duplicate field IDs or keys;
- a field on the wrong HighLevel object;
- incompatible data types;
- incomplete or mismatched dropdown options;
- an unrecognized manifest version.

Require exact contact and opportunity mapping, including:

- Contact Role / Title field;
- the two source/intent tags as tags rather than fields;
- every event field on the opportunity;
- no artificial monetary value;
- deterministic opportunity name and source;
- empty optional values staying empty.

Run:

`npm test -- src/lib/inquiries/highlevel-field-manifest.test.ts src/lib/inquiries/highlevel-mapping.test.ts`

**Green**

Implement pure parsers and mapping functions with no network dependency. Runtime
uses the provisioned field IDs from `HIGHLEVEL_FIELD_MAP_JSON`; it never matches
by display name.

## Task 5: Implement the focused HighLevel HTTP client

**Files**

- Add: `src/lib/inquiries/highlevel-client.ts`
- Add: `src/lib/inquiries/highlevel-client.test.ts`

**Red**

Use a controlled fetch mock to require:

- server-only bearer and version headers;
- location-scoped endpoint construction;
- strict request/response parsing;
- complete pagination;
- per-request timeout below the remaining contact-lease TTL;
- at most two bounded retries for eligible `429`, `5xx`, and transport errors;
- operation-specific `409` classification;
- no retry for `401`, `403`, or ordinary contract `4xx` errors;
- sanitized error objects without provider bodies or PII.

Run:

`npm test -- src/lib/inquiries/highlevel-client.test.ts`

**Green**

Implement only the validated operations needed for contact search/create/update,
opportunity list/create/get, pipelines, and custom-field reads. Do not add a
general HighLevel SDK or expose write methods unrelated to booking.

## Task 6: Implement conflict-aware contact resolution

**Files**

- Add: `src/lib/inquiries/highlevel-gateway.ts`
- Add: `src/lib/inquiries/highlevel-gateway.test.ts`

**Red**

Cover every approved email/phone match combination:

- zero/zero creates and re-reads;
- one email/zero phone reuses the email contact when safe;
- one/one same contact reuses it;
- one/one different contacts fails closed;
- zero email/one phone with empty or matching email reuses it;
- zero email/one phone with a different email fails closed;
- multiple email or phone matches fail closed;
- contact mutation `409` reruns exact resolution under the same lease.

Assert that owned fields update without deleting unrelated owners, tags, notes,
conversations, or custom values.

Run:

`npm test -- src/lib/inquiries/highlevel-gateway.test.ts`

**Green**

Implement `resolveContact` using the focused client. Do not call an unqualified
provider upsert whose behavior could be redirected by location duplicate rules.

## Task 7: Implement opportunity find-or-create recovery

**Files**

- Modify: `src/lib/inquiries/highlevel-gateway.ts`
- Modify: `src/lib/inquiries/highlevel-gateway.test.ts`

**Red**

Require:

- all contact/pipeline opportunity pages are read before absence is concluded;
- zero exact Website Inquiry ID matches permits create;
- one exact match is reused;
- multiple exact matches fail closed;
- a creation timeout or opportunity `409` reruns the exact lookup;
- the created opportunity contains the resolved contact, approved pipeline and
  stage IDs, source, status, name, and complete field mapping;
- a distinct inquiry for the same contact can create another opportunity once
  H3 has passed.

Run:

`npm test -- src/lib/inquiries/highlevel-gateway.test.ts`

**Green**

Implement `findOpportunity` and `createOpportunity`. Supply `externalObjectId`
only if H2 proves its accepted contract, and never assume that it is unique.

## Task 8: Rewire the inquiry service success boundary

**Files**

- Modify: `src/lib/inquiries/service.ts`
- Modify: `src/lib/inquiries/service.test.ts`
- Modify: `src/lib/inquiries/route-handler.ts`
- Modify: `src/lib/inquiries/route-handler.test.ts`

**Red**

Require this sequence:

1. validate;
2. verify Turnstile;
3. rate limit;
4. resolve identity candidates and reserve;
5. acquire contact lease;
6. resolve contact and atomically checkpoint;
7. release contact lease;
8. find/create opportunity;
9. atomically accept with provider IDs;
10. return the public inquiry receipt.

Add tests for failures between every provider operation and store transition.
Confirm retries resume from the last confirmed checkpoint without duplicate
contacts or opportunities.

Run:

`npm test -- src/lib/inquiries/service.test.ts src/lib/inquiries/route-handler.test.ts`

**Green**

Replace the two-email `InquiryDelivery` boundary with the approved gateway and
service orchestration. Opportunity existence becomes the only business
acceptance boundary.

## Task 9: Update runtime configuration and public receipt state

**Files**

- Modify: `src/lib/inquiries/runtime.ts`
- Modify: `src/lib/inquiries/runtime.test.ts`
- Modify: `.env.example`
- Modify: `src/components/booking-form.tsx`
- Modify: `src/components/booking-form.test.tsx`
- Modify: `src/components/thank-you-state.tsx`
- Modify: `src/components/thank-you-state.test.tsx`

**Red**

Require:

- all approved HighLevel, manifest, Turnstile, Upstash, and HMAC keyring values;
- configuration fails closed without exposing the missing value;
- accepted API/session state contains inquiry ID and acceptance time only;
- `confirmationEmailSent` is absent;
- thank-you copy confirms receipt without claiming that email was delivered;
- all current validation, retry, call, and email fallback behavior remains.

Run:

`npm test -- src/lib/inquiries/runtime.test.ts src/components/booking-form.test.tsx src/components/thank-you-state.test.tsx`

**Green**

Instantiate the HighLevel client/gateway and revised store. Stop invoking Resend
from the booking runtime. Keep the unused Resend variables, package, adapter,
renderer, and previous deployment available through the 14-day rollback window.

## Task 10: Provision isolated HighLevel objects

**External configuration**

The current MCP cannot perform these operations. Use Caleb-approved dashboard
access or the capability-validated provisioning REST calls. Keep the workflow
unpublished.

1. Re-inventory by ID and stop on material drift.
2. Create `Speaking Engagements` with the six approved stages.
3. Create the Contact Role / Title field.
4. Create the Website Speaking Inquiry Opportunity folder and approved fields.
5. Create the two exact contact tags.
6. Export the resolved field manifest and put its JSON directly into Vercel.
7. Create the prospect and internal email templates without modifying book
   templates.
8. Create `WEBSITE — SPEAKING INQUIRY`, filtered to the new pipeline.
9. Configure acknowledgement, internal notification, and follow-up task.
10. Resolve the Caleb/location-owner user uniquely.

Do not rename/delete either Marketing Pipeline, alter duplicate settings, add a
calendar, send SMS, or touch `BOOK FUNNEL`.

## Task 11: Add observability and privacy assertions

**Files**

- Add: `src/lib/inquiries/inquiry-log.ts`
- Add: `src/lib/inquiries/inquiry-log.test.ts`
- Modify: the public privacy content source used by the existing Privacy Policy

**Red**

Require logs to include only inquiry ID, correlation ID, operation, HTTP class,
attempt, and sanitized code. Assert that names, email, phone, organization,
free-text values, tokens, provider bodies, contact IDs, and opportunity IDs are
absent.

Require the Privacy Policy to disclose booking-data processing through the CRM
without adding unapproved legal claims or retention promises.

**Green**

Implement one structured logger boundary and the smallest accurate privacy
disclosure. Route all provider logging through it.

## Task 12: Automated repository verification

Run focused tests after each red/green cycle. Then run:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`

Run secret, PII-fixture, and generated-output scans. Confirm no test contacts,
tokens, Vercel values, HighLevel response bodies, or `output/` artifacts are
staged.

If Site Editor package access is tested in this release, use a repository-scoped
GitHub Actions `GITHUB_TOKEN` check against the exact approved package list.
Do not install or activate Site Editor packages in this HighLevel-only plan.

## Task 13: Protected Vercel staging

1. Confirm Vercel is connected to the final canonical GitHub owner.
2. Add/update the approved runtime variables without reading values back.
3. Keep secrets Sensitive and restrict the runtime PIT to the Caleb project.
4. Add approved Preview values only when the protected Preview host is allowed
   by Turnstile and the HighLevel token policy.
5. Deploy the implementation to an access-protected Vercel staging target.
6. Verify the build resolves existing dependencies and contains no Resend call
   in the active inquiry route.
7. Run desktop/mobile form validation and failure paths without submitting a
   real inquiry.

Public DNS remains on Thryv.

## Task 14: Controlled HighLevel end-to-end acceptance

After explicit authorization for the test:

1. Publish the workflow while the Vercel form remains access-protected.
2. Submit one clearly labeled test inquiry.
3. Verify one contact, one opportunity, every field, one workflow enrollment,
   acknowledgement, internal notification, and follow-up task.
4. Submit the identical payload again and confirm the same inquiry ID, no new
   opportunity, and no new workflow enrollment.
5. Verify `BOOK FUNNEL`, both existing Marketing Pipelines, all book templates,
   and `https://joyfound.calebjakes.com/` remain unchanged.
6. If any check fails, unpublish the new workflow and restore the prior Vercel
   deployment.
7. Leave the test records labeled until Caleb authorizes retention or removal.

Produce a launch go/no-go report. Do not switch DNS in this task.

## Task 15: Cutover and observation

Only after a separate explicit DNS authorization:

1. Apply the exact Vercel A/CNAME records shown by the project.
2. Verify SSL, canonical www redirect, every route, metadata, media, form,
   Turnstile, HighLevel records, workflow history, logs, and mobile behavior.
3. Check the new workflow and `New Inquiry` column daily for 14 days.
4. Treat any failed enrollment or missing task as an incident and use the
   approved action-by-action safe replay procedure.
5. Keep Thryv recoverable through the observation window.

After 14 incident-free days, use a separate cleanup release to remove unused
Resend booking variables, package/code, and obsolete confirmation-email state.
Resend may still be configured separately for future Supabase authentication.

## Commit sequence

Prefer reviewable commits at these boundaries:

1. provider contract and redacted capability evidence;
2. identity/state/lease tests and implementation;
3. field mapping and HighLevel client/gateway;
4. service/runtime/public receipt migration;
5. observability/privacy and complete verification;
6. external configuration evidence and staging report.

Do not stage the existing untracked `output/` directory. Do not push, deploy,
publish the workflow, send a test inquiry, change DNS, or delete CRM records
without the corresponding authorization gate.
