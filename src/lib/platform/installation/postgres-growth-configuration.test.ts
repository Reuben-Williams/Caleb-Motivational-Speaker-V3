import { describe, expect, it, vi } from "vitest";

import {
  PostgresGrowthConfigurationError,
  createPostgresGrowthConfigurationAdapter,
} from "./postgres-growth-configuration";

const input = {
  commandId: "1cfa3d0a-c9c9-4781-88b8-a41574929306",
  moduleId: "growth.customers",
  moduleVersion: "1.1.1",
  configVersion: "1",
  configuration: "caleb-speaking-engagements-v1",
  signal: new AbortController().signal,
  lease: {
    siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
    installationId: "17a58e73-5384-4cf4-b2df-ff8097127d37",
    leaseOwner: "7710097d-c9f7-475b-8893-6781c248f582",
    fencingToken: "7",
    leaseExpiresAt: "2026-08-31T09:02:00.000Z",
  },
};

describe("Postgres managed Growth configuration adapter", () => {
  it("persists only Caleb's disabled-by-default approved configuration", async () => {
    const result = {
      moduleId: input.moduleId,
      moduleVersion: input.moduleVersion,
      configVersion: input.configVersion,
      configuration: input.configuration,
    };
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const adapter = createPostgresGrowthConfigurationAdapter({ rpc });
    await expect(adapter.upsertConfiguration(input)).resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledWith("builder_apply_managed_growth_configuration_v1", {
      p_site_id: input.lease.siteId,
      p_installation_id: input.lease.installationId,
      p_lease_owner: input.lease.leaseOwner,
      p_fencing_token: input.lease.fencingToken,
      p_command_id: input.commandId,
      p_module_id: input.moduleId,
      p_module_version: input.moduleVersion,
      p_config_version: 1,
      p_configuration: input.configuration,
    });
  });

  it("rejects modules outside the committed Caleb policy before database access", async () => {
    const rpc = vi.fn();
    const adapter = createPostgresGrowthConfigurationAdapter({ rpc });
    await expect(adapter.upsertConfiguration({
      ...input,
      moduleId: "growth.dashboard",
      moduleVersion: "2.1.0",
    })).rejects.toBeInstanceOf(PostgresGrowthConfigurationError);
    expect(rpc).not.toHaveBeenCalled();
  });
});
