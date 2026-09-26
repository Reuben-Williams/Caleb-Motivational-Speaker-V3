import { randomUUID } from "node:crypto";
import { open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function readOptions(args) {
  if (args.length === 0) return { boundAt: new Date().toISOString() };
  if (args.length === 2 && args[0] === "--bound-at") return { boundAt: args[1] };
  if (args.length === 3 && args[0] === "--refresh" &&
      args[1] === "--expected-manifest-sha256" && /^[a-f0-9]{64}$/.test(args[2])) {
    return { expectedManifestSha256: args[2] };
  }
  throw new Error(
    "Usage: npm run builder:generate-installation-key-binding -- [--bound-at <canonical-UTC-instant> | --refresh --expected-manifest-sha256 <prior-sha256>]",
  );
}

async function readJson(relativePath) {
  const text = await readFile(resolve(projectRoot, relativePath), "utf8");
  if (Buffer.byteLength(text, "utf8") > 32_768) throw new Error("Binding input is too large.");
  return JSON.parse(text);
}

const options = readOptions(process.argv.slice(2));
const vite = await createServer({
  root: projectRoot,
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
  resolve: {
    alias: {
      "server-only": resolve(projectRoot, "tests/server-only.ts"),
    },
  },
});

try {
  const [{ createCalebInstallationKeyBinding, refreshCalebInstallationKeyBinding }, { configurationPolicySha256 }] =
    await Promise.all([
      vite.ssrLoadModule("/src/lib/platform/installation/key-binding.ts"),
      vite.ssrLoadModule("/src/lib/platform/installation/configuration-policy.ts"),
    ]);
  const [registration, privateJwk, installationManifest, siteRuntime, configurationPolicy] =
    await Promise.all([
      readJson(".builder/installation-registration.json"),
      readJson(".builder/secrets/installation-private.jwk"),
      readJson(".builder/installation-manifest.json"),
      readJson(".builder/site-runtime.json"),
      readJson(".builder/caleb-configuration-policy.json"),
    ]);
  const input = {
    registration,
    privateJwk,
    artifacts: {
      installationManifest,
      siteRuntime,
      configurationPolicy,
      configurationPolicySha256: configurationPolicySha256(configurationPolicy),
    },
  };
  const output = resolve(projectRoot, ".builder/installation-key-binding.json");
  if (options.expectedManifestSha256) {
    // Only release metadata is refreshed; accepted identity/key provenance stays fixed.
    const lockPath = `${output}.refresh-lock`;
    const temporaryPath = `${output}.${randomUUID()}.tmp`;
    const lock = await open(lockPath, "wx");
    try {
      const binding = refreshCalebInstallationKeyBinding({
        ...input,
        existingBinding: await readJson(".builder/installation-key-binding.json"),
        expectedManifestSha256: options.expectedManifestSha256,
      });
      await writeFile(temporaryPath, `${JSON.stringify(binding, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await rename(temporaryPath, output);
    } finally {
      await lock.close();
      await unlink(temporaryPath).catch((error) => { if (error.code !== "ENOENT") throw error; });
      await unlink(lockPath);
    }
  } else {
    const binding = createCalebInstallationKeyBinding({ ...input, boundAt: options.boundAt });
    await writeFile(output, `${JSON.stringify(binding, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  }
} finally {
  await vite.close();
}
