import "server-only";

import {
  parseExpectedSiteKey,
  parseSiteDataPlaneSiteUuid,
  type SiteDataPlaneIdentityStore,
  type SiteDataPlaneSiteUuid,
} from "@reuben-williams/next/control-plane";

import type { InstallationPostgresRpcClient } from "./postgres-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KEY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export interface InstallationBinding {
  version: 1;
  siteId: string;
  installationId: string;
  stableSiteKey: string;
  acceptedKeyId: string;
  installationManifestSha256: string;
  handlerRegistrySha256: string;
  configurationPolicySha256: string;
  publicJwkSha256: string;
  workerVersion: string;
  status: "active";
}

export interface PostgresInstallationIdentityStore extends SiteDataPlaneIdentityStore {
  getInstallationBinding(siteId: string): Promise<InstallationBinding>;
}

export class PostgresIdentityStoreError extends Error {
  readonly code = "installation_identity_mismatch";
  constructor() {
    super("installation_identity_mismatch");
    this.name = "PostgresIdentityStoreError";
  }
}

function failed(): never {
  throw new PostgresIdentityStoreError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function parseBinding(value: unknown, expected: {
  siteId: string;
  expectedSiteKey: string;
  installationId: string;
}): InstallationBinding {
  const keys = ["version", "siteId", "installationId", "stableSiteKey", "acceptedKeyId", "installationManifestSha256", "handlerRegistrySha256", "configurationPolicySha256", "publicJwkSha256", "workerVersion", "status"];
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== keys.sort().join(",") ||
    value.version !== 1 ||
    value.siteId !== expected.siteId ||
    value.installationId !== expected.installationId ||
    value.stableSiteKey !== expected.expectedSiteKey ||
    value.status !== "active" ||
    typeof value.acceptedKeyId !== "string" ||
    !KEY_ID.test(value.acceptedKeyId) ||
    typeof value.installationManifestSha256 !== "string" ||
    !SHA256.test(value.installationManifestSha256) ||
    typeof value.handlerRegistrySha256 !== "string" ||
    !SHA256.test(value.handlerRegistrySha256) ||
    typeof value.configurationPolicySha256 !== "string" ||
    !SHA256.test(value.configurationPolicySha256) ||
    typeof value.publicJwkSha256 !== "string" ||
    !SHA256.test(value.publicJwkSha256) ||
    typeof value.workerVersion !== "string" ||
    !VERSION.test(value.workerVersion)
  ) return failed();
  return value as unknown as InstallationBinding;
}

export function createPostgresInstallationIdentityStore(
  client: InstallationPostgresRpcClient,
  options: { expectedSiteKey: string; installationId: string },
): PostgresInstallationIdentityStore {
  const expectedSiteKey = parseExpectedSiteKey(options.expectedSiteKey);
  if (!UUID.test(options.installationId)) return failed();
  const installationId = options.installationId;

  async function getInstallationBinding(siteIdValue: string): Promise<InstallationBinding> {
    const siteId = parseSiteDataPlaneSiteUuid(siteIdValue) as string;
    try {
      const response = await client.rpc("builder_verify_site_installation_v1", {
        p_site_id: siteId,
        p_expected_site_key: expectedSiteKey,
        p_installation_id: installationId,
      });
      return parseBinding(response.data, { siteId, expectedSiteKey, installationId });
    } catch (error) {
      if (error instanceof PostgresIdentityStoreError) throw error;
      return failed();
    }
  }

  return {
    getInstallationBinding,
    async getSiteIdentity(siteId: SiteDataPlaneSiteUuid) {
      const binding = await getInstallationBinding(siteId);
      return {
        siteId: binding.siteId as SiteDataPlaneSiteUuid,
        siteKey: binding.stableSiteKey,
      };
    },
  };
}
