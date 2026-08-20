# HighLevel Commerce Workflow Audit — 2026-08-19

## Scope and safety boundary

This is a sanitized, read-only record of the five published workflows observed in the HighLevel
`Book Funnel` folder for Joyionaire Enterprises LLC. The browser audit did not save, publish, test,
send, create a contact, change a funnel, or modify HighLevel.

The record intentionally excludes customer records, execution history, credentials, message bodies,
paid product files, permanent download URLs, and signed URLs. Where an exact value was not captured,
the record says `unknown` instead of guessing.

The exact click time was not recorded. The source was observed on 2026-08-19 Eastern time and was
locked into the approved design record by 2026-08-19T23:04:51.000Z. The source manifest records that
bounded evidence time and its `bounded_by_design_record` precision.

## Common observed settings

- Provider: HighLevel
- Location ID: `2FqgdrmWP252v43cX5RY`
- Source state: published
- Re-entry: enabled
- Multiple opportunities: enabled
- Stop on response: disabled
- Sending-time restrictions: disabled
- Click tracking: disabled
- UTM tracking: disabled
- Tag on interaction: disabled
- Template synchronization: disabled
- Mark conversation read: disabled
- Timezone behavior: HighLevel account timezone
- Sender behavior: HighLevel default sender values

These source settings are evidence, not production approval. The replacement remains inactive until
its own sender, timezone, consent, content, asset, and provider gates pass.

## Workflow 01 — Book Funnel

- Source ID: `b98d2b26-6631-4504-ae99-de8df7985f46`
- Source name: `01. Book Funnel: Shedding Pounds Gaining Purpose`
- Trigger A: order-form submission for funnel `The Weighty Joy of Surrender`, page `Optin`, and the
  print-book product.
- Trigger B: submitted order for the print-book product and the observed `$9.95` price entry.
- Ordered actions: add the book-funnel status tag; send `Your Book is On the Way`; wait one minute;
  branch on the book-funnel tag plus active membership in Workflow 03; add print-only or
  print-plus-audio purchase tags; wait five minutes; add the start-nurture tag.
- Observed nurture handoff: six minutes total.

Production correction: one paid physical-book line item creates one manual fulfillment task, sends
one approved transactional message, waits six minutes, and enters the nurture campaign only when
marketing eligibility passes. It does not infer audiobook ownership from a tag or active workflow.

## Workflow 02 — Nurture Sequence

- Source ID: `031d3e0c-2402-4f15-b3f0-f99d0bfd5877`
- Source name: `02. Funnel Nurture Sequence`
- Triggers: print-book order form; start-nurture tag; or submitted print-book order.
- Ordered timing: wait 6 hours; send email 2; wait 24 hours; send email 3; wait 48 hours; send course
  email 4; then send course emails 5, 6, and 7 at 24-hour intervals; wait another 24 hours; remove
  the book-funnel status tag.
- All six observed emails use the unrelated subject `Elevate Your Brand Presence: Unleash the Power
  of Social Media Management`.
- Course emails 4–7 use a HighLevel preview destination. The exact preview URL was not retained in
  this sanitized record.
- Emails 6–7 contain closing-soon, limited-spot, or midnight urgency without an observed automated
  deadline contract.

Production correction: Campaigns owns this six-message sequence. It can be entered only by the
Book Purchased recipe, every send rechecks marketing eligibility, unrelated subjects and preview
links are rejected, and unsupported urgency is removed unless Caleb approves a real configured
deadline.

## Workflow 03 — Audiobook Purchase

- Source ID: `c19691ab-f433-446c-acba-56ca723f4661`
- Trigger: submitted order containing the audiobook product.
- Ordered actions: send the audiobook-access email containing a Google Drive share destination;
  wait 12 hours.
- Exact email subject and exact Drive URL: not retained in the sanitized record.
- Observed reason for the 12-hour active run: Workflow 01 used active Workflow 03 membership as an
  audiobook-upsell signal.

Production correction: one paid audiobook line item grants one entitlement and sends one approved
passwordless-library access message. The artificial 12-hour wait is removed because line-item state
is explicit.

## Workflow 04 — Course Purchase

- Source ID: `554540ac-901e-4844-8009-bc0040c8b76f`
- Triggers: course-upsell order-form submission; or submitted order containing the course product.
- Ordered actions: grant the `Release The Weight Course` offer; add the course-purchase tag; wait one
  minute; send a membership-login email using `{{membership_contact.login_url}}`.
- Exact source email subject: not retained in the sanitized record.

Production correction: one paid course line item grants one provider-neutral entitlement, preserves
the verified one-minute wait, and sends one approved passwordless-library access message.

## Workflow 05 — Workbook Purchase

- Source ID: `798ae811-426a-46c3-87a2-6a56013e541d`
- Trigger: workbook-downsell order-form submission containing the workbook product.
- Ordered action: send the workbook-access email containing a Google Drive share destination.
- Exact source email subject and exact Drive URL: not retained in the sanitized record.
- No workbook purchase tag was observed.

Production correction: one paid workbook line item grants one entitlement and sends one approved
passwordless-library access message. A missing source tag is not invented.

## Known business values and unresolved approvals

Verified now:

- Print book is physical.
- Audiobook, workbook, and course are digital.
- Physical orders use a manual fulfillment queue.
- Digital access uses a passwordless customer library and private object storage.
- Stripe starts in test mode and uses Caleb's client-owned Connect Standard account.
- Resend is the selected email provider; `mg.calebjakes.com` is the existing HighLevel sending
  domain, not automatically an approved Resend sender.
- Internal notification inbox: `info@calebjakes.com`.
- The source print-book price entry observed in HighLevel is `$9.95`; it is evidence, not approval
  for the replacement checkout price.

Still unknown and therefore activation-blocking:

- Final product titles, SKUs, individual and bundle Offers, prices, currency, and tax treatment.
- Shipping charge, supported shipping countries, and shipping-address retention period.
- Refund, digital-access, privacy, and fulfillment policy versions and final copy.
- Resend sending domain, sender address/display name, reply handling, and legal mailing-address
  variables.
- Final transactional and nurture subjects, bodies, preview text, production links, and any real
  urgency deadlines.
- Final marketing-consent wording and policy version.
- Verified audiobook, workbook, and course source files and course structure.
- Caleb's approval of each retained book image and its intended commerce use.

## Migration conclusion

The five source workflows can be serialized and compared with corrected production drafts. They
cannot be activated from this evidence alone. HighLevel remains unchanged and continues to own all
legacy checkouts until a later controlled cutover.
