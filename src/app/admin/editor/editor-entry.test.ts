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

vi.mock("@/lib/staff/runtime", () => ({
  createCalebStaffRuntime: () => ({
    authorizeRead: authorizeReadMock,
  }),
}));

import CanonicalEditorPage from "@/app/admin/editor/page";
import SpeakingEngagementsPage from "@/app/admin/editor/speaking-engagements/page";

describe("canonical staff editor entry", () => {
  beforeEach(() => {
    authorizeReadMock.mockReset();
    redirectMock.mockReset();
    process.env.NEXT_PUBLIC_SITE_URL = "https://calebjakes.com";
  });

  it("uses the speaking-engagements workspace as the canonical editor page", () => {
    expect(CanonicalEditorPage).toBe(SpeakingEngagementsPage);
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
