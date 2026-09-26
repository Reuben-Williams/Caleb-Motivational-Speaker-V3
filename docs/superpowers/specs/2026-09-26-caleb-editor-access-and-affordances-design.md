# Caleb editor access and editing affordances

Date: 2026-09-26
Status: user approved the proposed design; written specification awaiting review.
This amendment supersedes the authenticator requirements in the September 24
attached-editor specification for Caleb V3 only. All other constraints remain.

## Outcome and security boundary

Caleb and the approved Administrator/Operator use the existing email-link staff
sign-in flow to edit, upload, publish, restore, and retry public refreshes without
enrolling or verifying an authenticator. Access relies on their email inbox
security. No anonymous access, new staff membership, or shared control-plane MFA
change is authorized. Do not delete existing authenticator factors.

The site-local website authorizer stops requiring recent AAL2 for these commands.
It still requires a valid unexpired staff session, active same-site membership,
approved role, the specific capability, current entitlement, and matching tenant
and version. Mutation origin, CSRF, idempotency, replay prevention, concurrency
checks, database authorization, and durable audit receipts remain unchanged.
Invalid, expired, wrong-site, or unauthorized sessions fail closed. Remove the
authenticator panel and authenticator-specific instructions from this editor;
authentication failures direct users to the Caleb staff email sign-in route.

## Preview and selection

Only declared text and image regions in the authenticated private preview receive
visible dashed outlines, a pointer affordance, and a stronger hover/focus outline.
Selected regions receive a distinct solid outline and an accessible edit label.
Use outlines rather than borders to avoid moving the approved page layout. Public
pages must not show editing decorations or expose private drafts.

The bridge owns region decoration, selection, and keyboard activation with Enter
or Space. Preserve native text/image semantics rather than replacing them with
buttons. Only registered regions are selectable; protected content remains locked.
Selection sends the existing validated same-origin, same-frame, site/page-bound
message to the inspector. Clear stale selection when changing pages or reloading
the draft after a save. Editable links select the region rather than navigating;
other preview interactions must not submit forms or escape the private preview.
Normal public links and forms are unaffected.

## Readiness and failure feedback

The editor distinguishes loading content, loading the interactive preview, ready
to select, and failed/unavailable states. Readiness uses the bridge's validated
ready message, not iframe load alone. Reset readiness for every new frame/page;
show a recoverable timeout after 15 seconds if readiness never arrives. Ignore
messages from another origin/frame/page or undeclared region. The ready handshake
must tolerate parent-listener/iframe hydration ordering (request/reply or bounded
retry), and cancel timers/listeners on unmount.

The inspector gives plain instructions before selection. Saving uses the selected
region and version checks, reports errors honestly, and refreshes the private
preview after success. Publishing stays explicit and page-specific. Report public
refresh failure separately from durable publication success. Image upload retains
private storage, approved file validation, alt text, and same-site metadata checks.

## Verification and Production release

Add tests showing an authorized email-link session without AAL2 can perform every
website operation, while expired/unauthorized/wrong-site sessions and missing
capabilities, entitlements, origin, or CSRF still fail. Preserve existing Growth
authorization tests and shared control-plane MFA policy.

Test declared-region outlines, selected state, keyboard activation, text/image
selection, readiness timeout/recovery, message isolation, and absence of editor
decorations on public routes. Reproduce the save/publish/restore/image replacement
workflow in Preview using disposable draft content and approved test media;
restore the approved text/images afterward. Confirm public drafts remain private,
history and receipts are durable, and desktop/tablet/mobile previews remain usable.

Before Production, complete lint, type checks, focused and full test suites, build,
installation preflight and signed health checks, and no-HighLevel/secrets checks.
Resolve failures rather than weakening acceptance tests. Preserve unrelated dirty
files. Use the existing approved Production migration/provisioning plan, verify a
recoverable backup before any pending migration, preserve Growth capability grants,
and verify Production private media configuration. Do not deploy with missing
requirements or publish disposable test content into Production.

The user authorized deploying the completed fixes to calebjakes.com. Deploy only
after Preview acceptance and Production prerequisites pass, then verify the domain,
footer Staff Login, site-local editor route and authenticated content loading.
Do not change DNS, submit booking inquiries, create commerce orders, alter approved
public media, or modify HighLevel. Report any unverified authenticated Production
steps separately; never describe a partial check as complete release acceptance.
