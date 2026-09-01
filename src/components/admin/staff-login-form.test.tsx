import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StaffLoginForm } from "@/components/admin/staff-login-form";

const { signInWithOtpMock } = vi.hoisted(() => ({
  signInWithOtpMock: vi.fn(),
}));

vi.mock("@reuben-williams/next/auth", () => ({
  createBuilderBrowserClient: () => ({
    auth: { signInWithOtp: signInWithOtpMock },
  }),
}));

describe("StaffLoginForm", () => {
  beforeEach(() => {
    signInWithOtpMock.mockReset();
    signInWithOtpMock.mockResolvedValue({ error: null });
    vi.stubEnv("NEXT_PUBLIC_STAFF_AUTH_URL", "https://auth.example.test");
    vi.stubEnv("NEXT_PUBLIC_STAFF_AUTH_PUBLISHABLE_KEY", "public-test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends the magic link back through the canonical editor entry", async () => {
    const user = userEvent.setup();
    render(<StaffLoginForm nextPath="/admin/editor" />);

    await user.type(
      screen.getByRole("textbox", { name: "Approved staff email" }),
      "staff@example.test",
    );
    await user.click(
      screen.getByRole("button", { name: "Email me a secure sign-in link" }),
    );

    await waitFor(() => {
      expect(signInWithOtpMock).toHaveBeenCalledWith({
        email: "staff@example.test",
        options: {
          emailRedirectTo:
            "http://localhost:3000/admin/auth/callback?next=%2Fadmin%2Feditor",
          shouldCreateUser: false,
        },
      });
    });
  });

  it("falls back to the canonical editor when given an unsafe return path", async () => {
    const user = userEvent.setup();
    render(<StaffLoginForm nextPath="https://attacker.example/steal" />);

    await user.type(
      screen.getByRole("textbox", { name: "Approved staff email" }),
      "staff@example.test",
    );
    await user.click(
      screen.getByRole("button", { name: "Email me a secure sign-in link" }),
    );

    await waitFor(() => {
      expect(signInWithOtpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo:
              "http://localhost:3000/admin/auth/callback?next=%2Fadmin%2Feditor",
          }),
        }),
      );
    });
  });
});
