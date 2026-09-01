import { describe, expect, it } from "vitest";

import {
  CalebInstallationRegistrationError,
  parseCalebInstallationRegistration,
} from "./registration";

const valid = {
  version: 1,
  controlPlaneUrl: "https://site-editor-control-plane.vercel.app",
  stableSiteKey: "caleb-jakes-v3",
  publicUrl: "https://calebjakes.com",
  registeredAt: "2026-09-01T02:18:40.551757Z",
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

describe("accepted Caleb installation registration", () => {
  it("accepts only the expected site, URLs, and endpoint paths", () => {
    expect(parseCalebInstallationRegistration(valid)).toEqual(valid);
  });

  it("rejects endpoint, identity, timestamp, and unknown-field drift", () => {
    for (const value of [
      { ...valid, stableSiteKey: "another-site" },
      { ...valid, controlPlaneUrl: "https://control-staging.saveyour.app" },
      { ...valid, publicUrl: "https://calebjakes.com/" },
      { ...valid, registeredAt: "2026-08-31T09:00:00Z" },
      { ...valid, endpoints: { ...valid.endpoints, pullCommands: "/other" } },
      { ...valid, extra: true },
    ]) {
      expect(() => parseCalebInstallationRegistration(value)).toThrowError(
        CalebInstallationRegistrationError,
      );
    }
  });
});
