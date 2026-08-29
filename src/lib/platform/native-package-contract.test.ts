import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const approvedPackages = [
  "@reuben-williams/core",
  "@reuben-williams/forms",
  "@reuben-williams/growth-core",
  "@reuben-williams/growth-customers",
  "@reuben-williams/growth-leads",
  "@reuben-williams/growth-messaging",
  "@reuben-williams/next",
] as const;

describe("native inquiry package contract", () => {
  it("pins the approved direct platform packages to 0.5.0", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    for (const packageName of approvedPackages) {
      expect(packageJson.dependencies?.[packageName], packageName).toBe("0.5.0");
    }
  });

  it("does not activate commerce or internal platform packages", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const dependencies = Object.keys(packageJson.dependencies ?? {});

    expect(dependencies.some((name) => name.startsWith("@your-builder/"))).toBe(false);
    expect(dependencies).not.toContain("@reuben-williams/growth-commerce");
    expect(dependencies).not.toContain("@reuben-williams/growth-commerce-ui");
  });
});
