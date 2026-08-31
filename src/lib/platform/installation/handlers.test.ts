import { describe, expect, it, vi } from "vitest";

import {
  createMemorySiteCommandReceiptStore,
  createSiteCommandExecutor,
  siteCommandHandlerRegistrySha256,
} from "@reuben-williams/next/control-plane";

import { CALEB_HANDLER_REGISTRY_SHA256 } from "./manifest";
import { createCalebInstallationHandlers } from "./handlers";

const lease = {
  siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
  installationId: "17a58e73-5384-4cf4-b2df-ff8097127d37",
  leaseOwner: "7710097d-c9f7-475b-8893-6781c248f582",
  fencingToken: "7",
  leaseExpiresAt: "2026-08-31T09:02:00.000Z",
};

describe("Caleb managed Growth handler registry", () => {
  it("contains only the exact approved handlers and matches the manifest digest", () => {
    const handlers = createCalebInstallationHandlers({ upsertConfiguration: vi.fn() });
    expect(handlers.map(({ type, version, idempotency }) => ({ type, version, idempotency }))).toEqual([
      { type: "growth.customers.configure-v2", version: 1, idempotency: "commandId" },
      { type: "growth.leads.configure-v2", version: 1, idempotency: "commandId" },
      { type: "growth.messaging.configure", version: 1, idempotency: "commandId" },
    ]);
    expect(siteCommandHandlerRegistrySha256(handlers)).toBe(CALEB_HANDLER_REGISTRY_SHA256);
    expect(Object.isFrozen(handlers)).toBe(true);
  });

  it("rejects malformed or wrong-profile payloads before persistence", () => {
    const upsertConfiguration = vi.fn();
    const [handler] = createCalebInstallationHandlers({ upsertConfiguration });
    expect(() => handler.validate({ configuration: "wrong-profile-v1" })).toThrow();
    expect(() => handler.validate({
      configuration: "caleb-speaking-engagements-v1",
      extra: true,
    })).toThrow();
    expect(upsertConfiguration).not.toHaveBeenCalled();
  });

  it("passes the exact module/version/profile and lease to persistence", async () => {
    const upsertConfiguration = vi.fn(async (input) => ({
      moduleId: input.moduleId,
      moduleVersion: input.moduleVersion,
      configVersion: input.configVersion,
      configuration: input.configuration,
    }));
    const [handler] = createCalebInstallationHandlers({ upsertConfiguration });
    const signal = new AbortController().signal;
    await expect(handler.execute({
      commandId: "1cfa3d0a-c9c9-4781-88b8-a41574929306",
      idempotencyKey: "command-1",
      payload: handler.validate({ configuration: "caleb-speaking-engagements-v1" }),
      signal,
      lease,
    })).resolves.toMatchObject({
      resultCode: "GROWTH_CONFIGURATION_CONFIGURED",
    });
    expect(upsertConfiguration).toHaveBeenCalledWith(expect.objectContaining({
      moduleId: "growth.customers",
      moduleVersion: "1.1.1",
      configVersion: "1",
      configuration: "caleb-speaking-engagements-v1",
      lease,
      signal,
    }));
  });

  it("replays an exact command without applying configuration twice", async () => {
    const upsertConfiguration = vi.fn(async (input) => ({
      moduleId: input.moduleId,
      moduleVersion: input.moduleVersion,
      configVersion: input.configVersion,
      configuration: input.configuration,
    }));
    const executor = createSiteCommandExecutor({
      siteId: lease.siteId,
      handlers: createCalebInstallationHandlers({ upsertConfiguration }),
      store: createMemorySiteCommandReceiptStore(),
    });
    const command = {
      id: "1cfa3d0a-c9c9-4781-88b8-a41574929306",
      idempotencyKey: "command-1",
      type: "growth.customers.configure-v2",
      version: 1,
      payload: { configuration: "caleb-speaking-engagements-v1" },
    };
    const context = {
      signal: new AbortController().signal,
      lease,
      validateLease: vi.fn(async () => undefined),
    };

    await expect(executor.execute(command, context)).resolves.toMatchObject({
      outcome: "succeeded",
    });
    await expect(executor.execute(command, context)).resolves.toMatchObject({
      outcome: "succeeded",
    });
    expect(upsertConfiguration).toHaveBeenCalledTimes(1);
  });
});
