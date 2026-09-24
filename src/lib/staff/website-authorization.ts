import "server-only";

import { createHash } from "node:crypto";

import {
  AAL2_MAX_AGE_SECONDS,
  GROWTH_CAPABILITIES,
  WEBSITE_CAPABILITIES,
  type BuilderCapabilityScope,
  type StaffRole,
  type WebsiteCapability,
} from "@reuben-williams/core";
import type {
  StaffSessionVerifier,
  VerifiedStaffSession,
} from "@reuben-williams/next/auth";

import { CALEB_SITE_KEY } from "@/lib/staff/authorization";

export type CalebWebsiteOperation =
  | "website.preview.read"
  | "website.history.read"
  | "website.draft.save"
  | "website.publish"
  | "website.rollback"
  | "website.media.upload"
  | "website.revalidation.retry";

export type CalebWebsiteAuthorizationErrorCode =
  | "SESSION_EXPIRED"
  | "MEMBERSHIP_REQUIRED"
  | "MEMBERSHIP_INACTIVE"
  | "TENANT_BOUNDARY_DENIED"
  | "ROLE_DENIED"
  | "CAPABILITY_DENIED"
  | "ENTITLEMENT_DENIED"
  | "ENTITLEMENT_STALE"
  | "AUTHORIZATION_STALE"
  | "RECENT_AAL2_REQUIRED";

export type CalebWebsitePrivilegedRequestErrorCode =
  | "AUTHORITY_OVERRIDE_REJECTED"
  | "ORIGIN_DENIED"
  | "CSRF_DENIED"
  | "IDEMPOTENCY_REQUIRED"
  | "REPLAY_CONFLICT";

export class CalebWebsiteAuthorizationError extends Error {
  constructor(
    public readonly code: CalebWebsiteAuthorizationErrorCode,
    public readonly status: 401 | 403 | 409 = 403,
  ) {
    super("This staff account is not authorized for the requested website action.");
    this.name = "CalebWebsiteAuthorizationError";
  }
}

export class CalebWebsiteAuthorizationStoreError extends Error {
  readonly code = "WEBSITE_AUTH_STORE_INVALID";
  readonly retryable = true;

  constructor() {
    super("Website authorization state is temporarily unavailable.");
    this.name = "CalebWebsiteAuthorizationStoreError";
  }
}

export class CalebWebsitePrivilegedRequestError extends Error {
  constructor(
    public readonly code: CalebWebsitePrivilegedRequestErrorCode,
    public readonly status: 400 | 403 | 409,
  ) {
    super("The privileged website request could not be accepted.");
    this.name = "CalebWebsitePrivilegedRequestError";
  }
}

type WebsitePolicy = Readonly<{
  capability: WebsiteCapability;
  action: "read" | "write";
  requiresRecentAal2: boolean;
}>;

export const CALEB_WEBSITE_OPERATION_POLICIES: Readonly<
  Record<CalebWebsiteOperation, WebsitePolicy>
> = Object.freeze({
  "website.preview.read": Object.freeze({
    capability: "preview.read",
    action: "read",
    requiresRecentAal2: false,
  }),
  "website.history.read": Object.freeze({
    capability: "history.read",
    action: "read",
    requiresRecentAal2: false,
  }),
  "website.draft.save": Object.freeze({
    capability: "post.editDraft",
    action: "write",
    requiresRecentAal2: false,
  }),
  "website.publish": Object.freeze({
    capability: "post.publish",
    action: "write",
    requiresRecentAal2: true,
  }),
  "website.rollback": Object.freeze({
    capability: "post.rollback",
    action: "write",
    requiresRecentAal2: true,
  }),
  "website.media.upload": Object.freeze({
    capability: "media.upload",
    action: "write",
    requiresRecentAal2: true,
  }),
  "website.revalidation.retry": Object.freeze({
    capability: "post.publish",
    action: "write",
    requiresRecentAal2: true,
  }),
});

const APPROVED_WEBSITE_CAPABILITIES = new Set<WebsiteCapability>([
  "preview.read",
  "history.read",
  "post.editDraft",
  "post.publish",
  "post.rollback",
  "media.upload",
]);
const PUBLISHED_WEBSITE_CAPABILITIES = new Set<string>(WEBSITE_CAPABILITIES);
const PUBLISHED_GROWTH_CAPABILITIES = new Set<string>(GROWTH_CAPABILITIES);
const ALLOWED_ROLES = new Set<StaffRole>(["owner", "administrator_operator"]);
const ALL_ROLES = new Set<StaffRole>([
  "owner",
  "administrator_operator",
  "staff",
  "read_only",
]);

