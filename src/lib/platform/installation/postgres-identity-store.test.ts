import { describe, expect, it, vi } from "vitest";

import {
  PostgresIdentityStoreError,
  createPostgresInstallationIdentityStore,
} from "./postgres-identity-store";

const siteId = "ce607bf6-2959-4d7e-b52a-31a8d21b1db2";
const installationId = "17a58e73-5384-4cf4-b2df-ff8097127d37";
const binding = {
  version: 1,
  siteId,
  installationId,
  stableSiteKey: "caleb-jakes-v3",
  acceptedKeyId: "caleb-key-1",
  installationManifestSha256: "1".repeat(64),
  handlerRegistrySha256: "2".repeat(64),
  configurationPolicySha256: "3".repeat(64),
  publicJwkSha256: "4".repeat(64),
  workerVersion: "0.5.0",
  status: "active",
};

describe("Postgres installation identity store", () => {
  it("returns only the fixed site identity and validated binding", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: binding, error: null });
    const store = createPostgresInstallationIdentityStore({ rpc }, {
      expectedSiteKey: "caleb-jakes-v3",
      installationId,
    });

    await expect(store.getSiteIdentity(siteId as never)).resolves.toEqual({
      siteId,
      siteKey: "caleb-jakes-v3",
    });
    await expect(store.getInstallationBinding(siteId)).resolves.toEqual(binding);
    expect(rpc).toHaveBeenCalledWith("builder_verify_site_installation_v1", {
      p_site_id: siteId,
      p_expected_site_key: "caleb-jakes-v3",
      p_installation_id: installationId,
    });
  });

  it("fails closed for wrong-site data, inactive binding, null, or RPC errors", async () => {
    for (const data of [
      null,
      { ...binding, siteId: "37f36e13-1b43-4f01-b51a-46dbdf749783" },
      { ...binding, status: "rotation_pending" },
    ]) {
      const store = createPostgresInstallationIdentityStore(
        { rpc: vi.fn().mockResolvedValue({ data, error: null }) },
        { expectedSiteKey: "caleb-jakes-v3", installationId },
      );
      await expect(store.getInstallationBinding(siteId)).rejects.toBeInstanceOf(
        PostgresIdentityStoreError,
      );
    }
  });
});
