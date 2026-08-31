import { describe, expect, it, vi } from "vitest";

import {
  PostgresRunLeaseStoreError,
  createPostgresInstallationRunLeaseStore,
} from "./postgres-run-lease-store";

const identity = {
  siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2" as never,
  expectedSiteKey: "caleb-jakes-v3",
  installationId: "17a58e73-5384-4cf4-b2df-ff8097127d37",
  leaseOwner: "7710097d-c9f7-475b-8893-6781c248f582",
};
const acquired = {
  version: 1,
  acquired: true,
  siteId: identity.siteId,
  installationId: identity.installationId,
  leaseOwner: identity.leaseOwner,
  fencingToken: "7",
  leaseExpiresAt: "2026-08-31T09:02:00.000Z",
};

describe("Postgres installation run lease store", () => {
  it("acquires, renews, and releases with a fixed identity and fencing token", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: acquired, error: null })
      .mockResolvedValueOnce({ data: acquired, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const store = createPostgresInstallationRunLeaseStore({ rpc });

    await expect(store.acquire({ ...identity, leaseSeconds: 120 })).resolves.toEqual(acquired);
    await expect(store.renew({ ...identity, fencingToken: "7", leaseSeconds: 120 })).resolves.toEqual(
      acquired,
    );
    await expect(store.release({ ...identity, fencingToken: "7" })).resolves.toBe(true);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "builder_acquire_installation_run_lease_v1",
      "builder_renew_installation_run_lease_v1",
      "builder_release_installation_run_lease_v1",
    ]);
  });

  it("rejects a cross-site or malformed result", async () => {
    const store = createPostgresInstallationRunLeaseStore({
      rpc: vi.fn().mockResolvedValue({
        data: { ...acquired, siteId: "37f36e13-1b43-4f01-b51a-46dbdf749783" },
        error: null,
      }),
    });
    await expect(store.acquire({ ...identity, leaseSeconds: 120 })).rejects.toBeInstanceOf(
      PostgresRunLeaseStoreError,
    );
  });
});
