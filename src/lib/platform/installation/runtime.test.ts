import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { createCalebInstallationKeyBinding } from "./key-binding";
import { createCalebInstallationArtifacts } from "./manifest";
import { CalebInstallationRuntimeError, createCalebInstallationRuntime } from "./runtime";

function fixture() {
  const privateJwk = {
    ...generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" }),
    alg: "EdDSA",
  };
  const artifacts = createCalebInstallationArtifacts({
    reachabilityEvidenceRevision: "dpl_verified_candidate",
  });
  const registration = {
    version: 1,
    controlPlaneUrl: "https://site-editor-control-plane.vercel.app",
    stableSiteKey: "caleb-jakes-v3",
    publicUrl: "https://calebjakes.com",
    registeredAt: "2026-08-31T09:00:00.000Z",
    installationId: "17a58e73-5384-4cf4-b2df-ff8097127d37",
    acceptedKeyId: "caleb-key-1",
    publicSigningKeys: [],
    endpoints: {
      pullCommands: "/api/platform/v1/installations/commands/pull",
      submitCommandResult: "/api/platform/v1/installations/commands/{commandId}/result",
      reportHealth: "/api/platform/v1/installations/health",
      rotateCredential: "/api/platform/v1/installations/credentials/rotate",
    },
  };
  const binding = createCalebInstallationKeyBinding({
    registration,
    privateJwk,
    artifacts,
    boundAt: "2026-08-31T09:01:00.000Z",
  });
  const env = {
    BUILDER_CONTROL_PLANE_URL: registration.controlPlaneUrl,
    BUILDER_INSTALLATION_ID: registration.installationId,
    BUILDER_INSTALLATION_KEY_ID: registration.acceptedKeyId,
    BUILDER_INSTALLATION_PRIVATE_JWK: JSON.stringify(privateJwk),
    BUILDER_DATABASE_URL: "postgresql://worker:secret@ep-example.neon.tech/caleb?sslmode=require",
  };
  return { artifacts, registration, binding, env };
}

describe("Caleb embedded installation runtime", () => {
  it("composes the runtime only when environment, registration, binding, and manifests agree", () => {
    const values = fixture();
    const runtime = createCalebInstallationRuntime({
      ...values,
      postgresClient: { rpc: vi.fn() },
      installationClientFactory: () => ({
        pullCommands: vi.fn().mockResolvedValue([]),
        acknowledgeResult: vi.fn(),
        reportHealth: vi.fn(),
      }),
    });
    expect(runtime).toHaveProperty("runScheduled");
  });

  it("fails closed for key, identity, digest, or reachability drift", () => {
    const values = fixture();
    for (const mutation of [
      { ...values, env: { ...values.env, BUILDER_INSTALLATION_KEY_ID: "other-key" } },
      { ...values, binding: { ...values.binding, handlerRegistrySha256: "0".repeat(64) } },
      { ...values, artifacts: createCalebInstallationArtifacts({ reachabilityEvidenceRevision: null }) },
    ]) {
      expect(() => createCalebInstallationRuntime({
        ...mutation,
        postgresClient: { rpc: vi.fn() },
        installationClientFactory: () => ({
          pullCommands: vi.fn().mockResolvedValue([]),
          acknowledgeResult: vi.fn(),
          reportHealth: vi.fn(),
        }),
      })).toThrowError(CalebInstallationRuntimeError);
    }
  });

  it("runs one bounded idle cycle and reports sanitized health", async () => {
    const values = fixture();
    const pullCommands = vi.fn().mockResolvedValue([]);
    const reportHealth = vi.fn().mockResolvedValue(undefined);
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "builder_verify_site_installation_v1") {
        return { data: {
          version: 1,
          siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
          installationId: values.registration.installationId,
          stableSiteKey: "caleb-jakes-v3",
          acceptedKeyId: values.binding.acceptedKeyId,
          installationManifestSha256: values.binding.installationManifestSha256,
          handlerRegistrySha256: values.binding.handlerRegistrySha256,
          configurationPolicySha256: values.binding.configurationPolicySha256,
          publicJwkSha256: values.binding.publicJwkSha256,
          workerVersion: "0.5.0",
          status: "active",
        }, error: null };
      }
      if (name === "builder_acquire_installation_run_lease_v1" ||
          name === "builder_renew_installation_run_lease_v1") {
        return { data: {
          version: 1,
          acquired: true,
          siteId: args.p_site_id,
          installationId: args.p_installation_id,
          leaseOwner: args.p_lease_owner,
          fencingToken: "1",
          leaseExpiresAt: "2026-08-31T09:02:00.000Z",
        }, error: null };
      }
      if (name === "builder_get_installation_health_v1") {
        return { data: {
          version: 1,
          status: "active",
          workerVersion: "0.5.0",
          pendingReceipts: "0",
          configuredModules: "0",
          queues: [],
          integrations: [],
        }, error: null };
      }
      if (name === "builder_release_installation_run_lease_v1") {
        return { data: true, error: null };
      }
      throw new Error("unexpected rpc");
    });
    const runtime = createCalebInstallationRuntime({
      ...values,
      postgresClient: { rpc },
      now: () => new Date("2026-08-31T09:00:00.000Z"),
      installationClientFactory: () => ({
        pullCommands,
        acknowledgeResult: vi.fn(),
        reportHealth,
      }),
    });

    await expect(runtime.runScheduled()).resolves.toEqual({
      pulled: 0,
      acknowledged: 0,
      healthReported: true,
    });
    expect(pullCommands).toHaveBeenCalledWith({ limit: 1, leaseSeconds: 60 });
    expect(reportHealth).toHaveBeenCalledWith(expect.objectContaining({
      worker: { status: "healthy", version: "0.5.0" },
      queues: {},
      integrations: {},
    }));
  });
});
