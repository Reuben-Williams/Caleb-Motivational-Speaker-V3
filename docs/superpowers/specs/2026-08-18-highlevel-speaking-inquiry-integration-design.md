# HighLevel Speaking Inquiry Integration Design

## Status

Approved in conversation on 2026-08-18. Written specification pending final
user review before implementation planning.

## Summary

Keep the existing custom Caleb Jakes V3 booking form and Vercel-hosted inquiry
endpoint. Replace the Resend booking-delivery adapter with a location-scoped
HighLevel gateway that resolves or creates the prospect and creates exactly one opportunity
for each distinct event inquiry.

HighLevel becomes the system of record for booking contacts, opportunities,
event details, acknowledgement email, internal notification, and Caleb's
follow-up task. The existing book funnel and `BOOK FUNNEL` workflow remain
unchanged. Supabase and Resend are not dependencies of this booking flow;
Resend may later be configured separately as the SMTP provider for Site Editor
authentication.

## Confirmed HighLevel Inventory

The following facts were supplied by Caleb on 2026-08-18:

| Item | Confirmed value |
| --- | --- |
| Agency/account | Joyionaire Enterprises LLC |
| Sub-account/location | Joyionaire Enterprises LLC |
| Location ID | `2FqgdrmWP252v43cX5RY` |
| Existing funnel | The Weighty Joy of Surrender |
| Public funnel URL | `https://joyfound.calebjakes.com/` |
| Existing workflow | `BOOK FUNNEL` |
| HighLevel email status | Verified |
| HighLevel sending domain | `mg.calebjakes.com` |
| Internal notification inbox | `info@calebjakes.com` |
| Funnel root domain | `calebjakes.com` |
| Funnel subdomain | `joyfound` |
| Existing booking form | None |
| Existing calendar | None; Caleb sends personal invites manually |
| Existing booking pipeline | None reported |
| Existing booking tags | None reported |
| Phone/SMS | Not configured |

The public funnel returned HTTP 200 during the design audit. The implementation
must still begin with a read-only HighLevel inventory because the supplied
inventory may omit hidden, archived, or newly created objects.

## Goals

- Preserve the custom V3 form, its visual design, accessible validation, and
  complete event qualification payload.
- Keep Turnstile, HMAC-based inquiry identity, and Upstash rate limiting.
- Resolve or create one HighLevel contact using normalized work email as the
  primary identity and normalized phone as a conflict check.
- Create one HighLevel opportunity for every distinct event inquiry, including
  multiple opportunities for the same contact.
- Prevent an identical inquiry from creating duplicate opportunities during a
  defined 400-day identity-ledger window.
- Store event-specific values on the opportunity rather than overwriting them
  on a shared contact record.
- Trigger a separate HighLevel workflow for acknowledgement, internal
  notification, and a manual follow-up task.
- Make opportunity existence the public submission success boundary.
- Preserve the existing book funnel, `BOOK FUNNEL` workflow, sending domain,
  and public funnel URL without modification.
- Keep the provider boundary reusable so a future Site Editor integration can
  support HighLevel or another CRM without changing the form UI.

## Non-goals

- Rebuild the public website in HighLevel.
- Embed or create a native HighLevel booking form.
- Change the existing book funnel or `BOOK FUNNEL` workflow.
- Add an automated calendar or scheduling link.
- Add SMS, WhatsApp, phone automation, or Conversation AI.
- Import the existing book funnel into the V3 repository.
- Build a general-purpose HighLevel management suite in this phase.
- Extract a shared HighLevel package before the Caleb integration has passed
  production verification.
- Create a Supabase project or attach the Site Editor in this phase.
- Use Resend for booking acknowledgement or internal booking notifications.
- Switch public DNS or cancel the current Thryv website.

## Approaches Considered

### 1. Direct Vercel-to-HighLevel API orchestration

This is the selected approach. The existing server endpoint validates and
deduplicates the request, resolves or creates the contact, and creates the opportunity
through HighLevel's API. A HighLevel workflow reacts to the created opportunity.

This approach preserves the form experience, gives the server an explicit
success boundary, and allows deterministic recovery after partial failures.

