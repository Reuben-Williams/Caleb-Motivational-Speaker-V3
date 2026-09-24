import { describe, expect, it, vi } from "vitest";

import {
  authorizeCalebWebsiteStaff,
  authorizePrivilegedCalebWebsiteRequest,
  createCalebWebsiteAuthorizer,
  parseCalebWebsiteAuthorizationContext,
  type CalebWebsiteAuthorizationStore,
} from "@/lib/staff/website-authorization";
import type { VerifiedStaffSession } from "@reuben-williams/next/auth";

const NOW = new Date("2026-09-24T16:00:00.000Z");
const SITE_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT = "11111111-1111-4111-8111-111111111111";

const session: VerifiedStaffSession = Object.freeze({
  issuer: "https://staff.example.test/auth/v1",
  subject: SUBJECT,
  sessionId: "session-a",
  expiresAt: "2026-09-24T17:00:00.000Z",
  aal2VerifiedAt: "2026-09-24T15:59:00.000Z",
});

function rawContext(overrides: Record<string, unknown> = {}) {
  return {
    siteId: SITE_ID,
    siteKey: "caleb-jakes-v3",
    subject: SUBJECT,
    role: "administrator_operator",
    membershipState: "active",
    authorizationVersion: 4,
    grants: [
      { capability: "leads.read", scope: "site" },
      { capability: "preview.read", scope: "site" },
      { capability: "history.read", scope: "site" },
      { capability: "post.editDraft", scope: "site" },
      { capability: "post.publish", scope: "site" },
      { capability: "post.rollback", scope: "site" },
      { capability: "media.upload", scope: "site" },
    ],
    assignments: [],
    entitlement: {
      moduleId: "core.website",
      action: "read",
      allowed: true,
      version: 2,
      verifiedAt: "2026-09-24T15:00:00.000Z",
      expiresAt: "2026-09-25T15:00:00.000Z",
    },
    ...overrides,
  };
}

function store(context: unknown = rawContext()): CalebWebsiteAuthorizationStore {
  return {
    loadContext: vi.fn().mockResolvedValue(context),
    writeDenial: vi.fn().mockResolvedValue(undefined),
    reservePrivilegedRequest: vi.fn().mockResolvedValue("reserved"),
    isSessionRevoked: vi.fn().mockResolvedValue(false),
  };
}

function request(headers: Record<string, string> = {}) {
  return new Request("https://calebjakes.com/api/builder/content", {
    method: "POST",
    headers,
  });
}

