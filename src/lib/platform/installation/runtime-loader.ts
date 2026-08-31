import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Pool } from "pg";

import { configurationPolicySha256 } from "./configuration-policy";
import { parseCalebInstallationConfig } from "./config";
import {
  createInstallationPostgresPool,
  createInstallationPostgresRpcClient,
} from "./postgres-client";
import { createCalebInstallationRuntime } from "./runtime";

let pool: Pool | null = null;

async function readBuilderJson(name: string): Promise<unknown> {
  const text = await readFile(resolve(process.cwd(), ".builder", name), "utf8");
  if (Buffer.byteLength(text, "utf8") > 32_768) throw new Error("invalid_builder_artifact");
  return JSON.parse(text);
}

export async function createCalebInstallationRuntimeFromEnvironment(
  env: Readonly<Record<string, string | undefined>>,
) {
  const config = parseCalebInstallationConfig(env);
  const [installationManifest, siteRuntime, configurationPolicy, registration, binding] =
    await Promise.all([
      readBuilderJson("installation-manifest.json"),
      readBuilderJson("site-runtime.json"),
      readBuilderJson("caleb-configuration-policy.json"),
      readBuilderJson("installation-registration.json"),
      readBuilderJson("installation-key-binding.json"),
    ]);
  pool ??= createInstallationPostgresPool(config.databaseUrl);
  const postgresClient = createInstallationPostgresRpcClient(pool);
  return createCalebInstallationRuntime({
    env,
    artifacts: {
      installationManifest: installationManifest as never,
      siteRuntime: siteRuntime as never,
      configurationPolicy: configurationPolicy as never,
      configurationPolicySha256: configurationPolicySha256(configurationPolicy),
    },
    registration,
    binding,
    postgresClient,
  });
}
