import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CalebInstallationConfigError, parseCalebInstallationConfig } from "./config";

function validEnv(): Record<string, string> {
  const jwk = {
    ...generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" }),
    alg: "EdDSA",
  };
  return {
    BUILDER_CONTROL_PLANE_URL: "https://site-editor-control-plane.vercel.app",
    BUILDER_INSTALLATION_ID: "17a58e73-5384-4cf4-b2df-ff8097127d37",
    BUILDER_INSTALLATION_KEY_ID: "caleb-key-1",
    BUILDER_INSTALLATION_PRIVATE_JWK: JSON.stringify(jwk),
    BUILDER_DATABASE_URL: "postgresql://worker:secret@ep-example.neon.tech/caleb?sslmode=require",
  };
}

describe("Caleb installation configuration", () => {
  it("parses the exact control-plane identity and private worker database", () => {
    expect(parseCalebInstallationConfig(validEnv())).toMatchObject({
      client: {
        controlPlaneUrl: "https://site-editor-control-plane.vercel.app",
        installationId: "17a58e73-5384-4cf4-b2df-ff8097127d37",
        keyId: "caleb-key-1",
      },
      databaseUrl: expect.stringMatching(
        /ep-example\.neon\.tech\/caleb\?sslmode=verify-full/,
      ),
    });
  });

  it("fails closed without exposing a missing or malformed value", () => {
    for (const mutate of [
      (env: Record<string, string>) => delete env.BUILDER_DATABASE_URL,
      (env: Record<string, string>) => { env.BUILDER_CONTROL_PLANE_URL = "https://example.com"; },
      (env: Record<string, string>) => { env.BUILDER_CONTROL_PLANE_URL = "https://control-staging.saveyour.app"; },
      (env: Record<string, string>) => { env.BUILDER_INSTALLATION_PRIVATE_JWK = "secret"; },
    ]) {
      const env = validEnv();
      mutate(env);
      expect(() => parseCalebInstallationConfig(env)).toThrowError(CalebInstallationConfigError);
    }
  });
});
