import { describe, expect, it, vi } from "vitest";

import { authorizeCalebStaff, createCalebStaffAuthorizer } from "@/lib/staff/authorization";

const session = {
  issuer: "https://staff.example.test/auth/v1",
  subject: "11111111-1111-4111-8111-111111111111",
  sessionId: "session-a",
  expiresAt: "2026-08-29T13:00:00.000Z",
};

function context(overrides: Record<string, unknown> = {}) {
  return {
    siteId: "22222222-2222-4222-8222-222222222222",
    siteKey: "caleb-jakes",
    subject: session.subject,
    role: "administrator_operator" as const,
    membershipState: "active" as const,
    authorizationVersion: 3,
    grants: [{ capability: "leads.read" as const, scope: "site" as const }],
    assignments: [],
    entitlement: {
      moduleId: "growth-leads",
      action: "read" as const,
      allowed: true,
      version: 1,
      verifiedAt: "2026-08-29T11:00:00.000Z",
      expiresAt: "2026-08-30T12:00:00.000Z",
    },
    ...overrides,
  };
}

async function authorize(overrides: Record<string, unknown> = {}) {
  const repository = { loadContext: vi.fn().mockResolvedValue(context(overrides)) };
  const authorizer = createCalebStaffAuthorizer({
    repository,
    audit: { write: vi.fn().mockResolvedValue(undefined) },
    now: () => new Date("2026-08-29T12:00:00.000Z"),
  });
  const verifier = { verify: vi.fn().mockResolvedValue(session) };
  return authorizeCalebStaff({
    request: new Request("https://calebjakes.com/admin/editor"),
    verifier,
    authorizer,
    capability: "leads.read",
    moduleAction: "read",
    correlationId: "correlation-a",
  });
}

describe("Caleb staff authorization", () => {
  it("derives the Caleb site and operator role from verified server state", async () => {
    await expect(authorize()).resolves.toMatchObject({
      siteKey: "caleb-jakes",
      role: "administrator_operator",
      capability: "leads.read",
    });
  });

  it("allows the owner without a separate grant", async () => {
    await expect(authorize({ role: "owner", grants: [] })).resolves.toMatchObject({
      role: "owner",
      scope: "site",
    });
  });

  it("fails closed for inactive membership, missing entitlement, capability, or cross-site context", async () => {
    await expect(authorize({ membershipState: "suspended" })).rejects.toMatchObject({ code: "MEMBERSHIP_INACTIVE" });
    await expect(authorize({ entitlement: { ...context().entitlement, allowed: false } })).rejects.toMatchObject({ code: "ENTITLEMENT_DENIED" });
    await expect(authorize({ grants: [] })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(authorize({ siteKey: "another-site" })).rejects.toMatchObject({ code: "TENANT_BOUNDARY_DENIED" });
  });

  it("ignores browser-supplied role and site because neither enters the authorization request", async () => {
    const grant = await authorizeCalebStaff({
      request: new Request("https://calebjakes.com/admin/editor?role=owner&site=other"),
      verifier: { verify: vi.fn().mockResolvedValue(session) },
      authorizer: { authorize: vi.fn().mockResolvedValue({ siteKey: "caleb-jakes" }) },
      capability: "leads.read",
      moduleAction: "read",
      correlationId: "correlation-a",
    });
    expect(grant).toEqual({ siteKey: "caleb-jakes" });
  });
});
