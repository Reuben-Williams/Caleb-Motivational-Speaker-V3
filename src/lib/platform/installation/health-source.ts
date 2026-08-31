import "server-only";

import type { SiteHealthSource } from "@reuben-williams/next/control-plane";

import type { InstallationPostgresRpcClient } from "./postgres-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export class CalebInstallationHealthSourceError extends Error {
  readonly code = "caleb_installation_health_unavailable";
  constructor() {
    super("caleb_installation_health_unavailable");
    this.name = "CalebInstallationHealthSourceError";
  }
}

function failed(): never {
  throw new CalebInstallationHealthSourceError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function count(value: unknown): number {
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !/^[0-9]{1,10}$/.test(text)) return failed();
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number > 9_999_999_999) return failed();
  return number;
}

export function createCalebInstallationHealthSource(
  client: InstallationPostgresRpcClient,
  options: { siteId: string; installationId: string },
): SiteHealthSource {
  if (!UUID.test(options.siteId) || !UUID.test(options.installationId)) return failed();
  let cached: Promise<Record<string, unknown>> | null = null;
  const load = () => cached ??= (async () => {
    try {
      const { data } = await client.rpc("builder_get_installation_health_v1", {
        p_site_id: options.siteId,
        p_installation_id: options.installationId,
      });
      const keys = ["version", "status", "workerVersion", "pendingReceipts", "configuredModules", "queues", "integrations"];
      if (
        !isRecord(data) ||
        Object.keys(data).sort().join(",") !== keys.sort().join(",") ||
        data.version !== 1 ||
        data.status !== "active" ||
        typeof data.workerVersion !== "string" ||
        !VERSION.test(data.workerVersion) ||
        !Array.isArray(data.queues) ||
        data.queues.length !== 0 ||
        !Array.isArray(data.integrations) ||
        data.integrations.length !== 0
      ) return failed();
      count(data.pendingReceipts);
      count(data.configuredModules);
      return data;
    } catch (error) {
      if (error instanceof CalebInstallationHealthSourceError) throw error;
      return failed();
    }
  })();
  return {
    async probeDurableStore() {
      await load();
      return true;
    },
    async readQueues() {
      await load();
      return {};
    },
    async probeIntegrations() {
      await load();
      return {};
    },
  };
}
