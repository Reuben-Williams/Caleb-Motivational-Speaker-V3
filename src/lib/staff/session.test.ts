import { describe, expect, it, vi } from "vitest";

import { createCalebStaffSessionVerifier } from "@/lib/staff/session";

const now = new Date("2026-08-29T12:00:00.000Z");
const claims = {
  iss: "https://staff.example.test/auth/v1",
  aud: "site-editor-staff",
  sub: "11111111-1111-4111-8111-111111111111",
  session_id: "session-a",
  exp: Math.floor(new Date("2026-08-29T13:00:00.000Z").getTime() / 1000),
  app_metadata: { identity_kind: "staff" },
};

function verifier(overrides: Record<string, unknown> = {}, revoked = false) {
  return createCalebStaffSessionVerifier({
    client: {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { ...claims, ...overrides } },
          error: null,
        }),
      },
    },
    expectedIssuer: "https://staff.example.test/auth/v1",
    expectedAudience: "site-editor-staff",
    revocations: { isRevoked: vi.fn().mockResolvedValue(revoked) },
    now: () => now,
  });
}

describe("Caleb staff session verifier", () => {
  it("returns only verified server identity fields", async () => {
    await expect(verifier().verify(new Request("https://calebjakes.com"))).resolves.toEqual({
      issuer: "https://staff.example.test/auth/v1",
      subject: claims.sub,
      sessionId: "session-a",
      expiresAt: "2026-08-29T13:00:00.000Z",
    });
  });

  it("rejects wrong issuer, audience, expiry, revocation, and customer identities", async () => {
    await expect(verifier({ iss: "https://attacker.test" }).verify(new Request("https://x"))).rejects.toMatchObject({ status: 401 });
    await expect(verifier({ aud: "customer" }).verify(new Request("https://x"))).rejects.toMatchObject({ status: 401 });
    await expect(verifier({ exp: Math.floor(now.getTime() / 1000) }).verify(new Request("https://x"))).rejects.toMatchObject({ status: 401 });
    await expect(verifier({}, true).verify(new Request("https://x"))).rejects.toMatchObject({ code: "SESSION_REVOKED" });
    await expect(verifier({ app_metadata: { identity_kind: "customer" } }).verify(new Request("https://x"))).rejects.toMatchObject({ status: 403 });
  });
});
