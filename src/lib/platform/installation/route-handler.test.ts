import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

import { createCalebInstallationWorkerHandler } from "./route-handler";

const secret = "caleb-worker-secret-with-enough-entropy";

function request(method = "GET", suffix = "") {
  return new Request(`https://calebjakes.com/api/builder/workers/installation${suffix}`, {
    method,
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("Caleb installation worker route", () => {
  it("rejects wrong method, token, query, and body before runtime resolution", async () => {
    const resolveRuntime = vi.fn();
    const handler = createCalebInstallationWorkerHandler({
      secret: () => secret,
      resolveRuntime,
    });
    const responses = [
      await handler(request("POST")),
      await handler(new Request("https://calebjakes.com/api/builder/workers/installation")),
      await handler(request("GET", "?site=other")),
      await handler(new Request(
        "https://calebjakes.com/api/builder/workers/installation",
        { headers: { authorization: `Bearer ${secret}`, "content-length": "2" } },
      )),
    ];
    expect(responses.map((response) => response.status)).toEqual([405, 401, 400, 400]);
    expect(responses.every((response) => response.headers.get("cache-control") === "private, no-store"))
      .toBe(true);
    expect(resolveRuntime).not.toHaveBeenCalled();
  });

  it("returns bounded complete and idle summaries", async () => {
    for (const [result, expected] of [
      [{ pulled: 1, acknowledged: 1, healthReported: true }, {
        code: "installation_worker_complete",
        pulled: 1,
        acknowledged: 1,
        healthReported: true,
      }],
      [{ pulled: 0, acknowledged: 0, healthReported: false }, {
        code: "installation_worker_idle",
        pulled: 0,
        acknowledged: 0,
        healthReported: false,
      }],
    ] as const) {
      const handler = createCalebInstallationWorkerHandler({
        secret: () => secret,
        resolveRuntime: async () => ({ runScheduled: vi.fn().mockResolvedValue(result) }),
      });
      const response = await handler(request());
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(expected);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  });

  it("sanitizes configuration, runtime, and timeout failures", async () => {
    const aborted = new AbortController();
    aborted.abort(new Error("private timeout detail"));
    const cases = [
      {
        handler: createCalebInstallationWorkerHandler({
          secret: () => secret,
          resolveRuntime: async () => { throw new Error("postgresql://secret"); },
        }),
        code: "installation_configuration_invalid",
      },
      {
        handler: createCalebInstallationWorkerHandler({
          secret: () => secret,
          resolveRuntime: async () => ({ runScheduled: vi.fn().mockRejectedValue(new Error("secret")) }),
        }),
        code: "installation_worker_failed",
      },
      {
        handler: createCalebInstallationWorkerHandler({
          secret: () => secret,
          timeoutSignal: () => aborted.signal,
          resolveRuntime: async () => ({ runScheduled: vi.fn(async ({ signal }) => {
            if (signal?.aborted) throw signal.reason;
            return { pulled: 0, acknowledged: 0, healthReported: false };
          }) }),
        }),
        code: "installation_worker_timeout",
      },
    ];
    for (const { handler, code } of cases) {
      const response = await handler(request());
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ code });
    }
  });

  it("keeps existing schedules and adds the five-minute installation worker", async () => {
    const vercel = JSON.parse(await readFile("vercel.json", "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    expect(vercel.crons).toEqual(expect.arrayContaining([
      { path: "/api/cron/inquiries-email", schedule: "*/5 * * * *" },
      { path: "/api/cron/inquiries-retention", schedule: "15 6 * * *" },
      { path: "/api/builder/workers/installation", schedule: "*/5 * * * *" },
    ]));
  });
});
