import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { installationManifestSha256 } from "@reuben-williams/entitlements/trust";

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

  it("preflights the attached editor schema and routes", async () => {
    const result = await withPreRegistrationProject(async (projectDir) => {
      const manifestPath = join(projectDir, ".builder/installation-manifest.json");
      const runtimePath = join(projectDir, ".builder/site-runtime.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifest.packages["@reuben-williams/editor"] = "0.5.0";
      manifest.packages["@reuben-williams/content"] = "0.5.0";
      manifest.schemas = { builder: 2, forms: 2, growth: 1 };
      manifest.routes = [
        "/admin/editor",
        "/admin/editor/speaking-engagements",
        "/admin/editor/website",
        "/admin/editor/preview/[[...page]]",
        "/api/builder/content",
        "/api/builder/media",
        "/api/builder/revalidation",
        "/api/builder/workers/installation",
        "/api/builder/workers/revalidation",
        "/api/site-media/[mediaId]",
      ];
      const runtime = JSON.parse(await readFile(runtimePath, "utf8"));
      runtime.installationManifestSha256 = installationManifestSha256(manifest);
      await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
      await writeFile(runtimePath, `${JSON.stringify(runtime)}\n`, "utf8");
      return runInstallationRuntimePreflight({ projectDir, env: {} });
    });

    expect(result.installationManifest?.schemas).toEqual({ builder: 2, forms: 2, growth: 1 });
    expect(result.installationManifest?.routes).toEqual([
      "/admin/editor",
      "/admin/editor/speaking-engagements",
      "/admin/editor/website",
      "/admin/editor/preview/[[...page]]",
      "/api/builder/content",
      "/api/builder/media",
      "/api/builder/revalidation",
      "/api/builder/workers/installation",
      "/api/builder/workers/revalidation",
      "/api/site-media/[mediaId]",
    ]);
  });
});
