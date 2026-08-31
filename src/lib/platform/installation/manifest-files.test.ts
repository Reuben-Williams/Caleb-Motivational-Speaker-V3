import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createCalebInstallationArtifacts } from "./manifest";

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(process.cwd(), path), "utf8"));
}

describe("committed managed installation manifest files", () => {
  it("match the generated blocked-before-reachability artifacts", async () => {
    const expected = createCalebInstallationArtifacts({ reachabilityEvidenceRevision: null });

    expect(await json(".builder/installation-manifest.json")).toEqual(expected.installationManifest);
    expect(await json(".builder/site-runtime.json")).toEqual(expected.siteRuntime);
    expect(await json(".builder/caleb-configuration-policy.json")).toEqual(
      expected.configurationPolicy,
    );
  });

  it("provides a deterministic generator command", async () => {
    const packageJson = await json("package.json") as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.["builder:generate-installation-manifests"]).toBe(
      "node scripts/generate-installation-manifests.mjs",
    );
  });
});