export interface CalebWebsiteAuthorizationContext {
  readonly siteId: string;
  readonly siteKey: string;
  readonly subject: string;
  readonly role: StaffRole;
  readonly membershipState: "active" | "suspended" | "removed";
  readonly authorizationVersion: number;
  readonly grants: readonly Readonly<{
    capability: WebsiteCapability;
    scope: BuilderCapabilityScope;
  }>[];
  readonly entitlement: Readonly<{
    moduleId: "core.website";
    action: "read" | "write";
    allowed: boolean;
    version: number;
    verifiedAt: string;
    expiresAt: string;
  }>;
}

export interface CalebWebsiteAuthorizationGrant {
  readonly siteId: string;
  readonly siteKey: string;
  readonly subject: string;
  readonly sessionId: string;
  readonly role: "owner" | "administrator_operator";
  readonly capability: WebsiteCapability;
  readonly scope: "site";
  readonly authorizationVersion: number;
  readonly correlationId: string;
}

export interface CalebWebsiteAuthorizationRequest {
  readonly siteKey: string;
  readonly session: VerifiedStaffSession;
  readonly operation: CalebWebsiteOperation;
  readonly correlationId: string;
  readonly expectedAuthorizationVersion?: number;
  readonly expectedEntitlementVersion?: number;
}

export interface CalebWebsiteAuthorizationDenial {
  readonly outcome: "denied";
  readonly code: CalebWebsiteAuthorizationErrorCode;
  readonly siteKey: string;
  readonly subject: string;
  readonly capability: WebsiteCapability;
  readonly operation: CalebWebsiteOperation;
  readonly correlationId: string;
}

export interface CalebWebsiteReplayReceipt {
  readonly siteKey: string;
  readonly subject: string;
  readonly operation: CalebWebsiteOperation;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
}

export interface CalebWebsiteAuthorizationRepository {
  loadContext(
    siteKey: string,
    subject: string,
    requiredModuleAction: Readonly<{ moduleId: "core.website"; action: "read" | "write" }>,
  ): Promise<unknown | null>;
}

export interface CalebWebsiteAuthorizationAuditSink {
  writeDenial(event: CalebWebsiteAuthorizationDenial): Promise<void>;
}

export interface CalebWebsiteReplayGuard {
  reservePrivilegedRequest(
    receipt: CalebWebsiteReplayReceipt,
  ): Promise<"reserved" | "replay" | "conflict">;
}

export interface CalebWebsiteAuthorizationStore
  extends CalebWebsiteAuthorizationRepository,
    CalebWebsiteAuthorizationAuditSink,
    CalebWebsiteReplayGuard {
  isSessionRevoked(sessionId: string, subject: string): Promise<boolean>;
}

