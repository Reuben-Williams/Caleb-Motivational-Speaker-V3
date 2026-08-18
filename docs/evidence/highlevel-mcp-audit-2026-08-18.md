# HighLevel MCP Verification — 2026-08-18

## Scope

Read-only verification of the connected `highlevel_caleb_audit` MCP against
Joyionaire Enterprises LLC. No contacts, opportunities, fields, pipelines,
templates, messages, workflows, funnels, or settings were created or changed.

## Connection result

- MCP connection: successful
- Authorized location ID: `2FqgdrmWP252v43cX5RY`
- Authorized location name: `Joyionaire Enterprises LLC`
- Location email: `info@calebjakes.com`
- Location website value: `www.calebjakes.com`
- Forms, opportunities, workflows, funnels, contacts, tags, and email-builder
  features are enabled at the location level.

The token value was not read, printed, or stored in this repository.

## Read operations verified

The connected MCP successfully returned:

- location details and CRM duplicate settings;
- opportunity pipelines and all stages;
- Contact and Opportunity custom-field inventories;
- email-template inventory.

## CRM findings

### Duplicate settings

- Duplicate contacts: disabled
- Contact unique identifiers: email and phone
- Duplicate opportunities: disabled

The duplicate-opportunity setting conflicts with the approved website behavior
that permits one contact to have multiple distinct speaking-event
opportunities. It must not be changed globally without confirming its impact on
the existing book funnel and testing whether direct API creation can create
distinct pipeline opportunities without changing the location setting.

### Pipelines

The location contains two different pipeline records that are both named
`Marketing Pipeline`. Each has the same six visible stage names:

1. `New Lead`
2. `Hot Lead`
3. `New Booking`
4. `Visit Attended`
5. `Sale`
6. `Left a Review`

Neither pipeline is renamed, merged, deleted, or reused for speaking inquiries.
The duplicate names make ID-based reconciliation mandatory.

### Custom fields

- Contact custom fields: one existing field, `Your website`
- Opportunity custom fields: none

The approved Role / Title contact field and Website Speaking Inquiry
opportunity-field set do not yet exist.

### Email templates

The MCP returned 15 non-archived templates. Existing templates include the
Caleb base template and multiple book-funnel/course emails. No existing
template was identified as the approved website speaking-inquiry
acknowledgement. Existing book-related templates remain untouched.

## Profile conflicts requiring caution

The HighLevel location profile contains an administrative address, timezone,
and phone that conflict with facts currently used by the public speaker site.
Those values are not copied into public content or booking emails. In
particular, the location timezone currently differs from the website's
`America/New_York` booking-date policy. Caleb must confirm the intended
operational timezone before workflow due dates or date-sensitive automation are
published.

## MCP capability boundary

The connected original LeadConnector MCP exposes useful read operations for
locations, pipelines, custom fields, templates, contacts, opportunities,
calendars, conversations, blogs, payments, and social posting.

Its visible tool catalog does not expose:

- workflow listing, creation, editing, testing, or publication;
- funnel inspection or editing;
- pipeline creation or stage creation;
- custom-field creation;
- tag inventory/creation;
- opportunity creation;
- native form inventory or creation.

The catalog also exposes write-capable contact, conversation, email-template,
blog, social-post, and opportunity-update tools. Their presence means the
connection should not be treated as read-only merely because its local name
contains `audit`. No write tool was invoked during this verification.

## Consequence for implementation

The MCP is verified for read-only orientation but is insufficient by itself for
the full one-shot configuration. Completing the approved integration requires
one of these controlled paths:

1. Caleb-approved collaborator/dashboard access for UI-only pipeline,
   custom-field, workflow, and publication steps; or
2. a separately scoped runtime/provisioning PIT used directly by an approved
   server-side script for supported REST operations, plus dashboard access for
   workflow-only steps.

The application runtime PIT remains separate from the MCP connection and must
be stored directly as a Sensitive Vercel variable. It is never retrieved from
the MCP or copied into chat.

## Verification outcome

**Connected and usable for read-only audit, with configuration capability gaps.**

Implementation remains gated on:

- exact HighLevel REST capability validation;
- duplicate-opportunity behavior;
- confirmed operational timezone;
- a dashboard-capable authorization path for workflow configuration.
