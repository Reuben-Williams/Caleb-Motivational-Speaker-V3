import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  CalebInstallationKeyBindingError,
  createCalebInstallationKeyBinding,
  parseCalebInstallationKeyBinding,
} from "./key-binding";
import { createCalebInstallationArtifacts } from "./manifest";

function privateJwk(): JsonWebKey {
  return {
    ...generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" }),
    alg: "EdDSA",
  };
}

const registration = {
  installationId: "17a58e73-5384-4cf4-b2df-ff8097127d37",
  acceptedKeyId: "caleb-key-1",
};
const boundAt = "2026-08-31T08:30:00.000Z";

describe("Caleb installation key binding", () => {
  it("binds the accepted registration to all local runtime digests", () => {
    const artifacts = createCalebInstallationArtifacts({
      reachabilityEvidenceRevision: "dpl_verified_candidate",
    });
    const value = createCalebInstallationKeyBinding({
      registration,
      privateJwk: privateJwk(),
      artifacts,
      boundAt,
    });

    expect(value).toMatchObject({
      version: 1,
      stableSiteKey: "caleb-jakes-v3",
      installationId: registration.installationId,
      acceptedKeyId: registration.acceptedKeyId,
      installationManifestSha256: artifacts.siteRuntime.installationManifestSha256,
      handlerRegistrySha256: artifacts.siteRuntime.handlerRegistrySha256,
      configurationPolicySha256: artifacts.configurationPolicySha256,
      boundAt,
    });
    expect(value.publicJwkSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(value)).not.toContain('"d"');
  });

  it("normalizes canonical UUID casing but rejects a non-canonical timestamp", () => {
    const artifacts = createCalebInstallationArtifacts({
      reachabilityEvidenceRevision: "dpl_verified_candidate",
    });
    expect(
      createCalebInstallationKeyBinding({
        registration: { ...registration, installationId: registration.installationId.toUpperCase() },
        privateJwk: privateJwk(),
        artifacts,
        boundAt,
      }).installationId,
    ).toBe(registration.installationId);

    expect(() =>
      createCalebInstallationKeyBinding({
        registration,
        privateJwk: privateJwk(),
        artifacts,
        boundAt: "2026-08-31T08:30:00Z",
      }),
    ).toThrowError(CalebInstallationKeyBindingError);
  });

  it("rejects drift, extra fields, unsafe key IDs, and private/public key mismatch", () => {
    const artifacts = createCalebInstallationArtifacts({
      reachabilityEvidenceRevision: "dpl_verified_candidate",
    });
    const key = privateJwk();
    const valid = createCalebInstallationKeyBinding({
      registration,
      privateJwk: key,
      artifacts,
      boundAt,
    });

    expect(() => parseCalebInstallationKeyBinding({ ...valid, extra: true })).toThrowError(
      CalebInstallationKeyBindingError,
    );
    expect(() =>
      createCalebInstallationKeyBinding({
        registration: { ...registration, acceptedKeyId: "unsafe key" },
        privateJwk: key,
        artifacts,
        boundAt,
      }),
    ).toThrowError(CalebInstallationKeyBindingError);
    expect(() =>
      parseCalebInstallationKeyBinding({ ...valid, handlerRegistrySha256: "0".repeat(64) }, artifacts),
    ).toThrowError(CalebInstallationKeyBindingError);

    const mismatched = privateJwk() as Record<string, unknown>;
    mismatched.x = key.x;
    expect(() =>
      createCalebInstallationKeyBinding({
        registration,
        privateJwk: mismatched,
        artifacts,
        boundAt,
      }),
    ).toThrowError(CalebInstallationKeyBindingError);
  });

  it("exposes the reviewed local-only binding generator", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.["builder:generate-installation-key-binding"]).toBe(
      "node scripts/generate-installation-key-binding.mjs",
    );
  });
});
