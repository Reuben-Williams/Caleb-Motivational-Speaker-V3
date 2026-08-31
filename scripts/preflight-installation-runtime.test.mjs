import { describe, expect, it } from "vitest";

import { runInstallationRuntimePreflight } from "./preflight-installation-runtime.mjs";

describe("managed installation preflight", () => {
  it("reports only safe blocking codes before registration or token use", async () => {
    const result = await runInstallationRuntimePreflight({
      projectDir: process.cwd(),
      env: {},
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toEqual(expect.arrayContaining([
      "INSTALLATION_REACHABILITY_NOT_VERIFIED",
      "INSTALLATION_REGISTRATION_MISSING",
      "INSTALLATION_KEY_BINDING_MISSING",
      "INSTALLATION_ENVIRONMENT_INCOMPLETE",
    ]));
    expect(JSON.stringify(result)).not.toMatch(/postgresql:|"d"\s*:/i);
  });

  it("never reads an exchange token or accepts it as configuration", async () => {
    const result = await runInstallationRuntimePreflight({
      projectDir: process.cwd(),
      env: { BUILDER_EXCHANGE_TOKEN: "must-not-be-read" },
    });
    expect(result.environmentNames).not.toContain("BUILDER_EXCHANGE_TOKEN");
    expect(JSON.stringify(result)).not.toContain("must-not-be-read");
  });
});
