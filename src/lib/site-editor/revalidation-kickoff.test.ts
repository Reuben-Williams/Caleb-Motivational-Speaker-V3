import { beforeEach, describe, expect, it, vi } from "vitest";

const callbacks = vi.hoisted(() => [] as Array<() => Promise<void>>);
const after = vi.hoisted(() => vi.fn((callback: () => Promise<void>) => { callbacks.push(callback); }));
const refresh = vi.hoisted(() => vi.fn());
const createStore = vi.hoisted(() => vi.fn());
const verifyPublishedContent = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const createPublicAdapter = vi.hoisted(() => vi.fn(() => ({ verifyPublishedContent })));
vi.mock("next/server", () => ({ after }));
vi.mock("next/cache", () => ({ revalidatePath: refresh }));
vi.mock("@/lib/staff/website-runtime", () => ({ createCalebRevalidationWorkerStore: createStore, createCalebPublicContentAdapter: createPublicAdapter }));

import { scheduleCalebContentRevalidation } from "./revalidation-kickoff";

describe("post-commit revalidation kickoff", () => {
  beforeEach(() => { callbacks.length = 0; vi.clearAllMocks(); });

  it("defers one leased attempt until after the response and refreshes its stored path", async () => {
    const store = {
      claimDue: vi.fn().mockResolvedValue([{ id: "job-a", pagePath: "/about-caleb", publishedVersionId: "version-a" }]),
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
    expect(verifyPublishedContent).toHaveBeenCalledWith("ce607bf6-2959-4d7e-b52a-31a8d21b1db2", "/about-caleb", "version-a");
    expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({ jobId: "job-a", succeeded: true }));
  });

  it("never completes a lease successfully if strict public readback fails", async () => {
    const store = { claimDue: vi.fn().mockResolvedValue([{ id: "job-a", pagePath: "/", publishedVersionId: "version-a" }]), complete: vi.fn().mockResolvedValue(true) };
    createStore.mockReturnValue(store);
    verifyPublishedContent.mockRejectedValueOnce(new Error("publication unavailable"));
    scheduleCalebContentRevalidation();
    await callbacks[0]();
    expect(store.complete).not.toHaveBeenCalledWith(expect.objectContaining({ succeeded: true }));
    expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({ succeeded: false, safeErrorCode: "CONTENT_REFRESH_FAILED" }));
  });

  it("does not mark a job complete merely because cache invalidation returned", async () => {
    let releaseReadback!: () => void;
    verifyPublishedContent.mockImplementationOnce(() => new Promise<void>((resolve) => { releaseReadback = resolve; }));
    const store = { claimDue: vi.fn().mockResolvedValue([{ id: "job-a", pagePath: "/", publishedVersionId: "version-a" }]), complete: vi.fn().mockResolvedValue(true) };
    createStore.mockReturnValue(store);
    scheduleCalebContentRevalidation();
    const attempt = callbacks[0]();
    await vi.waitFor(() => expect(verifyPublishedContent).toHaveBeenCalledOnce());
    expect(refresh).toHaveBeenCalledOnce();
    expect(store.complete).not.toHaveBeenCalled();
    releaseReadback();
    await attempt;
    expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({ succeeded: true }));
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