### 2. HighLevel inbound-webhook workflow

Vercel could send the validated payload to a HighLevel inbound webhook and let
the workflow create the contact and opportunity. This would move more mapping
into the HighLevel UI, but it would weaken request-level idempotency, make
partial failures harder to diagnose, and couple the external API contract to
editable workflow steps.

### 3. Native HighLevel form embed

A native form would appear in HighLevel Form Submissions and could use the
native Form Submitted trigger. It was rejected because it would replace the
approved V3 form with an embedded surface whose styling, validation, loading,
analytics, and accessibility behavior are less controllable.

## Architecture

The integration has five bounded units.

### 1. Public booking form

`src/components/booking-form.tsx` remains the only public speaking-inquiry
form. It submits the existing normalized payload to `/api/inquiries` and does
not call HighLevel from the browser.

The client has no HighLevel token, location ID dependency, pipeline ID, or
provider-specific behavior. Its success state depends only on the API response.

### 2. Inquiry service

The existing inquiry service continues to own:

- schema validation;
- Turnstile verification;
- rate limiting;
- deterministic inquiry ID generation;
- reservation and duplicate handling;
- provider-delivery orchestration;
- public status and error mapping.

The provider success boundary changes from "business email accepted by
Resend" to "HighLevel opportunity exists." A provider acknowledgement email is
asynchronous and does not control the public submission result.

### 3. HighLevel provider gateway

A server-only `HighLevelInquiryGateway` implements provider operations but owns
no durable state. It depends on a focused HighLevel HTTP client rather than
using `fetch` throughout the service.

The gateway exposes three independently testable operations:

1. `resolveContact(data)` returns exactly one contact ID or a typed contact
   conflict.
2. `findOpportunity(inquiryId, contactId)` performs the capability-validated
   exact lookup and returns zero or one opportunity ID; more than one is a
   typed provider-data conflict.
3. `createOpportunity(contactId, inquiryId, data)` creates the mapped
   opportunity and returns its ID.

The inquiry service, not the gateway, sequences these operations and owns every
durable checkpoint. The gateway never writes Upstash and the store never calls
HighLevel.

The HighLevel HTTP client owns authentication headers, the pinned API version,
timeouts, response parsing, pagination, bounded retry policy, and sanitized
error classification. It exposes only the contact, opportunity, pipeline, and
custom-field reads/writes required by this integration.

### 4. Durable inquiry state

Upstash remains the rate-limit, identity-ledger, and delivery-state store. The
inquiry service is its only writer. It uses compare-and-set transitions rather
than unguarded read/write pairs.

| State | Required fields | Allowed next states | Retention |
| --- | --- | --- | --- |
| `processing` | inquiry ID, key version, lease owner, lease expiry | `contact_resolved`, `business_failed` | 15-minute renewable lease |
| `contact_resolved` | processing fields plus HighLevel contact ID | `accepted`, `business_failed` | 24 hours while incomplete |
| `business_failed` | inquiry ID, key version, optional contact ID, sanitized failed operation | `processing` through a new lease | 24 hours |
| `accepted` | inquiry ID, key version, contact ID, opportunity ID | terminal | 400 days |

Store operations are explicit:

- `reserveInquiry(identityCandidates, inquiryId, keyVersion, lease)`;
- `recordContact(reservation, contactId)`;
- `recordFailure(reservation, operation)`;
- `acceptInquiry(reservation, contactId, opportunityId)`;
- `readInquiry(identityCandidates)`.

Each transition verifies the current state and lease owner atomically. A
checkpoint write failure leaves the prior state unchanged and fails the public
request; the next attempt re-resolves the provider object before performing a
create.

The complete form payload is never stored in Upstash. Provider IDs are
operational identifiers and are never written to public responses. The 400-day
accepted ledger defines the duplicate-protection window; an identical payload
after that window is treated as a new inquiry rather than claiming permanent
deduplication.

Website Inquiry ID is also stored on the opportunity for audit and recovery.
It is not treated as queryable or unique until the capability-validation gate
below proves the exact HighLevel contract.

### 5. HighLevel workflow

