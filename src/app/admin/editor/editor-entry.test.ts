import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeReadMock, redirectMock } = vi.hoisted(() => ({
  authorizeReadMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/staff/next-cookies", () => ({
  nextCookieAdapter: () => ({}),
}));

vi.mock("@/lib/staff/website-runtime", () => ({
  createCalebWebsiteRuntime: () => ({
    authorizeRead: authorizeReadMock,
  }),
}));

import CanonicalEditorPage from "@/app/admin/editor/page";
import WebsiteEditorPage from "@/app/admin/editor/website/page";

describe("canonical staff editor entry", () => {
  beforeEach(() => {
    authorizeReadMock.mockReset();
    redirectMock.mockReset();
    process.env.NEXT_PUBLIC_SITE_URL = "https://calebjakes.com";
  });

  it("uses the Website workspace as the canonical editor page", () => {
    expect(CanonicalEditorPage).toBe(WebsiteEditorPage);
  });

  it("sends unauthenticated users to login with a safe canonical return", async () => {
    const redirectSignal = new Error("NEXT_REDIRECT");
    authorizeReadMock.mockRejectedValue(new Error("not_authenticated"));
    redirectMock.mockImplementation(() => {
      throw redirectSignal;
    });

    await expect(CanonicalEditorPage()).rejects.toBe(redirectSignal);
    expect(redirectMock).toHaveBeenCalledWith(
      "/admin/login?next=%2Fadmin%2Feditor",
    );
  });
});
