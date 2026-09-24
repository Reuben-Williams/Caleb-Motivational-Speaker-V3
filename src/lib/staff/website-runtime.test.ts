import { describe, expect, it, vi } from "vitest";

import {
  createCalebWebsiteRuntime,
  createPostgresCalebWebsiteAuthorizationStore,
} from "@/lib/staff/website-runtime";

describe("Caleb website runtime", () => {
  it("fails closed and reports the first missing server configuration", () => {
    const report = vi.fn();
    expect(createCalebWebsiteRuntime({}, {} as never, report)).toBeNull();
    expect(report).toHaveBeenCalledWith({
      code: "missing_configuration",
      component: "DATABASE_URL",
    });
  });

  it("binds the fixed website module and safe authorization persistence functions", async () => {
    const release = vi.fn();
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ context: { siteKey: "caleb-jakes-v3" } }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ result: false }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ result: "reserved" }], rowCount: 1 });
    const store = createPostgresCalebWebsiteAuthorizationStore({
      connect: vi.fn().mockResolvedValue({ query, release }),
    });

    await expect(store.loadContext("caleb-jakes-v3", "subject-a", {
      moduleId: "core.website",
      action: "read",
    })).resolves.toEqual({ siteKey: "caleb-jakes-v3" });
    await expect(store.isSessionRevoked("session-a", "subject-a")).resolves.toBe(false);
    await store.writeDenial({
      outcome: "denied",
      code: "ROLE_DENIED",
      siteKey: "caleb-jakes-v3",
      subject: "subject-a",
      capability: "preview.read",
      operation: "website.preview.read",
      correlationId: "correlation-a",
    });
    await expect(store.reservePrivilegedRequest({
      siteKey: "caleb-jakes-v3",
      subject: "subject-a",
      operation: "website.publish",
      idempotencyKey: "publish-a",
      fingerprint: "a".repeat(64),
    })).resolves.toBe("reserved");

    expect(query.mock.calls[0]).toEqual([
      "select builder_private.staff_authorization_context_v1($1, $2::uuid, $3, $4) as context",
      ["caleb-jakes-v3", "subject-a", "core.website", "read"],
    ]);
    expect(query.mock.calls[2][1][0]).not.toHaveProperty("sessionId");
    expect(release).toHaveBeenCalledTimes(4);
  });
});