A new workflow named `WEBSITE — SPEAKING INQUIRY` triggers on Opportunity
Created with a filter restricting it to the `Speaking Engagements` pipeline.

It performs exactly three business actions:

1. Send a prospect acknowledgement through the existing verified HighLevel
   email service.
2. Send a complete internal notification to `info@calebjakes.com`.
3. Create a task titled `Review speaking inquiry <inquiryId>` for the location
   owner identified as Caleb Jakes, due the next business day.

If the read-only audit cannot resolve one unique Caleb/location-owner user, the
workflow remains unpublished until the user identifies the assignee. It must
not guess from an arbitrary active user.

The workflow does not create another opportunity, send SMS, create an
appointment, or invoke `BOOK FUNNEL`.

## HighLevel Capability-Validation Gate

No production code or CRM object creation begins until a bounded, read-only API
spike records the exact endpoint paths, request/response shapes, pagination
contract, and API version for:

- listing/searching contacts by exact normalized email;
- listing/searching contacts by exact normalized phone;
- reading the location's duplicate-contact policy;
- listing all opportunities for one contact in one pipeline;
- reading opportunity custom-field values from every result page;
- listing pipelines and stages;
- listing Contact and Opportunity custom fields with object type, field ID,
  field key, and option values.

The intended opportunity lookup is not an assumed server-side custom-field
filter. `findOpportunity` lists the contact's opportunities in the Speaking
Engagements pipeline, follows every result page, and compares Website Inquiry
ID exactly. The spike must prove that the listing returns the required custom
field value. If HighLevel provides and documents an exact `externalObjectId`
lookup, the implementation may use it in addition to, but not instead of, the
verified paginated lookup.

The spike also confirms whether opportunity creation accepts
`externalObjectId`; if so, the inquiry ID is supplied there as a secondary
recovery marker. The design does not assume that HighLevel enforces uniqueness
on that property.

If any required read contract is unavailable, ambiguous, or omits the inquiry
field, implementation stops and this design returns for user approval. It must
not silently downgrade to at-least-once opportunity creation or select the
first search result.

The recorded capability report becomes implementation evidence and pins the
selected API version. Contract tests reproduce its redacted fixtures so a
provider-shape change fails before deployment.

## HighLevel CRM Configuration

### Pipeline

Create `Speaking Engagements` only when the read-only audit confirms that no
equivalent pipeline already exists.

Stages, in order:

1. `New Inquiry`
2. `Contacted`
3. `Discovery Scheduled`
4. `Proposal Sent`
5. `Booked`
6. `Closed — Not Booked`

The website creates opportunities only in `New Inquiry`. Caleb moves them
manually afterward. `Booked` maps to a won opportunity status and
`Closed — Not Booked` maps to lost when Caleb completes the record; stage
movement automation is outside the initial website request.

### Contact mapping

Create or reuse a Contact-object folder named `Website Contact Details` and a
single-line Contact custom field named `Role / Title`. It is resolved by its
provider field key and object type during provisioning; a display-name match
alone is insufficient.

`source:calebjakesspeaks.com` and `intent:speaking-inquiry` are HighLevel
contact tags, not custom fields. Provisioning creates them only if exact tag
matches do not already exist.

| Website value | HighLevel contact behavior |
| --- | --- |
| `fullName` | Set the contact display name; do not invent missing name parts |
| `workEmail` | Primary lookup identity and contact email |
| `phone` | Contact phone |
| `organization` | Update company/organization with the latest submitted value |
| `roleTitle` | Update the dedicated contact Role / Title field |
| fixed source | Add `source:calebjakesspeaks.com` |
| fixed intent | Add `intent:speaking-inquiry` |

The integration updates only the fields it owns and does not erase unrelated
contact notes, owners, tags, conversations, or custom values.

The read-only audit records the location's duplicate-contact policy without
changing it. Runtime contact resolution is serialized by an Upstash lease
keyed by an HMAC of normalized email. The lease uses an unpredictable owner
token, a 90-second TTL, compare-and-set renewal every 30 seconds, a 75-second
maximum contact-resolution budget, and compare-owner release. Failure to
acquire within five seconds returns `409 inquiry_processing` with
`Retry-After: 5`. A lost renewal prevents any new provider mutation; an
in-flight provider request is bounded to finish before the remaining lease TTL.

