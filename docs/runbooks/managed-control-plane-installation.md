# Caleb managed installation operations

## What this adds

Caleb's Vercel project runs the installation worker. The SaveYour control plane may offer a signed command, but Caleb's worker accepts only the three committed Growth configuration recipes. Caleb's customer, booking, commerce, staff, and email data remain in Caleb's Neon/Vercel data plane; the control plane receives only signed command results and sanitized health.

The worker wakes every five minutes at `/api/builder/workers/installation`. It processes at most one command, holds a fenced 120-second run lease, requests a 60-second command lease, requires 30 seconds to remain, limits a handler to 20 seconds, and stops the whole request at 45 seconds.

## Before any exchange token

1. Run `npm run builder:preflight-installation`.
2. Run `npm run builder:check-installation-secrets`.
3. A blocked reachability, registration, key binding, environment, package, route, database, or digest check means stop.
4. Never paste an exchange token into chat, a file, an environment variable, or a command argument. It is entered through the CLI's stdin prompt only after a separately approved production preflight.

## Status meanings

- **Idle:** another invocation owns the lease, or there is no command. This is normal.
- **Healthy:** identity, storage, schedule, package/schema versions, and sanitized health all agree.
- **Degraded:** the worker initialized, but a safe health code identifies a dependency or command problem.
- **Stopped:** configuration, registration, binding, reachability, or identity validation failed before work.
- **Failed:** a bounded scheduled run failed. Inspect Vercel logs by safe code; never log a credential, URL with a password, command payload, receipt body, or customer record.

## Pause and rollback

Pause the Vercel cron or remove only the worker route from a new deployment. Do not delete receipts or installation tables. A previous reviewed Vercel deployment may be restored while the additive database state remains dormant. Public website, native inquiries, and commerce continue independently.

## Launch sequence boundaries

Preview migration/deployment, Production migration/exchange/binding, package assignment, provisioning, activation, and acceptance are separate approvals. DNS, booking inquiries, commerce orders, HighLevel changes, and unrelated module activation are outside this installation workflow.
