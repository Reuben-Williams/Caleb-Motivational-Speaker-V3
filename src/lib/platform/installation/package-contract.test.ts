import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const runtimePackages = [
  "@reuben-williams/core",
  "@reuben-williams/forms",
  "@reuben-williams/growth-core",
  "@reuben-williams/growth-customers",
  "@reuben-williams/growth-leads",
  "@reuben-williams/growth-messaging",
  "@reuben-williams/next",
] as const;

describe("managed installation package contract", () => {
  it("pins the exact published client package set", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    for (const packageName of runtimePackages) {
      expect(packageJson.dependencies?.[packageName], packageName).toBe("0.5.0");
    }
    expect(packageJson.devDependencies?.["@reuben-williams/cli"]).toBe("0.5.0");

    const directPlatformPackages = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ].filter((name) => name.startsWith("@reuben-williams/") || name.startsWith("@your-builder/"));

    expect(directPlatformPackages.filter((name) => name.startsWith("@your-builder/"))).toEqual([]);
    expect(directPlatformPackages.filter((name) => name.startsWith("@reuben-williams/"))).toEqual(
      [...runtimePackages, "@reuben-williams/cli"],
    );
  });

  it("keeps installation credentials and setup state out of Git", async () => {
    const gitignore = await readFile(join(process.cwd(), ".gitignore"), "utf8");

    expect(gitignore).toContain(".builder/secrets/");
    expect(gitignore).toContain(".builder/setup-lock.json");
    expect(gitignore).toContain(".builder/setup-journal.json");
    expect(gitignore).toContain(".builder/installation-registration.pending.json");
    expect(gitignore).toContain(".builder/*.tmp");
  });

  it("documents runtime variables without treating the exchange token as configuration", async () => {
    const envExample = await readFile(join(process.cwd(), ".env.example"), "utf8");

    expect(envExample).toContain("BUILDER_CONTROL_PLANE_URL=");
    expect(envExample).toContain("BUILDER_INSTALLATION_ID=");
    expect(envExample).toContain("BUILDER_INSTALLATION_KEY_ID=");
    expect(envExample).toContain("BUILDER_INSTALLATION_PRIVATE_JWK=");
    expect(envExample).toContain("BUILDER_DATABASE_URL=");
    expect(envExample).not.toContain("BUILDER_EXCHANGE_TOKEN=");
  });
});
