import { describe, expect, it } from "vitest";

import { installationManifestSha256 } from "@reuben-williams/entitlements/trust";

import {
  CALEB_SITE_DATA_PLANE_ID,
  createCalebInstallationArtifacts,
  validateCalebInstallationArtifacts,
} from "./manifest";

describe("Caleb managed installation manifests", () => {
  it("reports only the directly used published 0.5.0 packages", () => {
    const { installationManifest } = createCalebInstallationArtifacts({
      reachabilityEvidenceRevision: null,
    });

    expect(installationManifest.packages).toEqual({
      "@reuben-williams/core": "0.5.0",
      "@reuben-williams/forms": "0.5.0",
      "@reuben-williams/growth-core": "0.5.0",
      "@reuben-williams/growth-customers": "0.5.0",
      "@reuben-williams/growth-leads": "0.5.0",
      "@reuben-williams/growth-messaging": "0.5.0",
      "@reuben-williams/next": "0.5.0",
    });
    expect(installationManifest.schemas).toEqual({ builder: 1, forms: 2, growth: 1 });
    expect(installationManifest.workerVersion).toBe("0.5.0");
  });

  it("binds site identity, runtime bounds, manifest, registry, and policy digests", () => {
    const artifacts = createCalebInstallationArtifacts({
      reachabilityEvidenceRevision: "dpl_candidate123",
    });
    const validated = validateCalebInstallationArtifacts(artifacts);

    expect(validated.siteRuntime.siteDataPlaneSiteId).toBe(CALEB_SITE_DATA_PLANE_ID);
    expect(validated.siteRuntime.expectedSiteKey).toBe("caleb-jakes-v3");
    expect(validated.siteRuntime.installationManifestSha256).toBe(
      installationManifestSha256(validated.installationManifest),
    );
    expect(validated.siteRuntime.leaseSeconds).toBe(120);
    expect(validated.siteRuntime.invocationTimeoutSeconds).toBe(45);
    expect(validated.configurationPolicySha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed before immutable reachability evidence exists", () => {
    const artifacts = createCalebInstallationArtifacts({
      reachabilityEvidenceRevision: null,
    });

    expect(() => validateCalebInstallationArtifacts(artifacts)).toThrow(
      "installation_reachability_not_verified",
    );
  });

  it("rejects manifest and policy drift", () => {
    const artifacts = createCalebInstallationArtifacts({
      reachabilityEvidenceRevision: "dpl_candidate123",
    });
    expect(() => validateCalebInstallationArtifacts({
      ...artifacts,
      installationManifest: {
        ...artifacts.installationManifest,
        routes: [...artifacts.installationManifest.routes, "/unexpected"],
      },
    })).toThrow("installation_manifest_drift");
    expect(() => validateCalebInstallationArtifacts({
      ...artifacts,
      configurationPolicy: {
        ...artifacts.configurationPolicy,
        entries: artifacts.configurationPolicy.entries.slice(0, 2),
      },
    })).toThrow("invalid_caleb_configuration_policy");
  });
});
