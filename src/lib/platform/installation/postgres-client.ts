import "server-only";

import { Pool, type PoolConfig } from "pg";

import { normalizePostgresConnectionString } from "@/lib/postgres/connection-string";

interface Queryable {
  query(text: string, values?: readonly unknown[]): PromiseLike<{
    rows: Array<{ data?: unknown }>;
    rowCount?: number | null;
  }>;
}

interface RpcDefinition {
  readonly sql: string;
  readonly args: readonly string[];
}

const RPC = Object.freeze({
  builder_verify_site_installation_v1: {
    sql: "select builder_private.builder_verify_site_installation_v1($1::uuid,$2::text,$3::uuid) as data",
    args: ["p_site_id", "p_expected_site_key", "p_installation_id"],
  },
  builder_reserve_installation_command_v1: {
    sql: "select builder_private.builder_reserve_installation_command_v1($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::integer,$7::text,$8::integer) as data",
    args: ["p_site_id", "p_installation_id", "p_command_id", "p_idempotency_key", "p_command_type", "p_command_version", "p_payload_hash", "p_lease_seconds"],
  },
  builder_complete_installation_command_v1: {
    sql: "select builder_private.builder_complete_installation_command_v1($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::integer,$7::text,$8::uuid,$9::jsonb) as data",
    args: ["p_site_id", "p_installation_id", "p_command_id", "p_idempotency_key", "p_command_type", "p_command_version", "p_payload_hash", "p_lease_token", "p_result"],
  },
  builder_find_installation_command_v1: {
    sql: "select builder_private.builder_find_installation_command_v1($1::uuid,$2::uuid,$3::text) as data",
    args: ["p_site_id", "p_command_id", "p_idempotency_key"],
  },
  builder_acquire_installation_run_lease_v1: {
    sql: "select builder_private.builder_acquire_installation_run_lease_v1($1::uuid,$2::text,$3::uuid,$4::uuid,$5::integer) as data",
    args: ["p_site_id", "p_expected_site_key", "p_installation_id", "p_lease_owner", "p_lease_seconds"],
  },
  builder_renew_installation_run_lease_v1: {
    sql: "select builder_private.builder_renew_installation_run_lease_v1($1::uuid,$2::text,$3::uuid,$4::uuid,$5::bigint,$6::integer) as data",
    args: ["p_site_id", "p_expected_site_key", "p_installation_id", "p_lease_owner", "p_fencing_token", "p_lease_seconds"],
  },
  builder_release_installation_run_lease_v1: {
    sql: "select builder_private.builder_release_installation_run_lease_v1($1::uuid,$2::text,$3::uuid,$4::uuid,$5::bigint) as data",
    args: ["p_site_id", "p_expected_site_key", "p_installation_id", "p_lease_owner", "p_fencing_token"],
  },
  builder_apply_managed_growth_configuration_v1: {
    sql: "select builder_private.builder_apply_managed_growth_configuration_v1($1::uuid,$2::uuid,$3::uuid,$4::bigint,$5::uuid,$6::text,$7::text,$8::integer,$9::text) as data",
    args: ["p_site_id", "p_installation_id", "p_lease_owner", "p_fencing_token", "p_command_id", "p_module_id", "p_module_version", "p_config_version", "p_configuration"],
  },
  builder_get_installation_health_v1: {
    sql: "select builder_private.builder_get_installation_health_v1($1::uuid,$2::uuid) as data",
    args: ["p_site_id", "p_installation_id"],
  },
} satisfies Readonly<Record<string, RpcDefinition>>);

export interface InstallationPostgresRpcClient {
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: null }>;
}

export class InstallationPostgresError extends Error {
  readonly code = "installation_postgres_operation_failed";

  constructor() {
    super("installation_postgres_operation_failed");
    this.name = "InstallationPostgresError";
  }
}

function failed(): never {
  throw new InstallationPostgresError();
}

export function createInstallationPostgresRpcClient(
  queryable: Queryable,
): InstallationPostgresRpcClient {
  return {
    async rpc(name, args) {
      const definition = (RPC as Record<string, RpcDefinition>)[name];
      if (
        !definition ||
        !args ||
        Array.isArray(args) ||
        typeof args !== "object" ||
        Object.keys(args).sort().join(",") !== [...definition.args].sort().join(",")
      ) {
        return failed();
      }
      try {
        const result = await queryable.query(
          definition.sql,
          definition.args.map((key) => args[key]),
        );
        if (result.rows.length !== 1 || !("data" in result.rows[0])) return failed();
        return { data: result.rows[0].data, error: null };
      } catch (error) {
        if (error instanceof InstallationPostgresError) throw error;
        return failed();
      }
    },
  };
}

export function createInstallationPostgresPool(connectionString: string): Pool {
  let normalized: string;
  try {
    normalized = normalizePostgresConnectionString(connectionString);
  } catch {
    return failed();
  }
  if (new URL(normalized).searchParams.get("sslmode") !== "verify-full") {
    return failed();
  }
  const config: PoolConfig = {
    connectionString: normalized,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    application_name: "caleb-managed-installation-worker",
  };
  return new Pool(config);
}