describe("Caleb website authorization", () => {
  it("filters known Growth grants before parsing the published Website capability set", () => {
    const parsed = parseCalebWebsiteAuthorizationContext(rawContext());
    expect(parsed?.grants).toEqual([
      { capability: "preview.read", scope: "site" },
      { capability: "history.read", scope: "site" },
      { capability: "post.editDraft", scope: "site" },
      { capability: "post.publish", scope: "site" },
      { capability: "post.rollback", scope: "site" },
      { capability: "media.upload", scope: "site" },
    ]);
  });

  it("fails closed for an unknown or malformed website-context grant", () => {
    expect(() => parseCalebWebsiteAuthorizationContext(rawContext({
      grants: [{ capability: "website.superuser", scope: "site" }],
    }))).toThrowError(expect.objectContaining({ code: "WEBSITE_AUTH_STORE_INVALID" }));
    expect(() => parseCalebWebsiteAuthorizationContext(rawContext({
      grants: [{ capability: "preview.read", scope: "assigned" }],
    }))).toThrowError(expect.objectContaining({ code: "WEBSITE_AUTH_STORE_INVALID" }));
  });

  it.each([
    ["website.preview.read", "preview.read", "read", false],
    ["website.history.read", "history.read", "read", false],
    ["website.draft.save", "post.editDraft", "write", false],
    ["website.publish", "post.publish", "write", true],
    ["website.rollback", "post.rollback", "write", true],
    ["website.media.upload", "media.upload", "write", true],
    ["website.revalidation.retry", "post.publish", "write", true],
  ] as const)("enforces %s as %s/%s with the declared MFA policy", async (
    operation,
    capability,
    action,
    requiresAal2,
  ) => {
    const repository = store(rawContext({
      entitlement: { ...rawContext().entitlement, action },
    }));
    const authorizer = createCalebWebsiteAuthorizer({
      repository,
      audit: repository,
      now: () => NOW,
    });
    const verified = requiresAal2 ? session : { ...session, aal2VerifiedAt: undefined };
    await expect(authorizer.authorize({
      siteKey: "caleb-jakes-v3",
      session: verified,
      operation,
      correlationId: "correlation-a",
    })).resolves.toMatchObject({ capability, role: "administrator_operator" });
    expect(repository.loadContext).toHaveBeenCalledWith(
      "caleb-jakes-v3",
      SUBJECT,
      { moduleId: "core.website", action },
    );
  });

  it("enforces membership, role, entitlement, capability, tenant, version, expiry, and recent MFA", async () => {
    async function denied(
      operation: "website.preview.read" | "website.publish",
      overrides: Record<string, unknown>,
      sessionOverride = session,
    ) {
      const repository = store(rawContext({
        entitlement: {
          ...rawContext().entitlement,
          action: operation === "website.preview.read" ? "read" : "write",
        },
        ...overrides,
      }));
      const authorizer = createCalebWebsiteAuthorizer({ repository, audit: repository, now: () => NOW });
      return authorizer.authorize({
        siteKey: "caleb-jakes-v3",
        session: sessionOverride,
        operation,
        correlationId: "correlation-denied",
      });
    }

    await expect(denied("website.preview.read", { membershipState: "suspended" }))
      .rejects.toMatchObject({ code: "MEMBERSHIP_INACTIVE" });
    await expect(denied("website.preview.read", { role: "staff" }))
      .rejects.toMatchObject({ code: "ROLE_DENIED" });
    await expect(denied("website.preview.read", {
      entitlement: { ...rawContext().entitlement, allowed: false },
    })).rejects.toMatchObject({ code: "ENTITLEMENT_DENIED" });
    await expect(denied("website.preview.read", { grants: [{ capability: "leads.read", scope: "site" }] }))
      .rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(denied("website.preview.read", { siteKey: "another-site" }))
      .rejects.toMatchObject({ code: "TENANT_BOUNDARY_DENIED" });
    await expect(denied("website.preview.read", {
      entitlement: { ...rawContext().entitlement, expiresAt: "2026-09-24T15:59:59.000Z" },
    })).rejects.toMatchObject({ code: "ENTITLEMENT_STALE" });
    await expect(denied("website.publish", {}, {
      ...session,
      aal2VerifiedAt: "2026-09-24T15:44:59.000Z",
    })).rejects.toMatchObject({ code: "RECENT_AAL2_REQUIRED" });
  });

  it("derives the fixed site and server-side policy after verifying the session", async () => {
    const repository = store();
    const verifier = { verify: vi.fn().mockResolvedValue(session) };
    const authorizer = createCalebWebsiteAuthorizer({ repository, audit: repository, now: () => NOW });
    const grant = await authorizeCalebWebsiteStaff({
      request: new Request("https://calebjakes.com/admin/editor/website?role=owner&site=other"),
      verifier,
      authorizer,
      operation: "website.preview.read",
      correlationId: "correlation-read",
    });
    expect(grant).toMatchObject({ siteKey: "caleb-jakes-v3", subject: SUBJECT });
  });

  it("requires exact origin, CSRF, idempotency, no authority override, and preserves replay", async () => {
    const repository = store(rawContext({
      entitlement: { ...rawContext().entitlement, action: "write" },
    }));
    const verifier = { verify: vi.fn().mockResolvedValue(session) };
    const authorizer = createCalebWebsiteAuthorizer({ repository, audit: repository, now: () => NOW });
    const headers = {
      origin: "https://calebjakes.com",
      cookie: "builder_csrf=csrf-a",
      "x-csrf-token": "csrf-a",
      "idempotency-key": "publish-a",
    };

    await expect(authorizePrivilegedCalebWebsiteRequest({
      request: request(headers),
      allowedOrigin: "https://calebjakes.com",
      operation: "website.publish",
      correlationId: "correlation-publish",
      untrustedInput: { pagePath: "/" },
      verifier,
      authorizer,
      replayGuard: repository,
    })).resolves.toMatchObject({ replay: false, idempotencyKey: "publish-a" });

    vi.mocked(repository.reservePrivilegedRequest).mockResolvedValueOnce("replay");
    await expect(authorizePrivilegedCalebWebsiteRequest({
      request: request(headers),
      allowedOrigin: "https://calebjakes.com",
      operation: "website.publish",
      correlationId: "correlation-publish",
      untrustedInput: { pagePath: "/" },
      verifier,
      authorizer,
      replayGuard: repository,
    })).resolves.toMatchObject({ replay: true });

    await expect(authorizePrivilegedCalebWebsiteRequest({
      request: request({ ...headers, origin: "https://evil.example" }),
      allowedOrigin: "https://calebjakes.com",
      operation: "website.publish",
      correlationId: "correlation-publish",
      untrustedInput: { pagePath: "/" },
      verifier,
      authorizer,
      replayGuard: repository,
    })).rejects.toMatchObject({ code: "ORIGIN_DENIED" });
    await expect(authorizePrivilegedCalebWebsiteRequest({
      request: request({ ...headers, "x-csrf-token": "wrong" }),
      allowedOrigin: "https://calebjakes.com",
      operation: "website.publish",
      correlationId: "correlation-publish",
      untrustedInput: { pagePath: "/" },
      verifier,
      authorizer,
      replayGuard: repository,
    })).rejects.toMatchObject({ code: "CSRF_DENIED" });
    await expect(authorizePrivilegedCalebWebsiteRequest({
      request: request({ ...headers, "idempotency-key": "" }),
      allowedOrigin: "https://calebjakes.com",
      operation: "website.publish",
      correlationId: "correlation-publish",
      untrustedInput: { pagePath: "/" },
      verifier,
      authorizer,
      replayGuard: repository,
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_REQUIRED" });
    await expect(authorizePrivilegedCalebWebsiteRequest({
      request: request(headers),
      allowedOrigin: "https://calebjakes.com",
      operation: "website.publish",
      correlationId: "correlation-publish",
      untrustedInput: { nested: { actorId: SUBJECT } },
      verifier,
      authorizer,
      replayGuard: repository,
    })).rejects.toMatchObject({ code: "AUTHORITY_OVERRIDE_REJECTED" });
  });

  it("writes a secret-safe denial record with correlation evidence", async () => {
    const repository = store(rawContext({ role: "read_only" }));
    const authorizer = createCalebWebsiteAuthorizer({ repository, audit: repository, now: () => NOW });
    await expect(authorizer.authorize({
      siteKey: "caleb-jakes-v3",
      session,
      operation: "website.preview.read",
      correlationId: "correlation-denial",
    })).rejects.toMatchObject({ code: "ROLE_DENIED" });
    expect(repository.writeDenial).toHaveBeenCalledWith({
      outcome: "denied",
      code: "ROLE_DENIED",
      siteKey: "caleb-jakes-v3",
      subject: SUBJECT,
      capability: "preview.read",
      operation: "website.preview.read",
      correlationId: "correlation-denial",
    });
    expect(JSON.stringify(vi.mocked(repository.writeDenial).mock.calls[0])).not.toContain("session-a");
  });
});
