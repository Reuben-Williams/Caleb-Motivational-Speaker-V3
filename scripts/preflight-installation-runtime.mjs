import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REQUIRED_ENVIRONMENT_NAMES = [
  "BUILDER_CONTROL_PLANE_URL",
  "BUILDER_INSTALLATION_ID",
  "BUILDER_INSTALLATION_KEY_ID",
  "BUILDER_INSTALLATION_PRIVATE_JWK",
  "BUILDER_DATABASE_URL",
  "CRON_SECRET",
];
const EXACT_PACKAGES = [
  "@reuben-williams/core",
  "@reuben-williams/forms",
  "@reuben-williams/growth-core",
  "@reuben-williams/growth-customers",
  "@reuben-williams/growth-leads",
  "@reuben-williams/growth-messaging",
  "@reuben-williams/next",
];

function record(value) {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (record(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  throw new Error("invalid_json");
}

const sha256 = (value) => createHash("sha256").update(canonical(value), "utf8").digest("hex");

async function optionalJson(projectDir, path) {
  try {
    const text = await readFile(resolve(projectDir, path), "utf8");
    if (Buffer.byteLength(text, "utf8") > 32_768) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function runInstallationRuntimePreflight({ projectDir, env }) {
  const codes = [];
  const packageJson = await optionalJson(projectDir, "package.json");
  const manifest = await optionalJson(projectDir, ".builder/installation-manifest.json");
  const runtime = await optionalJson(projectDir, ".builder/site-runtime.json");
  const policy = await optionalJson(projectDir, ".builder/caleb-configuration-policy.json");
  const registration = await optionalJson(projectDir, ".builder/installation-registration.json");
  const binding = await optionalJson(projectDir, ".builder/installation-key-binding.json");

  if (!record(packageJson) || !record(packageJson.dependencies) ||
      EXACT_PACKAGES.some((name) => packageJson.dependencies[name] !== "0.5.0")) {
    codes.push("INSTALLATION_PACKAGE_CONTRACT_INVALID");
  }
  if (!record(manifest) || !record(runtime) || !record(policy)) {
    codes.push("INSTALLATION_MANIFESTS_INVALID");
  } else {
    if (runtime.reachabilityEvidenceRevision === null) {
      codes.push("INSTALLATION_REACHABILITY_NOT_VERIFIED");
    }
    if (runtime.installationManifestSha256 !== sha256(manifest)) {
      codes.push("INSTALLATION_MANIFEST_DIGEST_MISMATCH");
    }
    if (policy.stableSiteKey !== "caleb-jakes-v3" || !Array.isArray(policy.entries) || policy.entries.length !== 3) {
      codes.push("INSTALLATION_POLICY_INVALID");
    }
  }
  if (!record(registration)) codes.push("INSTALLATION_REGISTRATION_MISSING");
  if (!record(binding)) codes.push("INSTALLATION_KEY_BINDING_MISSING");
  if (record(registration) && record(binding) &&
      (registration.installationId !== binding.installationId ||
       registration.acceptedKeyId !== binding.acceptedKeyId)) {
    codes.push("INSTALLATION_BINDING_MISMATCH");
  }

  const environmentNames = REQUIRED_ENVIRONMENT_NAMES.filter((name) =>
    typeof env[name] === "string" && env[name].length > 0);
  if (environmentNames.length !== REQUIRED_ENVIRONMENT_NAMES.length) {
    codes.push("INSTALLATION_ENVIRONMENT_INCOMPLETE");
  }
  return {
    ok: codes.length === 0,
    codes: [...new Set(codes)].sort(),
    environmentNames,
    safeDigests: record(runtime) && typeof runtime.installationManifestSha256 === "string"
      ? { installationManifestSha256: runtime.installationManifestSha256 }
      : {},
  };
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invoked) {
  const result = await runInstallationRuntimePreflight({
    projectDir: fileURLToPath(new URL("../", import.meta.url)),
    env: process.env,
  });
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
