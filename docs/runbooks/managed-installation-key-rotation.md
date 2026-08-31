# Managed installation key rotation

Rotation is a maintenance-window operation. Do not run installation commands while the binding is drifting.

1. Verify the current active installation ID, key ID, public-JWK digest, manifest digest, handler digest, and policy digest.
2. Use the operator-only compare-and-set to change `active` to `rotation_pending`. Worker wakes must now fail closed.
3. Copy the old private JWK only to `.builder/secrets/rotation-backup/<old-key-id>.jwk` with exclusive ownership. Confirm its public digest equals the current safe binding. Never print or commit it.
4. Use the published CLI rotation command to register the new key during the approved overlap.
5. Regenerate and review the safe registration and key-binding artifacts. They must contain no private `d` value.
6. Stage the new key with the operator-only compare-and-set while every expected old value still matches.
7. Save the new private JWK in the correctly scoped Vercel environment, deploy, and verify the protected route and signed health.
8. Activate the exact staged key, returning `rotation_pending` to `active`.
9. After the overlap and verification window, remove the old Vercel value and local backup using an explicitly approved, ownership-checked deletion.

If rotation fails before overlap expiry, restore the old key/digest with the named operator compare-and-set, restore the prior Vercel value/deployment, and return the binding to `active`. Preserve receipts and customer data. After overlap expiry, do not restore an expired key; finish the new binding or perform a newly authorized registration.
