import "server-only";

import type {
  GrowthConfigurationAdapter,
  GrowthConfigurationUpsertInput,
} from "@reuben-williams/next/control-plane";

import { CALEB_CONFIGURATION_POLICY } from "./configuration-policy";
import type { InstallationPostgresRpcClient } from "./postgres-client";

export class PostgresGrowthConfigurationError extends Error {
  readonly code = "managed_growth_configuration_failed";
  constructor() {
    super("managed_growth_configuration_failed");
    this.name = "PostgresGrowthConfigurationError";
  }
}

function failed(): never {
  throw new PostgresGrowthConfigurationError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function throwAbort(signal: AbortSignal): never {
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error("Managed Growth configuration aborted");
}

function assertApproved(input: GrowthConfigurationUpsertInput): void {
  if (
    !CALEB_CONFIGURATION_POLICY.entries.some((entry) =>
      entry.moduleId === input.moduleId &&
      entry.moduleVersion === input.moduleVersion &&
      String(entry.configVersion) === input.configVersion &&
      entry.configuration === input.configuration)
  ) return failed();
}

export function createPostgresGrowthConfigurationAdapter(
  client: InstallationPostgresRpcClient,
): GrowthConfigurationAdapter {
  return {
    async upsertConfiguration(input) {
      if (input.signal.aborted) return throwAbort(input.signal);
      assertApproved(input);
      let data: unknown;
      try {
        data = (await client.rpc("builder_apply_managed_growth_configuration_v1", {
          p_site_id: input.lease.siteId,
          p_installation_id: input.lease.installationId,
          p_lease_owner: input.lease.leaseOwner,
          p_fencing_token: input.lease.fencingToken,
          p_command_id: input.commandId,
          p_module_id: input.moduleId,
          p_module_version: input.moduleVersion,
          p_config_version: Number(input.configVersion),
          p_configuration: input.configuration,
        })).data;
      } catch {
        if (input.signal.aborted) return throwAbort(input.signal);
        return failed();
      }
      if (input.signal.aborted) return throwAbort(input.signal);
      if (
        !isRecord(data) ||
        Object.keys(data).sort().join(",") !==
          "configVersion,configuration,moduleId,moduleVersion" ||
        data.moduleId !== input.moduleId ||
        data.moduleVersion !== input.moduleVersion ||
        data.configVersion !== input.configVersion ||
        data.configuration !== input.configuration
      ) return failed();
      return data;
    },
  };
}
