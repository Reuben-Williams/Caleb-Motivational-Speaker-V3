// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createCalebInstallationArtifacts } from "../src/lib/platform/installation/manifest";
import { createCalebInstallationKeyBinding } from "../src/lib/platform/installation/key-binding";

const exec = promisify(execFile);

async function withProject(run: (fixture: {
  root: string; previous: ReturnType<typeof createCalebInstallationKeyBinding>;
  current: ReturnType<typeof createCalebInstallationKeyBinding>;
}) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "caleb-binding-generator-"));
  try {
    await mkdir(join(root, "scripts"));
    await mkdir(join(root, ".builder", "secrets"), { recursive: true });
    for (const directory of ["node_modules", "src", "tests"]) {
      await symlink(resolve(directory), join(root, directory), "junction");
    }
    await copyFile("scripts/generate-installation-key-binding.mjs", join(root, "scripts", "generate-installation-key-binding.mjs"));
    const privateJwk = { ...generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" }), alg: "EdDSA" };
    const registration = { installationId: "17a58e73-5384-4cf4-b2df-ff8097127d37", acceptedKeyId: "caleb-key-1" };
    const artifacts = createCalebInstallationArtifacts({ reachabilityEvidenceRevision: "dpl_verified_candidate" });
    const current = createCalebInstallationKeyBinding({ registration, privateJwk, artifacts, boundAt: "2026-09-01T00:00:00.000Z" });
    const previous = { ...current, installationManifestSha256: "1".repeat(64) };
    const documents = {
      "installation-registration.json": registration,
      "secrets/installation-private.jwk": privateJwk,
      "installation-manifest.json": artifacts.installationManifest,
      "site-runtime.json": artifacts.siteRuntime,
      "caleb-configuration-policy.json": artifacts.configurationPolicy,
      "installation-key-binding.json": previous,
    };
    for (const [name, value] of Object.entries(documents)) {
      await writeFile(join(root, ".builder", name), JSON.stringify(value));
    }
    await run({ root, previous, current });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const generate = (root: string, args: string[] = []) => exec(process.execPath,
  [join(root, "scripts", "generate-installation-key-binding.mjs"), ...args], { cwd: root });
const readBinding = async (root: string) => JSON.parse(await readFile(join(root, ".builder", "installation-key-binding.json"), "utf8"));

describe("installation key binding generator", () => {
  it("requires explicit refresh to replace an existing artifact", async () => withProject(async ({ root, previous }) => {
    await expect(generate(root)).rejects.toThrow();
    expect(await readBinding(root)).toEqual(previous);
  }));

  it("refreshes using the expected prior digest without changing identity or timestamp", async () => withProject(async ({ root, previous, current }) => {
    await generate(root, ["--refresh", "--expected-manifest-sha256", previous.installationManifestSha256]);
    expect(await readBinding(root)).toEqual(current);
  }));

  it("leaves existing bytes untouched if the expected digest is stale", async () => withProject(async ({ root, previous }) => {
    await expect(generate(root, ["--refresh", "--expected-manifest-sha256", "2".repeat(64)])).rejects.toThrow();
    expect(await readBinding(root)).toEqual(previous);
  }));

  it("refuses identity changes during explicit refresh", async () => withProject(async ({ root, previous }) => {
    const changed = { ...previous, acceptedKeyId: "other-key" };
    await writeFile(join(root, ".builder", "installation-key-binding.json"), JSON.stringify(changed));
    await expect(generate(root, ["--refresh", "--expected-manifest-sha256", previous.installationManifestSha256])).rejects.toThrow();
    expect(await readBinding(root)).toEqual(changed);
  }));
});
