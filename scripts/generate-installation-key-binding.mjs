import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function readBoundAt(args) {
  if (args.length === 0) return new Date().toISOString();
  if (args.length !== 2 || args[0] !== "--bound-at") {
    throw new Error(
      "Usage: npm run builder:generate-installation-key-binding -- [--bound-at <canonical-UTC-instant>]",
    );
  }
  return args[1];
}

async function readJson(relativePath) {
  const text = await readFile(resolve(projectRoot, relativePath), "utf8");
  if (Buffer.byteLength(text, "utf8") > 32_768) throw new Error("Binding input is too large.");
  return JSON.parse(text);
}

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
  const [{ createCalebInstallationKeyBinding }, { configurationPolicySha256 }] =
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
  const binding = createCalebInstallationKeyBinding({
    registration,
    privateJwk,
    artifacts: {
      installationManifest,
      siteRuntime,
      configurationPolicy,
      configurationPolicySha256: configurationPolicySha256(configurationPolicy),
    },
    boundAt: readBoundAt(process.argv.slice(2)),
  });
  await writeFile(
    resolve(projectRoot, ".builder/installation-key-binding.json"),
    `${JSON.stringify(binding, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
} finally {
  await vite.close();
}
