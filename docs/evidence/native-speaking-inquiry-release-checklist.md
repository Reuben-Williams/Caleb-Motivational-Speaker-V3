# Native Speaking Engagements release checklist

Record only safe names, states, timestamps, deployment IDs, and counts. Never
paste tokens, passwords, connection strings, customer payloads, or email bodies.

## Local gates

- [ ] Exact `@reuben-williams/*` direct packages resolve to `0.5.0`.
- [ ] Builder package compatibility preparation reports only exact `0.5.0`
  packages and succeeds on a clean install.
- [ ] Native migration contract passes through `0012`.
- [ ] Disposable Postgres conformance and backup/restore pass.
- [ ] `npm run check:no-highlevel` passes.
- [ ] Lint, typecheck, all tests, and production build pass.
- [ ] Tracked source and built output pass the secret scan.
- [ ] Booking page passes desktop, 390-pixel mobile, keyboard, reduced-motion,
  Turnstile, error, and receipt checks.
- [ ] Private workspace is no-index and every owner-data response is
  `Cache-Control: private, no-store`.

## Provider preflight

- [ ] Target Neon host/database is resolved without displaying credentials.
- [ ] Target environment is explicitly Preview or Production as intended.
- [ ] Existing migration names and checksums match the approved manifest.
- [ ] A recoverable branch/checkpoint or backup exists.
- [ ] Fixed Caleb site/runtime identities and minimum capabilities are present.
- [ ] Active 400-day policy is present.
- [ ] Caleb Owner membership, operator membership, capabilities, entitlement,
  and revocation functions are provisioned.
- [ ] Resend domain and sender are verified.
- [ ] Upstash, Turnstile, worker, Cron, HMAC, staff-auth, and database variable
  names are present in the intended Vercel environment only.
- [ ] `INQUIRY_REDIS_NAMESPACE` is `caleb:preview` in Preview and
  `caleb:production` in Production, even when both environments share Upstash.

## Protected acceptance

- [ ] Submit one clearly labeled authorized native test inquiry.
- [ ] One submission and one consent exist.
- [ ] One contact is created or reused as expected.
- [ ] One `Speaking Engagements` lead exists for the distinct event.
- [ ] One enhanced result links submission, contact, and lead.
- [ ] Exactly two outbox records exist.
- [ ] Organizer and internal messages each reach one terminal/safe state.
- [ ] Exact replay returns the original public receipt and creates no duplicate.
- [ ] Event-changing resubmission creates one separate lead.
- [ ] Private workspace shows the correct event and safe delivery states.
- [ ] Vercel/Neon/Upstash/Resend evidence shows zero legacy CRM calls.

## Production-candidate decision

- [ ] Fixed Vercel hostname passes direct/deep routes, metadata, SSL, redirects,
  logs, responsive QA, and no horizontal overflow.
- [ ] Retention worker dry run reports the reviewed 400-day policy.
- [ ] Email and retention Cron routes reject missing/wrong authorization and
  all caller-supplied job parameters.
- [ ] No commerce order was created and no DNS was changed during this gate.
- [ ] Go/no-go and rollback evidence is recorded before public DNS cutover.