Inside the lease, the gateway fully pages through exact-email and exact-phone
results before any create or update:

- more than one exact email match or more than one exact phone match: return
  `contact_conflict` and create no opportunity;
- one email match and zero phone matches: reuse the email contact and add the
  submitted phone only when it does not conflict with another record;
- one email match and one phone match to the same contact: reuse it;
- one email match and one phone match to different contacts: return
  `contact_conflict`;
- zero email matches and zero phone matches: create a new contact, then re-read
  exact email and phone results before continuing;
- zero email matches and one phone match whose email is empty or equals the
  submitted email: reuse that contact and set/update the owned identity fields;
- zero email matches and one phone match with a different non-empty email:
  return `contact_conflict`.

The runtime does not call an unqualified provider upsert whose behavior could
be redirected by location-level duplicate rules. It uses the validated exact
search plus create/update operations. A contact-create conflict causes a fresh
exact email/phone resolution while the same lease is held.

Two distinct inquiries for the same email therefore serialize contact
resolution but may create separate opportunities after the shared contact is
resolved. The public conflict response uses the standard phone/email fallback;
the sanitized correlation ID is retained for manual CRM reconciliation.

### Opportunity naming and standard fields

Opportunity name:

`<Organization> — <Event Type> — <Preferred Start Date>`

Standard values:

- Pipeline: `Speaking Engagements`
- Stage: `New Inquiry`
- Status: `Open`
- Source: `CalebJakesSpeaks.com`
- Contact: resolved HighLevel contact
- Monetary value: unset

Budget ranges are not converted to artificial monetary values.

### Opportunity custom fields

Create a folder named `Website Speaking Inquiry` on the Opportunity object.
Create or reuse fields by semantic purpose and object type, never by display
name alone.

| Field | Type | Source |
| --- | --- | --- |
| Website Inquiry ID | Single line | `inquiryId` |
| Organization | Single line | `organization` |
| Role / Title | Single line | `roleTitle` |
| Audience Type | Dropdown | `audienceType` |
| Other Audience Type | Single line | `audienceTypeOther` |
| Event Type | Dropdown | `eventType` |
| Other Event Type | Single line | `eventTypeOther` |
| Preferred Start Date | Date | `preferredDateStart` |
| Preferred End Date | Date | `preferredDateEnd` |
| Estimated Audience Size | Number | `estimatedAudienceSize` |
| Event Location | Single line | `eventLocation` |
| Attendance Mode | Dropdown | `attendanceMode` |
| Program Length | Dropdown | `programLength` |
| Event Goals | Multi-line | `eventGoals` |
| Budget Range | Dropdown | `budgetRange` |
| Referral Source | Dropdown | `referralSource` |
| Other Referral Source | Single line | `referralSourceOther` |
| Additional Details | Multi-line | `additionalDetails` |
| Privacy Consent Captured | Checkbox | `consent` |
| UTM Source | Single line | `utmSource` |
| UTM Medium | Single line | `utmMedium` |
| UTM Campaign | Single line | `utmCampaign` |
| UTM Term | Single line | `utmTerm` |
| UTM Content | Single line | `utmContent` |
| Referrer Path | Single line | `referrerPath` |

Dropdown option values mirror the existing booking schema. Empty optional
values remain empty and are not replaced with fabricated defaults.

Provisioning records every resolved field ID, immutable provider field key,
object type, data type, and dropdown option set in a versioned, non-secret
`HIGHLEVEL_FIELD_MAP_JSON` Vercel value. Runtime startup parses that manifest
against a typed local schema and fails closed when any required semantic key is
missing, duplicated, assigned to the wrong object, or has an incompatible
type. Runtime requests use the resolved field IDs required by HighLevel's
opportunity API; they never rediscover fields by display name.

## Duplicate and Retry Semantics

- A contact is shared across inquiries and resolved primarily by normalized
  work email.
- A distinct canonical inquiry produces a distinct inquiry ID and opportunity,
  even when the contact already has another open opportunity.
