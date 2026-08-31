import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanInstallationSecrets } from "./check-installation-secrets.mjs";

const roots = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("installation secret scan", () => {
  it("accepts safe binding artifacts and rejects credential-bearing tracked files", async () => {
    const root = await mkdtemp(join(tmpdir(), "caleb-installation-secrets-"));
    roots.push(root);
    await mkdir(join(root, ".builder"));
    await writeFile(join(root, ".builder", "safe.json"), JSON.stringify({
      publicJwkSha256: "a".repeat(64),
    }));
    const syntheticCredential = ["postgresql:", "", "worker:private@production.internal/caleb"].join("/");
    await writeFile(join(root, "leak.txt"), syntheticCredential);

    expect((await scanInstallationSecrets({
      projectDir: root,
      files: [".builder/safe.json"],
    })).ok).toBe(true);
    const unsafe = await scanInstallationSecrets({ projectDir: root, files: ["leak.txt"] });
    expect(unsafe).toEqual({ ok: false, files: ["leak.txt"] });
    expect(JSON.stringify(unsafe)).not.toContain("private");
  });
});
