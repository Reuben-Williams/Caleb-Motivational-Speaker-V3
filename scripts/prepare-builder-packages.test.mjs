import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { prepareBuilderPackages } from "./prepare-builder-packages.mjs";

const temporaryRoots = [];

function fixture(version = "0.5.0") {
  const root = mkdtempSync(join(tmpdir(), "builder-packages-"));
  temporaryRoots.push(root);
  const packageRoot = join(root, "next");
  mkdirSync(join(packageRoot, "src"), { recursive: true });
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ version }));
  writeFileSync(join(packageRoot, "src", "helper.ts"), "export const value = 1;\n");
  writeFileSync(join(packageRoot, "src", "index.ts"), 'export * from "./helper.js";\n');
  return { root, index: join(packageRoot, "src", "index.ts") };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("builder package preparation", () => {
  it("maps missing JavaScript specifiers to the shipped TypeScript source", () => {
    const { root, index } = fixture();

    expect(prepareBuilderPackages(root)).toEqual({
      packageCount: 1,
      replacementCount: 1,
    });
    expect(readFileSync(index, "utf8")).toContain('"./helper.ts"');
    expect(prepareBuilderPackages(root).replacementCount).toBe(0);
  });

  it("fails closed if an unexpected package version is installed", () => {
    const { root } = fixture("0.5.1");

    expect(() => prepareBuilderPackages(root)).toThrow("expected 0.5.0");
  });
});
