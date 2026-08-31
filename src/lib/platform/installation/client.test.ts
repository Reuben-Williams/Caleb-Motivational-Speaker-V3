import { describe, expect, it, vi } from "vitest";

import { CalebInstallationClientError, createCalebBoundedInstallationClient } from "./client";

describe("bounded Caleb installation client", () => {
  it("pulls exactly one command with a sixty-second lease", async () => {
    const base = {
      pullCommands: vi.fn().mockResolvedValue([]),
      acknowledgeResult: vi.fn(),
      reportHealth: vi.fn(),
    };
    const client = createCalebBoundedInstallationClient(base, {
      now: () => new Date("2026-08-31T09:00:00.000Z"),
    });
    await expect(client.pullCommands()).resolves.toEqual([]);
    expect(base.pullCommands).toHaveBeenCalledWith({ limit: 1, leaseSeconds: 60 });
  });

  it("rejects multiple commands or less than thirty seconds remaining", async () => {
    const command = {
      id: "1cfa3d0a-c9c9-4781-88b8-a41574929306",
      type: "growth.customers.configure-v2",
      version: 1,
      payload: { configuration: "caleb-speaking-engagements-v1" },
      idempotencyKey: "command-1",
      createdAt: "2026-08-31T08:59:00.000Z",
      leaseToken: "6a412ee1-0709-41c5-89d3-503c734b7b67",
      attempt: 1,
      leaseExpiresAt: "2026-08-31T09:00:29.999Z",
    };
    for (const commands of [[command], [command, { ...command, id: "7cff783f-f610-4242-92d3-67c52f844e06" }]]) {
      const client = createCalebBoundedInstallationClient({
        pullCommands: vi.fn().mockResolvedValue(commands),
        acknowledgeResult: vi.fn(),
        reportHealth: vi.fn(),
      }, { now: () => new Date("2026-08-31T09:00:00.000Z") });
      await expect(client.pullCommands()).rejects.toBeInstanceOf(CalebInstallationClientError);
    }
  });
});
