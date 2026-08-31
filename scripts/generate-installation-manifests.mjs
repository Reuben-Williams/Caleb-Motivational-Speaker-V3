import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function readReachabilityRevision(args) {
  if (args.length === 0) return null;
  if (args.length !== 2 || args[0] !== "--reachability-revision") {
    throw new Error(
      "Usage: npm run builder:generate-installation-manifests -- [--reachability-revision <verified-revision>]",
    );
  }
  const revision = args[1];
  if (!/^[A-Za-z0-9._:@/-]{1,200}$/.test(revision)) {
    throw new Error("The reachability revision contains unsupported characters.");
  }
  return revision;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
  const { createCalebInstallationArtifacts } = await vite.ssrLoadModule(
    "/src/lib/platform/installation/manifest.ts",
  );
  const artifacts = createCalebInstallationArtifacts({
    reachabilityEvidenceRevision: readReachabilityRevision(process.argv.slice(2)),
  });
  const outputDirectory = resolve(projectRoot, ".builder");
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeJson(
      resolve(outputDirectory, "installation-manifest.json"),
      artifacts.installationManifest,
    ),
    writeJson(resolve(outputDirectory, "site-runtime.json"), artifacts.siteRuntime),
    writeJson(
      resolve(outputDirectory, "caleb-configuration-policy.json"),
      artifacts.configurationPolicy,
    ),
  ]);
} finally {
  await vite.close();
}
