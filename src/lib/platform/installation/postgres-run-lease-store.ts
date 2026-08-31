import "server-only";

import {
  parseExpectedSiteKey,
  parseFencingToken,
  parseSiteDataPlaneSiteUuid,
  type RunLeaseIdentity,
  type RunLeaseResult,
  type SiteInstallationRunLeaseStore,
} from "@reuben-williams/next/control-plane";

import type { InstallationPostgresRpcClient } from "./postgres-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PostgresRunLeaseStoreError extends Error {
  readonly code = "installation_run_lease_store_failed";
  constructor() {
    super("installation_run_lease_store_failed");
    this.name = "PostgresRunLeaseStoreError";
  }
}

function failed(): never {
  throw new PostgresRunLeaseStoreError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function identity(input: RunLeaseIdentity): RunLeaseIdentity {
  if (!UUID.test(input.installationId) || !UUID.test(input.leaseOwner)) return failed();
  return {
    siteId: parseSiteDataPlaneSiteUuid(input.siteId),
    expectedSiteKey: parseExpectedSiteKey(input.expectedSiteKey),
    installationId: input.installationId.toLowerCase(),
    leaseOwner: input.leaseOwner.toLowerCase(),
  };
}

function leaseSeconds(value: number): number {
  if (!Number.isSafeInteger(value) || value < 60 || value > 300) return failed();
  return value;
}

function result(value: unknown, expected: RunLeaseIdentity): RunLeaseResult {
  const keys = ["version", "acquired", "siteId", "installationId", "leaseOwner", "fencingToken", "leaseExpiresAt"];
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== keys.sort().join(",") ||
    value.version !== 1 ||
    typeof value.acquired !== "boolean" ||
    value.siteId !== expected.siteId ||
    value.installationId !== expected.installationId
  ) return failed();
  if (!value.acquired) {
    if (value.leaseOwner !== null || value.fencingToken !== null || value.leaseExpiresAt !== null) {
      return failed();
    }
    return { version: 1, acquired: false, siteId: expected.siteId, installationId: expected.installationId, leaseOwner: null, fencingToken: null, leaseExpiresAt: null };
  }
  if (
    value.leaseOwner !== expected.leaseOwner ||
    typeof value.leaseExpiresAt !== "string" ||
    !Number.isFinite(Date.parse(value.leaseExpiresAt))
  ) return failed();
  return {
    version: 1,
    acquired: true,
    siteId: expected.siteId,
    installationId: expected.installationId,
    leaseOwner: expected.leaseOwner,
    fencingToken: parseFencingToken(value.fencingToken),
    leaseExpiresAt: value.leaseExpiresAt,
  };
}

async function call(client: InstallationPostgresRpcClient, name: string, args: Record<string, unknown>) {
  try {
    return (await client.rpc(name, args)).data;
  } catch (error) {
    if (error instanceof PostgresRunLeaseStoreError) throw error;
    return failed();
  }
}

export function createPostgresInstallationRunLeaseStore(
  client: InstallationPostgresRpcClient,
): SiteInstallationRunLeaseStore {
  return {
    async acquire(input) {
      const fixed = identity(input);
      return result(await call(client, "builder_acquire_installation_run_lease_v1", {
        p_site_id: fixed.siteId,
        p_expected_site_key: fixed.expectedSiteKey,
        p_installation_id: fixed.installationId,
        p_lease_owner: fixed.leaseOwner,
        p_lease_seconds: leaseSeconds(input.leaseSeconds),
      }), fixed);
    },
    async renew(input) {
      const fixed = identity(input);
      return result(await call(client, "builder_renew_installation_run_lease_v1", {
        p_site_id: fixed.siteId,
        p_expected_site_key: fixed.expectedSiteKey,
        p_installation_id: fixed.installationId,
        p_lease_owner: fixed.leaseOwner,
        p_fencing_token: parseFencingToken(input.fencingToken),
        p_lease_seconds: leaseSeconds(input.leaseSeconds),
      }), fixed);
    },
    async release(input) {
      const fixed = identity(input);
      const value = await call(client, "builder_release_installation_run_lease_v1", {
        p_site_id: fixed.siteId,
        p_expected_site_key: fixed.expectedSiteKey,
        p_installation_id: fixed.installationId,
        p_lease_owner: fixed.leaseOwner,
        p_fencing_token: parseFencingToken(input.fencingToken),
      });
      if (typeof value !== "boolean") return failed();
      return value;
    },
  };
}
