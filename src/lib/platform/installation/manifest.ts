import "server-only";

import { ENGAGEMENT_DOMAIN_EVENT_REGISTRY_VERSION } from "@reuben-williams/core";
import {
  installationManifestSha256,
  parseInstallationManifest,
  parseSiteRuntimeMarker,
  type InstallationManifestInput,
  type SiteRuntimeMarker,
} from "@reuben-williams/entitlements/trust";
import {
  siteCommandHandlerRegistrySha256,
  type ProvisioningSiteCommandHandler,
} from "@reuben-williams/next/control-plane";

import {
  CALEB_CONFIGURATION_POLICY,
  configurationPolicySha256,
  parseCalebConfigurationPolicy,
  type CalebConfigurationPolicy,
} from "./configuration-policy";

export const CALEB_SITE_DATA_PLANE_ID = "ce607bf6-2959-4d7e-b52a-31a8d21b1db2";
export const CALEB_STABLE_SITE_KEY = "caleb-jakes-v3";
export const CALEB_WORKER_VERSION = "0.5.0";

type ProvisionalSiteRuntime = Omit<SiteRuntimeMarker, "reachabilityEvidenceRevision"> & {
  reachabilityEvidenceRevision: string | null;
};

export interface CalebInstallationArtifacts {
  installationManifest: InstallationManifestInput;
  siteRuntime: ProvisionalSiteRuntime;
  configurationPolicy: CalebConfigurationPolicy;
  configurationPolicySha256: string;
}

export class CalebInstallationArtifactError extends Error {
  constructor(public readonly code:
    | "installation_reachability_not_verified"
    | "installation_manifest_drift"
    | "installation_registry_drift"
    | "installation_policy_drift") {
    super(code);
    this.name = "CalebInstallationArtifactError";
  }
}

const HANDLER_IDENTITIES = CALEB_CONFIGURATION_POLICY.entries.map((entry) => ({
  type: entry.commandType,
  version: entry.commandVersion,
  idempotency: entry.idempotency,
  validate: (value: unknown) => value,
  execute: async () => ({
    resultCode: "NOT_EXECUTED",
    evidence: { codes: [], metrics: {}, flags: {}, digests: {} },
  }),
})) as unknown as readonly ProvisioningSiteCommandHandler<any>[];

export const CALEB_HANDLER_REGISTRY_SHA256 = siteCommandHandlerRegistrySha256(HANDLER_IDENTITIES);

export function createCalebInstallationArtifacts(input: {
  reachabilityEvidenceRevision: string | null;
}): CalebInstallationArtifacts {
  const installationManifest = parseInstallationManifest({
    version: 1,
    packages: {
      "@reuben-williams/core": "0.5.0",
      "@reuben-williams/forms": "0.5.0",
      "@reuben-williams/growth-core": "0.5.0",
      "@reuben-williams/growth-customers": "0.5.0",
      "@reuben-williams/growth-leads": "0.5.0",
      "@reuben-williams/growth-messaging": "0.5.0",
      "@reuben-williams/next": "0.5.0",
    },
    schemas: { builder: 1, forms: 2, growth: 1 },
    routes: [
      "/admin/editor",
      "/admin/editor/speaking-engagements",
      "/api/builder/workers/installation",
    ],
    workerVersion: CALEB_WORKER_VERSION,
    engagementDomainEventRegistryVersion: ENGAGEMENT_DOMAIN_EVENT_REGISTRY_VERSION,
  });
  const siteRuntime: ProvisionalSiteRuntime = {
    version: 1,
    siteDataPlaneSiteId: CALEB_SITE_DATA_PLANE_ID,
    expectedSiteKey: CALEB_STABLE_SITE_KEY,
    installationManifestSha256: installationManifestSha256(installationManifest),
    configLoaderContract: "installation-client-config-v1",
    durableStoreContract: "supabase-command-receipts-v1",
    leaseContract: "site-installation-run-lease-v1",
    leaseSeconds: 120,
    invocationTimeoutSeconds: 45,
    scheduledInvocationContract: "direct-in-process-v1",
    handlerRegistrySha256: CALEB_HANDLER_REGISTRY_SHA256,
    workerVersion: CALEB_WORKER_VERSION,
    reachabilityEvidenceRevision: input.reachabilityEvidenceRevision,
  };

  return {
    installationManifest,
    siteRuntime,
    configurationPolicy: CALEB_CONFIGURATION_POLICY,
    configurationPolicySha256: configurationPolicySha256(CALEB_CONFIGURATION_POLICY),
  };
}

export function validateCalebInstallationArtifacts(
  value: CalebInstallationArtifacts,
): CalebInstallationArtifacts & { siteRuntime: SiteRuntimeMarker } {
  const configurationPolicy = parseCalebConfigurationPolicy(value.configurationPolicy);
  if (value.siteRuntime.reachabilityEvidenceRevision === null) {
    throw new CalebInstallationArtifactError("installation_reachability_not_verified");
  }
  const installationManifest = parseInstallationManifest(value.installationManifest);
  const siteRuntime = parseSiteRuntimeMarker(value.siteRuntime);
  if (siteRuntime.installationManifestSha256 !== installationManifestSha256(installationManifest)) {
    throw new CalebInstallationArtifactError("installation_manifest_drift");
  }
  if (siteRuntime.handlerRegistrySha256 !== CALEB_HANDLER_REGISTRY_SHA256) {
    throw new CalebInstallationArtifactError("installation_registry_drift");
  }
  const observedPolicySha256 = configurationPolicySha256(configurationPolicy);
  if (value.configurationPolicySha256 !== observedPolicySha256) {
    throw new CalebInstallationArtifactError("installation_policy_drift");
  }
  return {
    installationManifest,
    siteRuntime,
    configurationPolicy,
    configurationPolicySha256: observedPolicySha256,
  };
}
