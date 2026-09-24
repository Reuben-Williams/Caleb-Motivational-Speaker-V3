import "server-only";

import { randomUUID } from "node:crypto";

import {
  createBuilderServerClient,
  type BuilderCookieAdapter,
} from "@reuben-williams/next/auth";
import {
  createDataPlaneSession,
  type DataPlaneDatabase,
} from "@reuben-williams/next/database";
import { createPostgresDataPlane } from "@reuben-williams/next/database/server";
import { Pool } from "pg";

import { normalizePostgresConnectionString } from "@/lib/postgres/connection-string";
import { CalebPostgresContentAdapter } from "@/lib/site-editor/postgres-content-adapter";
import {
  CalebMediaStoreError,
  PostgresMediaStore,
  createSupabaseMediaStorage,
  type CalebMediaStorage,
} from "@/lib/site-editor/media-store";
import { PostgresRevalidationStore } from "@/lib/site-editor/revalidation-store";
import { CALEB_EDITOR_SITE_CONFIG } from "@/lib/site-editor/site-config";
import { createCalebStaffSessionVerifier } from "@/lib/staff/session";
import {
  authorizeCalebWebsiteStaff,
  authorizePrivilegedCalebWebsiteRequest,
  createCalebWebsiteAuthorizer,
  type CalebWebsiteAuthorizationDenial,
  type CalebWebsiteAuthorizationStore,
  type CalebWebsiteOperation,
  type CalebWebsiteReplayReceipt,
} from "@/lib/staff/website-authorization";

type Environment = Record<string, string | undefined>;
type Diagnostic = Readonly<{
  code: "missing_configuration" | "invalid_configuration";
  component: string;
}>;

interface AuthorizationClient {
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{ rows: Record<string, unknown>[]; rowCount: number | null }>>;
  release(): void;
}

interface AuthorizationPool {
  connect(): Promise<AuthorizationClient>;
}

const requiredKeys = [
  "DATABASE_URL",
  "STAFF_AUTH_URL",
  "STAFF_AUTH_PUBLISHABLE_KEY",
  "STAFF_AUTH_EXPECTED_ISSUER",
  "STAFF_AUTH_EXPECTED_AUDIENCE",
  "NEXT_PUBLIC_SITE_URL",
] as const;

let cachedConnectionString: string | undefined;
let cachedPool: Pool | undefined;
let cachedDatabase: DataPlaneDatabase | undefined;

function resources(connectionString: string) {
  const normalized = normalizePostgresConnectionString(connectionString);
  if (!cachedPool || !cachedDatabase || cachedConnectionString !== normalized) {
    cachedPool = new Pool({
      connectionString: normalized,
      max: 4,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    cachedDatabase = createPostgresDataPlane({
      connectionString: normalized,
      maximumPoolSize: 4,
    });
    cachedConnectionString = normalized;
  }
  return { pool: cachedPool, database: cachedDatabase };
}

export function createPostgresCalebWebsiteAuthorizationStore(
  pool: AuthorizationPool,
): CalebWebsiteAuthorizationStore {
  const query = async (sql: string, values: readonly unknown[]) => {
    let client: AuthorizationClient | undefined;
    try {
      client = await pool.connect();
      return (await client.query(sql, values)).rows;
    } finally {
      client?.release();
    }
  };
  return Object.freeze({
    async loadContext(
      siteKey: string,
      subject: string,
      action: Readonly<{ moduleId: "core.website"; action: "read" | "write" }>,
    ) {
      if (action.moduleId !== "core.website") {
        throw new TypeError("Website authorization requires core.website.");
      }
      const rows = await query(
        "select builder_private.staff_authorization_context_v1($1, $2::uuid, $3, $4) as context",
        [siteKey, subject, "core.website", action.action],
      );
      return rows[0]?.context ?? null;
    },
    async isSessionRevoked(sessionId: string, subject: string) {
      const rows = await query(
        "select builder_private.staff_session_revoked_v1($1, $2::uuid) as result",
        [sessionId, subject],
      );
      if (typeof rows[0]?.result !== "boolean") {
        throw new Error("Website authorization revocation state is unavailable.");
      }
      return rows[0].result;
    },
    async writeDenial(event: CalebWebsiteAuthorizationDenial) {
      await query(
        "select builder_private.record_staff_authorization_denial_v1($1::jsonb)",
        [JSON.stringify(event)],
      );
    },
    async reservePrivilegedRequest(receipt: CalebWebsiteReplayReceipt) {
      const rows = await query(
        "select builder_private.reserve_staff_privileged_request_v1($1, $2::uuid, $3, $4, $5) as result",
        [
          receipt.siteKey,
          receipt.subject,
          receipt.operation,
          receipt.idempotencyKey,
          receipt.fingerprint,
        ],
      );
      const result = rows[0]?.result;
      return result === "reserved" || result === "replay" || result === "conflict"
        ? result
        : "conflict";
    },
  });
}

function siteSession(
  database: DataPlaneDatabase,
  grant: Readonly<{ siteId: string; subject: string; capability: string }>,
  storage: CalebMediaStorage,
) {
  const session = createDataPlaneSession({
    siteId: grant.siteId,
    memberId: grant.subject,
    capabilities: [grant.capability],
  });
  return Object.freeze({
    adapter: new CalebPostgresContentAdapter({ database, session }),
    media: new PostgresMediaStore({ database, session, storage }),
    revalidation: new PostgresRevalidationStore({ database, session }),
  });
}

const unavailableMediaStorage: CalebMediaStorage = Object.freeze({
  async upload() { throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503); },
  async remove() { throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503); },
  async download() { throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503); },
});

