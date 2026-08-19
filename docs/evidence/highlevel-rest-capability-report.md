# HighLevel REST Capability Report

**Date:** 2026-08-18
**Location:** Joyionaire Enterprises LLC
**API version:** `v3`
**Credential:** location-scoped Private Integration Token; value omitted

## Safety boundaries

- No token, provider response body, personal address, phone number, or real
  prospect data is recorded here.
- The existing `BOOK FUNNEL`, both `Marketing Pipeline` records, account
  timezone, templates, and live funnel were not changed.
- After the complete `BOOK FUNNEL` action list was audited and Caleb approved
  the account-wide behavior, `Allow Multiple Opportunities per Contact` was
  enabled manually in HighLevel.
- The controlled contact uses an `example.invalid` address and is clearly
  labeled as an integration test.
- Test records are retained for audit until deletion is separately authorized.

## Gate results

| Gate | Result | Evidence |
| --- | --- | --- |
| H1 canonical repository | Pass | GitHub and the automatic Vercel deployment both resolve repository ID `1312397718` under `Reuben-Williams/Caleb-Motivational-Speaker-V3`. |
| H2 REST contract | Partial pass | The runtime PIT successfully read the location, pipelines, contact/opportunity custom fields, and used exact contact search, contact create, contact update, opportunity search, and opportunity create. Pipeline-definition creation returned `401`, so the isolated pipeline was created manually in the dashboard. |
| H3 distinct opportunities | Pass | HighLevel reported `allowDuplicateOpportunity: true`. The previously blocked, distinctly named second opportunity returned `201`; a follow-up search returned exactly one copy of each labeled inquiry under the same synthetic contact and `Speaking Engagements` pipeline, with distinct opportunity IDs. |
| H4 timezone | Pass | The user confirmed `America/New_York` for the new website workflow. The existing HighLevel location timezone remains unchanged. |

## Validated v3 operations

| Operation | Method and path | Validated behavior |
| --- | --- | --- |
| Read location | `GET /locations/:locationId` | Returned the expected location and duplicate settings. |
| Read pipelines | `GET /opportunities/pipelines?locationId=...` | Returned both pre-existing Marketing pipelines and the isolated Speaking Engagements pipeline. |
| Read fields | `GET /locations/:locationId/customFields?model=all` | Returned one Contact field and zero Opportunity fields before provisioning. |
| Exact contact search | `POST /contacts/search` | Uses `locationId`, pagination values, and an exact email filter; returned `contacts`, `total`, and `traceId`. |
| Create contact | `POST /contacts/` | Returned `201` and a contact object for the synthetic test record. |
| Update contact | `PUT /contacts/:contactId` | Returned the same contact ID after updating owned test fields. |
| Search opportunities | `GET /opportunities/search` | The v3 endpoint requires camel-case `locationId`, `pipelineId`, and `contactId`; returned `opportunities`, cursor metadata, and `traceId`. Search indexing was eventually consistent after creation. |
| Create opportunity | `POST /opportunities/` | Returned `201` for both distinctly labeled test inquiries attached to the same synthetic contact and pipeline after the approved account setting was enabled. |

## Provisioned isolated pipeline

`Speaking Engagements` contains exactly these six stages:

1. `New Inquiry`
2. `Contacted`
3. `Discovery Scheduled`
4. `Proposal Sent`
5. `Booked`
6. `Closed - Not Booked`

No automatic Won or Lost stages were added.

## H3 conclusion

HighLevel's documented account-level `Allow Multiple Opportunities per
Contact` setting governs whether the same contact can hold multiple
opportunities in one pipeline. The existing `BOOK FUNNEL` workflow was audited
top to bottom and contained no create, update, find, or remove opportunity
actions. Caleb then approved the account-wide setting change, and the user
enabled it manually.

The controlled retry passed: the same synthetic contact now holds exactly two
distinctly labeled test opportunities in `Speaking Engagements`, both in `New
Inquiry`, with unique opportunity IDs. Gate H3 is cleared for the approved
requirement, "one opportunity per distinct event inquiry."

The verification used the current v3 search contract: `Version: v3` with
camel-case `locationId`, `pipelineId`, and `contactId` query parameters. A
legacy date-based version header routes the search request to the older
snake-case schema and must not be used by the production client.

## Primary references

- [HighLevel API versioning](https://marketplace.gohighlevel.com/docs/Versioning/index.html)
- [HighLevel API scopes](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/index.html)
- [HighLevel Create Opportunity API](https://marketplace.gohighlevel.com/docs/ghl/opportunities/create-opportunity/index.html)
- [HighLevel multiple opportunities setting](https://help.gohighlevel.com/support/solutions/articles/48001066144-multiple-opportunities-for-the-same-person-in-the-same-pipeline)
