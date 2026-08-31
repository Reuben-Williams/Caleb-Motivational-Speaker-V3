import { describe, expect, it, vi } from "vitest";

import {
  InstallationPostgresError,
  createInstallationPostgresRpcClient,
} from "./postgres-client";

describe("installation Postgres RPC client", () => {
  it("maps an approved call to fixed positional SQL", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ data: { version: 1 } }], rowCount: 1 });
    const client = createInstallationPostgresRpcClient({ query });

    await expect(client.rpc("builder_verify_site_installation_v1", {
      p_site_id: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
      p_expected_site_key: "caleb-jakes-v3",
      p_installation_id: "17a58e73-5384-4cf4-b2df-ff8097127d37",
    })).resolves.toEqual({ data: { version: 1 }, error: null });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("builder_private.builder_verify_site_installation_v1($1::uuid,$2::text,$3::uuid)"),
      [
        "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
        "caleb-jakes-v3",
        "17a58e73-5384-4cf4-b2df-ff8097127d37",
      ],
    );
  });

  it("rejects unknown calls, missing arguments, and raw database failures", async () => {
    const query = vi.fn().mockRejectedValue(new Error("postgresql://secret@host/database"));
    const client = createInstallationPostgresRpcClient({ query });

    await expect(client.rpc("not_allowed", {})).rejects.toBeInstanceOf(InstallationPostgresError);
    await expect(client.rpc("builder_verify_site_installation_v1", {})).rejects.toBeInstanceOf(
      InstallationPostgresError,
    );
    await expect(client.rpc("builder_verify_site_installation_v1", {
      p_site_id: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
      p_expected_site_key: "caleb-jakes-v3",
      p_installation_id: "17a58e73-5384-4cf4-b2df-ff8097127d37",
    })).rejects.toMatchObject({ message: "installation_postgres_operation_failed" });
  });
});
