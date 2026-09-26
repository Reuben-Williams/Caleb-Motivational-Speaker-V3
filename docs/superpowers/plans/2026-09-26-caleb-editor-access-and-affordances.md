# Caleb editor implementation and release plan

Execute the approved amendment in
`docs/superpowers/specs/2026-09-26-caleb-editor-access-and-affordances-design.md`
and preserve the September 24 attached-editor specification.

1. Add failing tests for authorized email-link Website commands without AAL2,
   preserved denials, private-preview region affordances and keyboard selection,
   editor readiness and removal of the authenticator panel.
2. Update only Caleb's Website policies; retain staff session, role, tenant,
   capability, entitlement, CSRF, origin and replay checks.
3. Add private-bridge scoped outlines/selection, keyboard activation, bounded
   ready-message retries, and navigation prevention. Add editor readiness timeout
   with late-ready recovery; reset selection on frame changes. Preserve input on
   conflicts and report save failures without implying success.
4. Run focused tests, lint, typecheck, full suite and build. Verify installation
   evidence without fabricating receipts or weakening tests. Preserve dirty files.
5. Commit/push Preview changes, verify the interactive workflow with disposable
   content, restore approved defaults, and confirm the public page stays isolated.
6. Audit pending Production migration, recovery backup, member/grant union,
   entitlements, private-media configuration and runtime credentials. Apply only
   the previously approved exact manifest/provisioning after checks pass.
7. Fast-forward main only if compatible, push/deploy using Production configuration
   (never promote a Preview-configured build), verify calebjakes.com Staff Login,
   editor routing and authenticated content. Report unverified steps explicitly.

No DNS, HighLevel, bookings, commerce orders, or unrelated changes.
