# Managed installation local go/no-go — 2026-08-31

## Decision

- **Local implementation:** GO.
- **Control-plane registration, package activation, provider configuration, database migration, or deployment:** NO-GO until the separately approved gates below are satisfied.

This report covers the embedded Caleb V3 installation worker only. It does not authorize a Vercel change, database mutation, one-time exchange, package activation, DNS change, inquiry, order, or HighLevel mutation.

## Verified locally

- Exact Caleb client packages remain pinned to `@reuben-williams/*@0.5.0`.
- The platform data-plane implementation is recorded at `a8a608b` on `codex/caleb-commerce-automations-design`.
- The additive Caleb release catalog and three-module bundle are recorded at `d6105dc` on `codex/caleb-commerce-automations-design`.
- The catalog freezes `growth.customers@1.1.1`, `growth.leads@1.1.1`, and `growth.messaging@1.0.1` with minimum worker `0.5.0`, exact client packages `@reuben-williams/*@0.5.0`, and health policy `growth-caleb-speaking-engagements-v1`.
- Existing generic, Garcia, and Assembly release descriptors remain unchanged; the Caleb bundle is isolated as `growth.caleb-speaking-engagements@1`.
- The isolated PostgreSQL managed-installation contract suite passed: 5 files, 67 tests.
- Caleb V3 lint, type checking, 64 test files / 209 tests, and the Next.js production build passed.
- The dependency audit reports 0 known vulnerabilities after patch-only transitive overrides.
- The tracked-source secret scan passed, and server-only installation names/packages were absent from browser bundles.
- The HighLevel boundary scan passed: no runtime, credential, hostname, import, or fixture references remain.
- The installation route is present at `/api/builder/workers/installation`; unauthenticated GET returns `401` with `private, no-store`, and POST returns `405`.
- Desktop and 390 px mobile homepage checks passed without relevant console warnings or horizontal overflow.
- Direct checks passed for `/book-caleb`, `/admin/login`, and `/admin/editor/speaking-engagements`; no inquiry or order was submitted.
- The footer `Staff Login` link resolves to `/admin/login`, and the color-scheme control changes the documented scheme state.

## Expected fail-closed preflight

The local preflight currently returns these safe codes:

- `INSTALLATION_ENVIRONMENT_INCOMPLETE`
- `INSTALLATION_KEY_BINDING_MISSING`
- `INSTALLATION_REACHABILITY_NOT_VERIFIED`
- `INSTALLATION_REGISTRATION_MISSING`

These codes are expected before a candidate deployment is selected, the controlled exchange is issued and consumed, the public key binding is generated, and the provider-side environment is configured.

## Release blockers

1. The Caleb-compatible release family is resolved locally but is not yet pushed or deployed to the control plane. No package is assigned or activated.
2. A candidate deployment must be created and its immutable URL verified before `reachabilityEvidenceRevision` can be recorded.
3. The one-time installation exchange, installation registration, key binding, and provider variables require separate approval and must be performed in that order.
4. Migration `0013`, first signed worker execution, health evidence, package assignment/activation, and launch acceptance remain separately gated.

## Preserved scope

The user-owned `next-env.d.ts`, local video files, and `output/` directory were not included in the managed-installation commits.