function mediaStorage(environment: Environment): CalebMediaStorage {
  const url = environment.SITE_MEDIA_SUPABASE_URL?.trim();
  const serviceRoleKey = environment.SITE_MEDIA_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = environment.SITE_MEDIA_SUPABASE_BUCKET?.trim();
  if (!url || !serviceRoleKey || !bucket) return unavailableMediaStorage;
  return createSupabaseMediaStorage({ url, serviceRoleKey, bucket });
}

export function createCalebWebsiteRuntime(
  environment: Environment,
  cookies: BuilderCookieAdapter,
  reportDiagnostic: (diagnostic: Diagnostic) => void = (diagnostic) =>
    console.error("Caleb website runtime configuration", diagnostic),
) {
  const missing = requiredKeys.find((key) => !environment[key]?.trim());
  if (missing) {
    reportDiagnostic({ code: "missing_configuration", component: missing });
    return null;
  }
  try {
    const { pool, database } = resources(environment.DATABASE_URL!);
    const storage = mediaStorage(environment);
    const store = createPostgresCalebWebsiteAuthorizationStore(pool);
    const client = createBuilderServerClient({
      url: environment.STAFF_AUTH_URL!,
      publishableKey: environment.STAFF_AUTH_PUBLISHABLE_KEY!,
      cookies,
    });
    const verifier = createCalebStaffSessionVerifier({
      client,
      expectedIssuer: environment.STAFF_AUTH_EXPECTED_ISSUER!,
      expectedAudience: environment.STAFF_AUTH_EXPECTED_AUDIENCE!,
      revocations: { isRevoked: store.isSessionRevoked },
    });
    const authorizer = createCalebWebsiteAuthorizer({ repository: store, audit: store });
    return Object.freeze({
      async authorizeRead(
        request: Request,
        operation: Extract<CalebWebsiteOperation, "website.preview.read" | "website.history.read">,
      ) {
        const grant = await authorizeCalebWebsiteStaff({
          request,
          verifier,
          authorizer,
          operation,
          correlationId: randomUUID(),
        });
        return Object.freeze({ grant, ...siteSession(database, grant, storage) });
      },
      async authorizeMutation(
        request: Request,
        operation: Exclude<CalebWebsiteOperation, "website.preview.read" | "website.history.read">,
        untrustedInput: unknown,
      ) {
        const result = await authorizePrivilegedCalebWebsiteRequest({
          request,
          allowedOrigin: environment.NEXT_PUBLIC_SITE_URL!,
          operation,
          correlationId: randomUUID(),
          untrustedInput,
          verifier,
          authorizer,
          replayGuard: store,
        });
        return Object.freeze({
          ...result,
          ...siteSession(database, result.grant, storage),
        });
      },
    });
  } catch {
    reportDiagnostic({ code: "invalid_configuration", component: "website_runtime" });
    return null;
  }
}

const MEDIA_DELIVERY_MEMBER_ID = "00000000-0000-4000-8000-000000000016";

export function createCalebPublicMediaStore(environment: Environment) {
  if (!environment.DATABASE_URL?.trim() ||
    !environment.SITE_MEDIA_SUPABASE_URL?.trim() ||
    !environment.SITE_MEDIA_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !environment.SITE_MEDIA_SUPABASE_BUCKET?.trim()) return null;
  try {
    const { database } = resources(environment.DATABASE_URL);
    const session = createDataPlaneSession({
      siteId: CALEB_EDITOR_SITE_CONFIG.siteId,
      memberId: MEDIA_DELIVERY_MEMBER_ID,
      capabilities: ["preview.read"],
    });
    return new PostgresMediaStore({ database, session, storage: mediaStorage(environment) });
  } catch {
    return null;
  }
}

const REVALIDATION_WORKER_ID = "00000000-0000-4000-8000-000000000015";

export function createCalebRevalidationWorkerStore(environment: Environment) {
  if (!environment.DATABASE_URL?.trim()) return null;
  try {
    const { database } = resources(environment.DATABASE_URL);
    const session = createDataPlaneSession({
      siteId: CALEB_EDITOR_SITE_CONFIG.siteId,
      memberId: REVALIDATION_WORKER_ID,
      capabilities: ["post.publish"],
    });
    return new PostgresRevalidationStore({ database, session });
  } catch {
    return null;
  }
}
