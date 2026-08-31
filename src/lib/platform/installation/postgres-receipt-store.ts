import "server-only";

import {
  validateCommandExecutionResult,
  type SiteCommandReceipt,
  type SiteCommandReceiptStore,
} from "@reuben-williams/next/control-plane";

import type { InstallationPostgresRpcClient } from "./postgres-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PostgresReceiptStoreError extends Error {
  readonly code = "installation_receipt_store_failed";
  constructor() {
    super("installation_receipt_store_failed");
    this.name = "PostgresReceiptStoreError";
  }
}

function failed(): never {
  throw new PostgresReceiptStoreError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

export function createPostgresInstallationReceiptStore(
  client: InstallationPostgresRpcClient,
  options: { installationId: string },
): SiteCommandReceiptStore {
  if (!UUID.test(options.installationId)) return failed();
  const installationId = options.installationId.toLowerCase();
  const receiptArgs = (input: Omit<SiteCommandReceipt, "result">) => ({
    p_site_id: input.siteId,
    p_installation_id: installationId,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
    p_command_type: input.type,
    p_command_version: input.version,
    p_payload_hash: input.payloadHash,
  });

  return {
    async reserve(input) {
      try {
        const { data } = await client.rpc("builder_reserve_installation_command_v1", {
          ...receiptArgs(input),
          p_lease_seconds: 30,
        });
        if (!isRecord(data) || typeof data.status !== "string") return failed();
        if (data.status === "conflict") return { status: "conflict" };
        if (data.status === "in_progress") {
          if (typeof data.retryAt !== "string" || !Number.isFinite(Date.parse(data.retryAt))) {
            return failed();
          }
          return { status: "in_progress", retryAt: data.retryAt };
        }
        if (data.status === "replay") {
          return { status: "replay", result: validateCommandExecutionResult(data.result) };
        }
        if (
          data.status !== "acquired" ||
          typeof data.leaseToken !== "string" ||
          !UUID.test(data.leaseToken) ||
          typeof data.leaseExpiresAt !== "string" ||
          !Number.isFinite(Date.parse(data.leaseExpiresAt))
        ) return failed();
        return {
          status: "acquired",
          leaseToken: data.leaseToken.toLowerCase(),
          leaseExpiresAt: data.leaseExpiresAt,
        };
      } catch (error) {
        if (error instanceof PostgresReceiptStoreError) throw error;
        return failed();
      }
    },
    async complete(input) {
      try {
        const { data } = await client.rpc("builder_complete_installation_command_v1", {
          ...receiptArgs(input),
          p_lease_token: input.leaseToken,
          p_result: structuredClone(input.result),
        });
        if (typeof data !== "boolean") return failed();
        return data;
      } catch (error) {
        if (error instanceof PostgresReceiptStoreError) throw error;
        return failed();
      }
    },
    async find(input) {
      try {
        const { data } = await client.rpc("builder_find_installation_command_v1", {
          p_site_id: input.siteId,
          p_command_id: input.commandId,
          p_idempotency_key: input.idempotencyKey,
        });
        if (data === null) return null;
        if (
          !isRecord(data) ||
          typeof data.siteId !== "string" ||
          typeof data.commandId !== "string" ||
          typeof data.idempotencyKey !== "string" ||
          typeof data.type !== "string" ||
          !Number.isSafeInteger(data.version) ||
          typeof data.payloadHash !== "string"
        ) return failed();
        return {
          siteId: data.siteId,
          commandId: data.commandId,
          idempotencyKey: data.idempotencyKey,
          type: data.type,
          version: data.version as number,
          payloadHash: data.payloadHash,
          result: validateCommandExecutionResult(data.result),
        };
      } catch (error) {
        if (error instanceof PostgresReceiptStoreError) throw error;
        return failed();
      }
    },
  };
}
