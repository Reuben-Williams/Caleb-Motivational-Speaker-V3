import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffSecurityVerification } from "./staff-security-verification";

const mfa = vi.hoisted(() => ({ listFactors: vi.fn(), challengeAndVerify: vi.fn() }));
vi.mock("@reuben-williams/next/auth", () => ({ createBuilderBrowserClient: () => ({ auth: { mfa } }) }));

describe("staff publishing verification", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it("verifies an existing authenticator and clears the code", async () => {
    vi.stubEnv("NEXT_PUBLIC_STAFF_AUTH_URL", "https://auth.example");
    vi.stubEnv("NEXT_PUBLIC_STAFF_AUTH_PUBLISHABLE_KEY", "public-test-key");
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "approved-factor", status: "verified" }] } });
    mfa.challengeAndVerify.mockResolvedValue({ error: null });
    render(<StaffSecurityVerification />);
    fireEvent.click(screen.getByRole("button", { name: "Verify publishing access" }));
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /^Verify security$/ }));
    expect(await screen.findByText(/Security verified\./)).toBeInTheDocument();
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "approved-factor", code: "123456" });
    fireEvent.click(screen.getByRole("button", { name: "Verify publishing access" }));
    expect(screen.getByLabelText("Authenticator code")).toHaveValue("");
  });
  it("explains a missing authenticator without enrolling or relaxing access", async () => {
    vi.stubEnv("NEXT_PUBLIC_STAFF_AUTH_URL", "https://auth.example");
    vi.stubEnv("NEXT_PUBLIC_STAFF_AUTH_PUBLISHABLE_KEY", "public-test-key");
    mfa.listFactors.mockResolvedValue({ data: { totp: [] } });
    render(<StaffSecurityVerification />);
    fireEvent.click(screen.getByRole("button", { name: "Verify publishing access" }));
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /^Verify security$/ }));
    expect(await screen.findByText(/needs an authenticator set up/)).toBeInTheDocument();
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled();
  });
});
