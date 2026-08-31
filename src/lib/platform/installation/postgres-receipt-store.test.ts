import { describe, expect, it, vi } from "vitest";

import {
  PostgresReceiptStoreError,
  createPostgresInstallationReceiptStore,
} from "./postgres-receipt-store";

const installationId = "17a58e73-5384-4cf4-b2df-ff8097127d37";
const input = {
  siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
  commandId: "1cfa3d0a-c9c9-4781-88b8-a41574929306",
  idempotencyKey: "command-1",
  type: "growth.customers.configure-v2",
  version: 1,
  payloadHash: "a".repeat(64),
};

describe("Postgres installation receipt store", () => {
  it("reserves, completes, and finds through only the installation functions", async () => {
    const success = {
      outcome: "succeeded" as const,
      resultCode: "GROWTH_CONFIGURATION_CONFIGURED",
      evidence: { version: 1 as const, codes: [], metrics: {}, flags: {}, digests: {} },
    };
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: {
          status: "acquired",
          leaseToken: "6a412ee1-0709-41c5-89d3-503c734b7b67",
          leaseExpiresAt: "2026-08-31T09:00:30.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { ...input, result: success }, error: null });
    const store = createPostgresInstallationReceiptStore({ rpc }, { installationId });
    const reservation = await store.reserve(input);
    expect(reservation.status).toBe("acquired");
    await expect(store.complete({
      ...input,
      leaseToken: (reservation as { leaseToken: string }).leaseToken,
      result: success,
    })).resolves.toBe(true);
    await expect(store.find(input)).resolves.toEqual({ ...input, result: success });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "builder_reserve_installation_command_v1",
      "builder_complete_installation_command_v1",
      "builder_find_installation_command_v1",
    ]);
  });

  it("preserves conflict/contention/replay semantics and rejects malformed output", async () => {
    const replay = {
      outcome: "failed",
      errorCode: "INVALID_COMMAND_PAYLOAD",
      evidence: { version: 1, codes: [], metrics: {}, flags: {}, digests: {} },
    };
    for (const data of [
      { status: "conflict" },
      { status: "in_progress", retryAt: "2026-08-31T09:00:30.000Z" },
      { status: "replay", result: replay },
    ]) {
      const store = createPostgresInstallationReceiptStore(
        { rpc: vi.fn().mockResolvedValue({ data, error: null }) },
        { installationId },
      );
      await expect(store.reserve(input)).resolves.toMatchObject({ status: data.status });
    }
    const malformed = createPostgresInstallationReceiptStore(
      { rpc: vi.fn().mockResolvedValue({ data: { status: "acquired" }, error: null }) },
      { installationId },
    );
    await expect(malformed.reserve(input)).rejects.toBeInstanceOf(PostgresReceiptStoreError);
  });
});