export interface CalebWebsiteAuthorizer {
  authorize(request: CalebWebsiteAuthorizationRequest): Promise<CalebWebsiteAuthorizationGrant>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isoDate(value: unknown): value is string {
  return nonEmpty(value) && !Number.isNaN(Date.parse(value));
}

function invalidStore(): never {
  throw new CalebWebsiteAuthorizationStoreError();
}

export function parseCalebWebsiteAuthorizationContext(
  value: unknown,
): CalebWebsiteAuthorizationContext | null {
  if (value === null) return null;
  if (!isRecord(value)) invalidStore();
  const role = value.role;
  const membershipState = value.membershipState;
  const entitlement = value.entitlement;
  if (
    !nonEmpty(value.siteId) ||
    !nonEmpty(value.siteKey) ||
    !nonEmpty(value.subject) ||
    typeof role !== "string" ||
    !ALL_ROLES.has(role as StaffRole) ||
    (membershipState !== "active" && membershipState !== "suspended" && membershipState !== "removed") ||
    !positiveInteger(value.authorizationVersion) ||
    !Array.isArray(value.grants) ||
    !isRecord(entitlement)
  ) invalidStore();

  const grants = value.grants.flatMap((row) => {
    if (!isRecord(row) || typeof row.capability !== "string") invalidStore();
    const capability = row.capability;
    if (APPROVED_WEBSITE_CAPABILITIES.has(capability as WebsiteCapability)) {
      if (row.scope !== "site") invalidStore();
      return [Object.freeze({
        capability: capability as WebsiteCapability,
        scope: "site" as const,
      })];
    }
    if (PUBLISHED_WEBSITE_CAPABILITIES.has(capability)) invalidStore();
    if (PUBLISHED_GROWTH_CAPABILITIES.has(capability)) return [];
    invalidStore();
  });

  if (
    entitlement.moduleId !== "core.website" ||
    (entitlement.action !== "read" && entitlement.action !== "write") ||
    typeof entitlement.allowed !== "boolean" ||
    !positiveInteger(entitlement.version) ||
    !isoDate(entitlement.verifiedAt) ||
    !isoDate(entitlement.expiresAt)
  ) invalidStore();

  return Object.freeze({
    siteId: value.siteId,
    siteKey: value.siteKey,
    subject: value.subject,
    role: role as StaffRole,
    membershipState,
    authorizationVersion: value.authorizationVersion,
    grants: Object.freeze(grants),
    entitlement: Object.freeze({
      moduleId: "core.website" as const,
      action: entitlement.action,
      allowed: entitlement.allowed,
      version: entitlement.version,
      verifiedAt: entitlement.verifiedAt,
      expiresAt: entitlement.expiresAt,
    }),
  });
}

function parsedDate(value: string): Date | undefined {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function deny(
  audit: CalebWebsiteAuthorizationAuditSink,
  request: CalebWebsiteAuthorizationRequest,
  capability: WebsiteCapability,
  code: CalebWebsiteAuthorizationErrorCode,
  status: 401 | 403 | 409 = 403,
): Promise<never> {
  await audit.writeDenial(Object.freeze({
    outcome: "denied",
    code,
    siteKey: request.siteKey,
    subject: request.session.subject,
    capability,
    operation: request.operation,
    correlationId: request.correlationId,
  }));
  throw new CalebWebsiteAuthorizationError(code, status);
}

export function createCalebWebsiteAuthorizer(input: Readonly<{
  repository: CalebWebsiteAuthorizationRepository;
  audit: CalebWebsiteAuthorizationAuditSink;
  now?: () => Date;
}>): CalebWebsiteAuthorizer {
  const now = input.now ?? (() => new Date());
  return Object.freeze({
    async authorize(request: CalebWebsiteAuthorizationRequest) {
      const policy = CALEB_WEBSITE_OPERATION_POLICIES[request.operation];
      const currentTime = now();
      const sessionExpiry = parsedDate(request.session.expiresAt);
      if (!sessionExpiry || sessionExpiry.getTime() <= currentTime.getTime()) {
        return deny(input.audit, request, policy.capability, "SESSION_EXPIRED", 401);
      }

      const raw = await input.repository.loadContext(
        request.siteKey,
        request.session.subject,
        { moduleId: "core.website", action: policy.action },
      );
      const context = parseCalebWebsiteAuthorizationContext(raw);
      if (!context) return deny(input.audit, request, policy.capability, "MEMBERSHIP_REQUIRED");
      if (context.siteKey !== request.siteKey || context.subject !== request.session.subject) {
        return deny(input.audit, request, policy.capability, "TENANT_BOUNDARY_DENIED");
      }
      if (context.membershipState !== "active") {
        return deny(input.audit, request, policy.capability, "MEMBERSHIP_INACTIVE");
      }
      if (
        request.expectedAuthorizationVersion !== undefined &&
        request.expectedAuthorizationVersion !== context.authorizationVersion
      ) {
        return deny(input.audit, request, policy.capability, "AUTHORIZATION_STALE", 409);
      }
      if (!ALLOWED_ROLES.has(context.role)) {
        return deny(input.audit, request, policy.capability, "ROLE_DENIED");
      }

      const entitlement = context.entitlement;
      if (
        entitlement.moduleId !== "core.website" ||
        entitlement.action !== policy.action ||
        !entitlement.allowed
      ) {
        return deny(input.audit, request, policy.capability, "ENTITLEMENT_DENIED");
      }
      const entitlementExpiry = parsedDate(entitlement.expiresAt);
      if (
        !entitlementExpiry ||
        entitlementExpiry.getTime() <= currentTime.getTime() ||
        (request.expectedEntitlementVersion !== undefined &&
          request.expectedEntitlementVersion !== entitlement.version)
      ) {
        return deny(input.audit, request, policy.capability, "ENTITLEMENT_STALE", 409);
      }
      if (!context.grants.some((grant) => grant.capability === policy.capability)) {
        return deny(input.audit, request, policy.capability, "CAPABILITY_DENIED");
      }
      if (policy.requiresRecentAal2) {
        const verifiedAt = request.session.aal2VerifiedAt
          ? parsedDate(request.session.aal2VerifiedAt)
          : undefined;
        const age = verifiedAt
          ? currentTime.getTime() - verifiedAt.getTime()
          : Number.POSITIVE_INFINITY;
        if (!verifiedAt || age < 0 || age > AAL2_MAX_AGE_SECONDS * 1_000) {
          return deny(input.audit, request, policy.capability, "RECENT_AAL2_REQUIRED");
        }
      }
      return Object.freeze({
        siteId: context.siteId,
        siteKey: context.siteKey,
        subject: context.subject,
        sessionId: request.session.sessionId,
        role: context.role as "owner" | "administrator_operator",
        capability: policy.capability,
        scope: "site" as const,
        authorizationVersion: context.authorizationVersion,
        correlationId: request.correlationId,
      });
    },
  });
}

export async function authorizeCalebWebsiteStaff(input: Readonly<{
  request: Request;
  verifier: StaffSessionVerifier;
  authorizer: CalebWebsiteAuthorizer;
  operation: CalebWebsiteOperation;
  correlationId: string;
}>) {
  const session = await input.verifier.verify(input.request);
  return input.authorizer.authorize({
    siteKey: CALEB_SITE_KEY,
    session,
    operation: input.operation,
    correlationId: input.correlationId,
  });
}

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "actor",
  "actorid",
  "site",
  "siteid",
  "sitekey",
  "role",
  "capability",
  "capabilities",
  "aal",
  "aal2",
  "aal2verifiedat",
  "authorizationversion",
  "subject",
  "sessionid",
  "bucket",
  "objectkey",
  "publicstate",
]);

