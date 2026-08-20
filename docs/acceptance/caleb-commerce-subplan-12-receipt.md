# Caleb Commerce Subplan 12 Acceptance Receipt

- Recorded: 2026-08-20
- Scope: Caleb V3 package attachment, checkout boundaries, passwordless-library surface, operator workspaces, and protected Vercel preview
- Branch: `codex/caleb-commerce-integration`
- Website commit verified on Vercel: `4ca7b56fdca4899fc55d762039327f27ce22821b`
- Deployment: `dpl_7UR153gfMfvnWdgWVMnTd44rGdeP`
- Preview state: `READY`; protected Preview deployment; no Production alias
- Production commerce state: inactive; `legacy_primary`
- HighLevel changed: no

## Accepted integration

- The website installs the approved `0.4.0` private platform packages through a placeholder-only
  GitHub Packages configuration. No package token is checked into the repository.
- The public Store keeps `joyfound.calebjakes.com` as Caleb's current purchase destination.
- Private Stripe test checkout, status, webhook, reconciliation, passwordless customer-library,
  private-asset, worker, Commerce workspace, and Automations workspace routes are attached.
- Browser-controlled price and account values are rejected. Checkout creation is closed unless the
  explicit test mode, runtime gate, approved Offer, provider bindings, and test-access checks pass.
- Checkout redirects do not create orders or entitlements. Customer access remains dependent on
  verified server-side provider events and persisted ownership evidence.
- Operator workspaces render in denied mode until real staff membership, entitlements, and provider
  runtime are configured. No mock operational data or mutation authority is granted.
- The normal Vercel build and the legacy GitHub Pages static fallback both remain supported.

## Verification evidence

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 24 files and 107 tests passed.
- `npm run build`: passed; 38 Next.js routes built.
- `npm run build:pages`: passed; 25 static routes exported after server routes were staged out.
- `npm audit`: zero vulnerabilities.
- GitHub Actions published and verified `@reuben-williams/growth-commerce`,
  `@reuben-williams/growth-commerce-ui`, and `@reuben-williams/growth-automations-ui` at `0.4.0`:
  https://github.com/Reuben-Williams/Site-Editor-Platform/actions/runs/32392089972
- Vercel installed the private packages, compiled with Webpack, typechecked, built all 38 routes,
  and completed the protected preview successfully.
- Live preview browser acceptance covered 20 routes at desktop, 390 px, and 320 px. Every route
  returned 200, no checked page overflowed, navigation/FAQ/redirect behavior passed, reduced-motion
  mode rendered no atmosphere canvas, and the five inactive-security probes returned their expected
  404, 401, 401, 503, and 401 states.
- Vercel reported no error or fatal runtime logs for the deployment during acceptance.
- Browser evidence: `C:\caleb-q1-vercel\report.json` and its referenced screenshots.

## Gate boundary

Subplan 12 is accepted for an inactive protected preview. It does not authorize Subplan 13
activation, a Stripe payment, an email, a customer entitlement, an asset transfer, a production
deployment, a HighLevel change, or a DNS change.

Subplan 13 remains blocked until Caleb approves the catalog, prices, policies, fulfillment,
shipping, consent, sender, and final copy; the paid files are supplied; Neon, Stripe Connect test
mode, Resend, and private R2 are provisioned; staff/customer auth and secrets are configured; and
the controlled staging, shadow, cutover, observation, and rollback gates are run.
