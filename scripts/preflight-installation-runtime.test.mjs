import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runInstallationRuntimePreflight } from "./preflight-installation-runtime.mjs";

async function withPreRegistrationProject(callback) {
  const projectDir = await mkdtemp(join(tmpdir(), "caleb-installation-preflight-"));
  try {
    await mkdir(join(projectDir, ".builder"), { recursive: true });
    for (const path of [
      "package.json",
      ".builder/installation-manifest.json",
      ".builder/site-runtime.json",
      ".builder/caleb-configuration-policy.json",
    ]) {
      await copyFile(resolve(process.cwd(), path), resolve(projectDir, path));
    }
    return await callback(projectDir);
  } finally {
    await rm(projectDir, { recursive: true, force: true });
  }
}

describe("managed installation preflight", () => {
  it("reports only safe blocking codes after reachability and before registration", async () => {
    const result = await withPreRegistrationProject((projectDir) =>
      runInstallationRuntimePreflight({ projectDir, env: {} }));
    expect(result.ok).toBe(false);
    expect(result.codes).toEqual(expect.arrayContaining([
      "INSTALLATION_REGISTRATION_MISSING",
      "INSTALLATION_KEY_BINDING_MISSING",
      "INSTALLATION_ENVIRONMENT_INCOMPLETE",
    ]));
    expect(result.codes).not.toContain("INSTALLATION_REACHABILITY_NOT_VERIFIED");
    expect(JSON.stringify(result)).not.toMatch(/postgresql:|"d"\s*:/i);
  });

  it("never reads an exchange token or accepts it as configuration", async () => {
    const result = await withPreRegistrationProject((projectDir) =>
      runInstallationRuntimePreflight({
        projectDir,
        env: { BUILDER_EXCHANGE_TOKEN: "must-not-be-read" },
      }));
    expect(result.environmentNames).not.toContain("BUILDER_EXCHANGE_TOKEN");
    expect(JSON.stringify(result)).not.toContain("must-not-be-read");
  });
});