- An identical canonical inquiry produces the same inquiry ID.
- Upstash is the authoritative duplicate ledger for 400 days after acceptance.
- HighLevel's Website Inquiry ID field and, when validated, `externalObjectId`
  provide recovery evidence after a provider timeout; they are not assumed to
  enforce uniqueness.
- A repeated identical request during the 400-day window returns the original
  accepted inquiry ID and does not retrigger the workflow.
- An identical request after the 400-day window is a new inquiry and may create
  a new opportunity.
- A contact created before an opportunity failure is reused on retry.
- An opportunity created before a network timeout is discovered by inquiry ID
  through the validated, fully paginated contact/pipeline lookup and is not
  recreated.
- A changed event field produces a different canonical inquiry and may create a
  second opportunity for the same contact.

HighLevel's contact-level "allow duplicate opportunities" setting is not the
source of truth for this integration. The website inquiry ID is the explicit
business key during the defined retention window.

### Inquiry-key versioning and rotation

The identity digest carries an explicit key version. Vercel stores one active
identity key and zero or more previous keys:

- `INQUIRY_HMAC_ACTIVE_KEY_ID` identifies the active version;
- `INQUIRY_HMAC_SECRET` contains the active secret;
- `INQUIRY_HMAC_PREVIOUS_KEYS_JSON` contains a Sensitive map of retained key
  IDs to prior secrets.

For every submission, the service computes identity candidates with the active
and retained previous keys and reads all matching ledger keys before reserving
the active identity. A duplicate found under a previous version returns the
original inquiry ID.

Rotation is a controlled two-phase operation: add the old active key to the
previous-key map, deploy the new active key/version, retain the old key for at
least 400 days after its final accepted write, and remove it only after a
ledger-age audit proves no protected record depends on it. Emergency removal
after suspected key exposure explicitly suspends the strict duplicate
guarantee and requires a written incident decision; it must not occur as a
routine secret rotation.

## Email and Task Content

### Prospect acknowledgement

- From name: `Caleb Jakes`
- From/reply-to mailbox: `info@calebjakes.com`
- Delivery service: HighLevel's verified email configuration using
  `mg.calebjakes.com`
- Subject: `We received your Caleb Jakes speaking inquiry — <inquiryId>`

The message contains the inquiry ID, organizer name, organization, audience,
event type, preferred date range, location, attendance mode, and Caleb's public
phone/email alternatives. It confirms receipt only and makes no response-time,
availability, pricing, or booking promise.

### Internal notification

- Recipient: `info@calebjakes.com`
- Subject: `Speaking inquiry <inquiryId> — <organization>`

The notification contains every normalized business and attribution field in a
fixed readable order, plus a direct link to the HighLevel opportunity when the
workflow exposes it.

### Follow-up task

- Title: `Review speaking inquiry <inquiryId>`
- Assignee: uniquely resolved Caleb/location owner
- Due: next business day
- Association: contact/opportunity created by the website

The task due date is an internal operational aid and does not create a public
response-time guarantee.

## API and Environment Configuration

Application runtime variables:

| Variable | Scope | Sensitive | Purpose |
| --- | --- | --- | --- |
| `HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN` | Production and approved Preview | Yes | Location-scoped API authentication |
| `HIGHLEVEL_LOCATION_ID` | Production and approved Preview | No | `2FqgdrmWP252v43cX5RY` |
| `HIGHLEVEL_PIPELINE_ID` | Production and approved Preview | No | Resolved Speaking Engagements pipeline ID |
| `HIGHLEVEL_NEW_INQUIRY_STAGE_ID` | Production and approved Preview | No | Resolved initial-stage ID |
| `HIGHLEVEL_FIELD_MAP_JSON` | Production and approved Preview | No | Versioned semantic field-key/ID/type manifest |
| `TURNSTILE_SECRET_KEY` | Production and approved Preview | Yes | Server-side bot verification |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Production and approved Preview | No | Browser widget |
| `UPSTASH_REDIS_REST_URL` | Production and approved Preview | Yes | Rate/idempotency store |
| `UPSTASH_REDIS_REST_TOKEN` | Production and approved Preview | Yes | Rate/idempotency authentication |
| `INQUIRY_HMAC_ACTIVE_KEY_ID` | Production and approved Preview | No | Active inquiry-identity key version |
| `INQUIRY_HMAC_SECRET` | Production and approved Preview | Yes | Active private inquiry digest key |
| `INQUIRY_HMAC_PREVIOUS_KEYS_JSON` | Production and approved Preview | Yes | Retained prior key versions during rotation |

