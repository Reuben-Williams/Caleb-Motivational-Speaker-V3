import { describe, expect, it, vi } from "vitest";

import {
  CalebInstallationHealthSourceError,
  createCalebInstallationHealthSource,
} from "./health-source";

const siteId = "ce607bf6-2959-4d7e-b52a-31a8d21b1db2";
const installationId = "17a58e73-5384-4cf4-b2df-ff8097127d37";

describe("Caleb installation health source", () => {
  it("reports only bounded installation facts and empty external surfaces", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {
      version: 1,
      status: "active",
      workerVersion: "0.5.0",
      pendingReceipts: "0",
      configuredModules: "3",
      queues: [],
      integrations: [],
    }, error: null });
    const source = createCalebInstallationHealthSource({ rpc }, { siteId, installationId });
    await expect(source.probeDurableStore()).resolves.toBe(true);
    await expect(source.readQueues()).resolves.toEqual({});
    await expect(source.probeIntegrations()).resolves.toEqual({});
  });

  it("rejects customer-shaped or malformed health output", async () => {
    const source = createCalebInstallationHealthSource({
      rpc: vi.fn().mockResolvedValue({ data: { customerEmail: "private@example.com" }, error: null }),
    }, { siteId, installationId });
    await expect(source.probeDurableStore()).rejects.toBeInstanceOf(
      CalebInstallationHealthSourceError,
    );
  });
});
