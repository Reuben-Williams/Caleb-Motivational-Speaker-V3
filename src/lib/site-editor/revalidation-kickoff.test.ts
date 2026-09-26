import { beforeEach, describe, expect, it, vi } from "vitest";

const callbacks = vi.hoisted(() => [] as Array<() => Promise<void>>);
const after = vi.hoisted(() => vi.fn((callback: () => Promise<void>) => { callbacks.push(callback); }));
const refresh = vi.hoisted(() => vi.fn());
const createStore = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after }));
vi.mock("next/cache", () => ({ revalidatePath: refresh }));
vi.mock("@/lib/staff/website-runtime", () => ({ createCalebRevalidationWorkerStore: createStore }));

import { scheduleCalebContentRevalidation } from "./revalidation-kickoff";

describe("post-commit revalidation kickoff", () => {
  beforeEach(() => { callbacks.length = 0; vi.clearAllMocks(); });

  it("defers one leased attempt until after the response and refreshes its stored path", async () => {
    const store = {
      claimDue: vi.fn().mockResolvedValue([{ id: "job-a", pagePath: "/about-caleb" }]),
      complete: vi.fn().mockResolvedValue(true),
    };
    createStore.mockReturnValue(store);
    scheduleCalebContentRevalidation();
    expect(after).toHaveBeenCalledOnce();
    expect(createStore).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    await callbacks[0]();
    expect(store.claimDue).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, leaseSeconds: 120 }));
    expect(refresh).toHaveBeenCalledWith("/about-caleb");
    expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({ jobId: "job-a", succeeded: true }));
  });

  it("contains unavailable configuration without logging credentials or failing the completed request", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    createStore.mockImplementation(() => { throw new Error("secret details"); });
    scheduleCalebContentRevalidation();
    await expect(callbacks[0]()).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith("revalidation_configuration_invalid");
    logger.mockRestore();
  });
});
