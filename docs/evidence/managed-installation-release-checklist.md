# Managed installation release checklist

No item is implied by another. Record safe identifiers and digests only.

- [ ] Exact `@reuben-williams/*@0.5.0` package contract passes.
- [ ] Migration `0013` checksum and isolated PostgreSQL contracts pass.
- [ ] Worker role cannot bind, rotate, mutate tables directly, or cross site boundaries.
- [ ] Installation manifest, runtime marker, configuration policy, registration, and key binding agree.
- [ ] Reachability revision names the verified immutable candidate deployment.
- [ ] Tracked-source and build-output secret scans pass.
- [ ] Protected worker route rejects wrong method, token, query, and body and always sends `private, no-store`.
- [ ] One-command, lease, timeout, receipt replay, fencing, and sanitized health tests pass.
- [ ] Public desktop/mobile pages, native booking without submission, staff editor, inquiry workers, retention worker, and Stripe test-only boundary pass.
- [ ] Preview database target, backup, migration, deployment, and route evidence are approved and recorded.
- [ ] Production recovery branch, database target, migration, exchange, binding, deployment, and first signed health are separately approved and recorded.
- [ ] Package assignment, provisioning, activation, and acceptance are separately approved and recorded.
- [ ] Rollback preserves receipts, installation state, and customer data.
- [ ] No DNS change, inquiry, order, HighLevel mutation, new package publication, or unrelated activation occurred.
