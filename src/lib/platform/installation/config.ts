import "server-only";

import {
  parseInstallationClientConfig,
  type InstallationClientConfig,
} from "@reuben-williams/next/control-plane";

import { normalizePostgresConnectionString } from "@/lib/postgres/connection-string";

const CONTROL_PLANE_URL = "https://site-editor-control-plane.vercel.app";

export interface CalebInstallationConfig {
  client: InstallationClientConfig;
  databaseUrl: string;
}

export class CalebInstallationConfigError extends Error {
  readonly code = "caleb_installation_config_invalid";
  constructor() {
    super("caleb_installation_config_invalid");
    this.name = "CalebInstallationConfigError";
  }
}

function failed(): never {
  throw new CalebInstallationConfigError();
}

function parseDatabaseUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 4_096 || value.trim() !== value) return failed();
  try {
    const normalized = normalizePostgresConnectionString(value);
    if (new URL(normalized).searchParams.get("sslmode") !== "verify-full") {
      return failed();
    }
    return normalized;
  } catch {
    return failed();
  }
}

export function parseCalebInstallationConfig(
  env: Readonly<Record<string, string | undefined>>,
): CalebInstallationConfig {
  try {
    const privateJwk = JSON.parse(env.BUILDER_INSTALLATION_PRIVATE_JWK ?? "null");
    const client = parseInstallationClientConfig({
      controlPlaneUrl: env.BUILDER_CONTROL_PLANE_URL,
      installationId: env.BUILDER_INSTALLATION_ID,
      keyId: env.BUILDER_INSTALLATION_KEY_ID,
      privateJwk,
    });
    if (client.controlPlaneUrl !== CONTROL_PLANE_URL) return failed();
    return {
      client,
      databaseUrl: parseDatabaseUrl(env.BUILDER_DATABASE_URL),
    };
  } catch (error) {
    if (error instanceof CalebInstallationConfigError) throw error;
    return failed();
  }
}