`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and
`INQUIRY_NOTIFICATION_EMAIL` stop being used by the booking runtime when the
HighLevel gateway passes staging acceptance. The variables and unused Resend
adapter remain available solely for deployment rollback through a 14-day
observation window after public DNS cutover. Removing the variables, obsolete
confirmation-email state, Resend adapter, and renderer is a separate cleanup
release after that window has no unresolved booking-delivery incident.

The runtime PIT is created under HighLevel Settings / Private Integrations with
the minimum supported scopes for:

- view/edit contacts;
- view/edit opportunities;
- view location;
- view custom fields.

Interactive dashboard configuration uses a Caleb-approved collaborator or
OAuth connection. Caleb's password is never requested. Tokens are placed
directly into Vercel or the MCP connection and are never pasted into chat,
committed, printed, or included in screenshots.

## Error Handling

### Provider classification

- `401` or `403`: configuration/authentication failure; no blind retry; return
  `503 service_unavailable` with the normal phone/email alternative.
- contact-create/update `409`: while the contact lease is still owned, rerun
  the complete exact email/phone resolution table; reuse one consistent match
  or return `contact_conflict`.
- opportunity-create `409`: re-read inquiry state and run the validated, fully
  paginated exact-inquiry lookup; reuse one exact match, fail closed on multiple
  matches, and return `opportunity_conflict` when no exact match exists.
- configuration/provisioning `409`: stop that provisioning operation and
  re-inventory the exact pipeline, tag, or custom-field object; never route it
  through runtime opportunity recovery.
- `429`: honor `Retry-After` when it fits the request budget; otherwise use a
  short bounded backoff.
- `5xx` and transport timeout: at most two bounded retries with jitter, then
  return `502 delivery_failed`.
- Other `4xx`: contract/configuration failure; do not retry; log the sanitized
  operation and status only.

Provider response bodies are not forwarded to the browser. Logs contain the
inquiry ID, correlation ID, provider operation, HTTP class, attempt count, and
sanitized error code. They exclude names, email, phone, organization, free-text
answers, tokens, and complete provider bodies.

### Partial failure recovery

The inquiry service checkpoints contact and opportunity progress after each
confirmed gateway result. Its exact sequence is: reserve inquiry, acquire the
contact lease, resolve contact, atomically record the contact, release the
contact lease, find the inquiry opportunity, create only when absent, and
atomically accept with the opportunity ID. A later attempt resumes from the
last confirmed store checkpoint.
Before opportunity creation, it runs the exact Website Inquiry ID search.
Contact creation instead uses the complete exact email/phone resolution table
while the contact lease is held.

An inquiry is accepted only after the opportunity ID is known. A HighLevel
workflow email or task failure does not revoke the opportunity or cause the
website to create another one.

### Workflow monitoring and safe replay

The design does not assume that HighLevel retries a failed workflow action.
The capability audit records the actual retry and workflow-error notification
behavior available in the location. Any verified native retry or error alert is
enabled and included in acceptance evidence; an unavailable feature is not
simulated or claimed.

Workflow re-entry is disabled for the Opportunity Created trigger. Operational
monitoring uses these rules:

- any failed or errored `WEBSITE — SPEAKING INQUIRY` enrollment is an incident;
- workflow history and the `New Inquiry` column are checked daily during the
  14-day post-cutover observation window;
- an opportunity in `New Inquiry` without its follow-up task is treated as a
  failed enrollment even when no provider error is shown;
- the launch handoff assigns the ongoing pipeline review to the location owner.

An operator never blindly reruns the whole workflow. For the affected inquiry
ID, the operator checks HighLevel Conversations/email history, the internal
email log, and the contact/opportunity task list. Only a missing action is
performed manually, and the resolution is recorded as an opportunity note.
This is the safe replay procedure when HighLevel cannot prove automatic
action-level idempotency.

### Public receipt contract

The accepted API response and thank-you session state contain:

- inquiry ID;
- accepted state;
- acceptance time.

They no longer contain `confirmationEmailSent` because HighLevel sends the
acknowledgement asynchronously. The thank-you page confirms receipt without
claiming that an email has already been delivered.

## Security and Privacy

- Turnstile remains fail-closed in production.
- Upstash rate limits remain 5 attempts per 15 minutes and 20 per 24 hours for
  the private composite rate identity.
- The HighLevel PIT is server-only, Sensitive, location-scoped, and
  least-privilege.
- Browser bundles contain no HighLevel credentials or CRM identifiers required
  for authorization.
- Full inquiry payloads are sent only to HighLevel and are not persisted in
  Upstash or application logs.
- Public errors never expose provider bodies, record IDs, tokens, or internal
  configuration.
- The website privacy disclosure must identify the CRM processing purpose and
  the transfer of booking details to HighLevel before public launch.
- Existing HighLevel contact history, owners, tags, conversations, and funnel
  enrollment are preserved.
- No booking workflow action enrolls the contact into `BOOK FUNNEL`.

## Site Editor Boundary

The Caleb implementation remains behind the existing inquiry-provider
interface. It proves a reusable capability slice:

- conflict-aware contact resolution, creation, and owned-field update;
- opportunity creation;
- opportunity field mapping;
- workflow handoff;
- provider health/error classification.

The first implementation remains local to V3. After production evidence shows
that its contract is stable, a separate approved platform specification may
extract the generic contract and HighLevel gateway into the appropriate private
Site Editor packages. This phase does not publish a new package or add the
entire HighLevel feature catalog to the Site Editor.

## Testing

### Unit tests

- Exact contact field mapping and owned-field update behavior.
- Zero, one, and multiple exact-email contact matches.
- Zero, one, and multiple exact-phone contact matches.
- Every email/phone match combination in the contact-resolution table.
- Contact-lease owner tokens, acquisition timeout, renewal, lost-renewal abort,
  maximum budget, compare-owner release, and concurrent same-email requests.
- Exact opportunity standard/custom field mapping.
- Field-manifest parsing rejects missing, duplicate, wrong-object, wrong-type,
  and incompatible-option entries.
- Opportunity naming and empty optional values.
- Same canonical inquiry maps to the same inquiry ID.
- A changed event field maps to a distinct inquiry ID.
- Active and previous HMAC key versions resolve the same protected inquiry
  during rotation.
- Existing contact plus distinct inquiry creates a new opportunity.
- Existing inquiry ID returns the existing opportunity.
- Contact checkpoint resumes after opportunity failure.
- Every compare-and-set state transition and lease-owner conflict.
- Checkpoint-write failure leaves the previous state and resumes safely.
- Timeout after opportunity creation discovers the created opportunity.
- `401`, `403`, `409`, `429`, `5xx`, timeout, malformed JSON, and unexpected
  provider responses map to the approved error classes.
- Provider and application logs exclude all prohibited values.
- Accepted public responses omit `confirmationEmailSent`.

### Contract tests

Use a controlled HTTP server, not the live HighLevel location, to assert:

- URL paths, methods, version header, bearer header presence, and JSON shape;
- token values are never snapshot-printed;
- retry limits and `Retry-After` behavior;
- create-versus-resume ordering;
- complete pagination before an opportunity is considered absent;
- complete pagination for both exact-email and exact-phone contact searches;
- exact Website Inquiry ID comparison and multi-match conflict behavior;
- operation-specific contact, opportunity, and provisioning `409` recovery;
- provider timeouts remain within the Vercel function budget.

### Repository verification

Run focused tests first, then:

- complete unit/component/API test suite;
- lint;
- TypeScript checking;
- production Next.js build;
- Vercel build with private package resolution;
- secret and generated-output scans.

### Live staging acceptance

1. Connect scoped HighLevel access and perform the read-only inventory.
2. Reconcile the inventory with this specification; stop on a material conflict
   rather than changing an existing object.
3. Create/reuse the approved fields, pipeline, stages, tags, and workflow, but
   leave the workflow unpublished.
4. Deploy to a Vercel staging target protected from unauthenticated access and
   keep public DNS on Thryv.
5. Publish the workflow immediately before the controlled test. At this point
   the only reachable form is the protected staging deployment. If publication
   or the test fails, unpublish the workflow before further diagnosis.
6. Submit one clearly labeled test inquiry authorized by the user and verify
   its workflow enrollment and three actions.
7. Submit the identical payload again and confirm that it returns the original
   inquiry ID without creating a second opportunity or workflow run.
8. Verify the contact, one opportunity, every custom field, internal email,
   prospect acknowledgement, and follow-up task.
9. Confirm `BOOK FUNNEL`, the book funnel, and `joyfound.calebjakes.com` are
   unchanged and operational.
10. Confirm no booking request invokes Resend.
11. Keep the workflow published only after all checks pass; public DNS remains
    unchanged until the separate cutover authorization.

The test contact and opportunity remain clearly labeled until Caleb confirms
whether to retain or remove them. They are not deleted without explicit
authorization.

## Rollout and Rollback

### Preconditions

- Canonical GitHub repository ownership is resolved.
- Vercel remains connected to the canonical repository.
- Private package access passes in GitHub Actions and Vercel.
- Caleb-approved collaborator/OAuth access is available for read-only audit and
  dashboard configuration.
- The location-scoped PIT is stored directly in Vercel.
- Turnstile production hostnames and keys are valid.
- Public DNS still points to the current Thryv site.

### Release order

1. Audit HighLevel read-only and pass the capability-validation gate.
2. Create the HighLevel objects with the workflow unpublished.
3. Implement and verify the provider gateway and state transitions.
4. Deploy the protected Vercel staging target.
5. Publish the workflow while the form remains protected and public DNS remains
   on Thryv.
6. Run the single labeled end-to-end test and duplicate replay; unpublish on
   any failed acceptance check.
7. Produce a launch go/no-go report.
8. Switch public DNS only after a separate explicit authorization.
9. Observe workflow and pipeline health for 14 days after cutover before the
   Resend rollback cleanup release.

### Rollback

- Disable `WEBSITE — SPEAKING INQUIRY`.
- Restore the previous known-good Vercel deployment.
- Keep the current Thryv DNS records unchanged during staging.
- Preserve created CRM records for audit unless deletion is separately
  authorized.
- Keep the book funnel and `BOOK FUNNEL` untouched throughout rollback.

## Acceptance Criteria

- The existing custom V3 form remains the public booking surface.
- Every accepted distinct inquiry creates exactly one opportunity in
  `Speaking Engagements / New Inquiry`.
- The same contact may hold multiple distinct event opportunities.
- An identical inquiry during the 400-day identity-ledger window does not
  create a second opportunity.
- Event-specific values are stored on the opportunity and survive contact
  reuse.
- The prospect acknowledgement, internal notification, and task run only from
  the new pipeline workflow.
- Opportunity existence, not email delivery, determines public acceptance.
- A partial provider failure resumes without duplicate contacts or
  opportunities.
- The HighLevel capability report proves contact lookup, full opportunity
  pagination, custom-field retrieval, and the pinned API version before the
  implementation may create production CRM objects.
- Ambiguous contact or opportunity matches fail closed and create no new
  business record.
- HMAC rotation retains prior keys for the complete duplicate-protection
  window.
- HighLevel credentials and personal information remain out of browser code,
  logs, source control, and chat.
- Resend is not required by the booking runtime.
- No calendar or SMS behavior is added.
- The existing funnel, `BOOK FUNNEL`, sending domain, and live funnel URL remain
  unchanged.
- Unit, contract, repository, Vercel build, and staged end-to-end checks pass.
- The staged workflow test runs only while the Vercel form is access-protected
  and public DNS remains on Thryv.
- Any failed workflow enrollment has a documented monitoring and safe replay
  path that does not blindly resend completed actions.
- Public DNS is not switched until the user separately authorizes cutover.