function assertNoAuthorityOverride(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoAuthorityOverride);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_AUTHORITY_KEYS.has(key.toLowerCase())) {
      throw new CalebWebsitePrivilegedRequestError("AUTHORITY_OVERRIDE_REJECTED", 400);
    }
    assertNoAuthorityOverride(nested);
  }
}

function assertOrigin(request: Request, allowedOrigin: string): void {
  let normalizedAllowed: string;
  try {
    normalizedAllowed = new URL(allowedOrigin).origin;
  } catch {
    throw new TypeError("allowedOrigin must be an absolute origin");
  }
  if (request.headers.get("origin") !== normalizedAllowed) {
    throw new CalebWebsitePrivilegedRequestError("ORIGIN_DENIED", 403);
  }
}

function cookies(value: string): Record<string, string> {
  return Object.fromEntries(value.split(";").flatMap((part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return [];
    return [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]];
  }));
}

function assertCsrf(request: Request): void {
  const header = request.headers.get("x-csrf-token") ?? "";
  const cookie = cookies(request.headers.get("cookie") ?? "").builder_csrf ?? "";
  if (!header || !cookie || header !== cookie || header.length > 256) {
    throw new CalebWebsitePrivilegedRequestError("CSRF_DENIED", 403);
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`).join(",")}}`;
}

export async function authorizePrivilegedCalebWebsiteRequest(input: Readonly<{
  request: Request;
  allowedOrigin: string;
  operation: Exclude<CalebWebsiteOperation, "website.preview.read" | "website.history.read">;
  correlationId: string;
  untrustedInput: unknown;
  verifier: StaffSessionVerifier;
  authorizer: CalebWebsiteAuthorizer;
  replayGuard: CalebWebsiteReplayGuard;
}>) {
  assertNoAuthorityOverride(input.untrustedInput);
  assertOrigin(input.request, input.allowedOrigin);
  assertCsrf(input.request);
  const idempotencyKey = input.request.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/+@-]{0,127}$/.test(idempotencyKey)) {
    throw new CalebWebsitePrivilegedRequestError("IDEMPOTENCY_REQUIRED", 400);
  }
  const session = await input.verifier.verify(input.request);
  const grant = await input.authorizer.authorize({
    siteKey: CALEB_SITE_KEY,
    session,
    operation: input.operation,
    correlationId: input.correlationId,
  });
  const replayResult = await input.replayGuard.reservePrivilegedRequest(Object.freeze({
    siteKey: grant.siteKey,
    subject: grant.subject,
    operation: input.operation,
    idempotencyKey,
    fingerprint: createHash("sha256").update(canonicalJson(input.untrustedInput)).digest("hex"),
  }));
  if (replayResult === "conflict") {
    throw new CalebWebsitePrivilegedRequestError("REPLAY_CONFLICT", 409);
  }
  return Object.freeze({
    grant,
    replay: replayResult === "replay",
    idempotencyKey,
  });
}
