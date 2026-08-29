import { randomUUID } from "node:crypto";

import type { GrowthCapability } from "@reuben-williams/core";
import {
  createBuilderServerClient,
  type BuilderCookieAdapter,
} from "@reuben-williams/next/auth";
import {
  authorizePrivilegedStaffRequest,
  createPostgresStaffAuthorizationAdapters,
} from "@reuben-williams/next/auth/server";
import {
  createDataPlaneSession,
  type DataPlaneDatabase,
} from "@reuben-williams/next/database";
import { createPostgresDataPlane } from "@reuben-williams/next/database/server";
import { Pool } from "pg";

import {
  authorizeCalebStaff,
  createCalebStaffAuthorizer,
} from "@/lib/staff/authorization";
import { PostgresSpeakingLeadRepository } from "@/lib/staff/lead-repository";
import { createCalebStaffSessionVerifier } from "@/lib/staff/session";

type Environment = Record<string, string | undefined>;
type Diagnostic = Readonly<{
  code: "missing_configuration" | "invalid_configuration";
  component: string;
}>;

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
  if (
    !cachedPool ||
    !cachedDatabase ||
    cachedConnectionString !== connectionString
  ) {
    cachedPool = new Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    cachedDatabase = createPostgresDataPlane({
      connectionString,
      maximumPoolSize: 4,
    });
    cachedConnectionString = connectionString;
  }
  return { pool: cachedPool, database: cachedDatabase };
}

function repository(
  database: DataPlaneDatabase,
  grant: Readonly<{ siteId: string; subject: string }>,
  capabilities: readonly GrowthCapability[],
) {
  const session = createDataPlaneSession({
    siteId: grant.siteId,
    memberId: grant.subject,
    capabilities,
  });
  return new PostgresSpeakingLeadRepository({ database, session });
}

export function createCalebStaffRuntime(
  environment: Environment,
  cookies: BuilderCookieAdapter,
  reportDiagnostic: (diagnostic: Diagnostic) => void = (diagnostic) =>
    console.error("Caleb staff runtime configuration", diagnostic),
) {
  const missing = requiredKeys.find((key) => !environment[key]?.trim());
  if (missing) {
    reportDiagnostic({ code: "missing_configuration", component: missing });
    return null;
  }
  try {
    const { pool, database } = resources(environment.DATABASE_URL!);
    const adapters = createPostgresStaffAuthorizationAdapters({ pool });
    const client = createBuilderServerClient({
      url: environment.STAFF_AUTH_URL!,
      publishableKey: environment.STAFF_AUTH_PUBLISHABLE_KEY!,
      cookies,
    });
    const verifier = createCalebStaffSessionVerifier({
      client,
      expectedIssuer: environment.STAFF_AUTH_EXPECTED_ISSUER!,
      expectedAudience: environment.STAFF_AUTH_EXPECTED_AUDIENCE!,
      revocations: adapters.revocations,
    });
    const authorizer = createCalebStaffAuthorizer({
      repository: adapters.repository,
      audit: adapters.audit,
    });
    return Object.freeze({
      async authorizeRead(
        request: Request,
        capabilities: readonly GrowthCapability[],
      ) {
        if (capabilities.length < 1) throw new Error("Staff capabilities are required.");
        let grant;
        for (const capability of capabilities) {
          const current = await authorizeCalebStaff({
            request,
            verifier,
            authorizer,
            capability,
            moduleAction: "read",
            correlationId: randomUUID(),
          });
          grant ??= current;
        }
        return Object.freeze({
          grant: grant!,
          repository: repository(database, grant!, capabilities),
        });
      },
      async authorizeMutation(
        request: Request,
        capability: GrowthCapability,
        untrustedInput: unknown,
      ) {
        const result = await authorizePrivilegedStaffRequest({
          request,
          allowedOrigin: environment.NEXT_PUBLIC_SITE_URL!,
          siteKey: "caleb-jakes-v3",
          requiredCapability: capability,
          operation: "commerce.view",
          requiredModuleAction: { moduleId: "growth-leads", action: "write" },
          correlationId: randomUUID(),
          untrustedInput,
          verifier,
          authorizer,
          replayGuard: adapters.replayGuard,
        });
        return Object.freeze({
          ...result,
          repository: repository(database, result.grant, [capability]),
        });
      },
    });
  } catch {
    reportDiagnostic({
      code: "invalid_configuration",
      component: "staff_runtime",
    });
    return null;
  }
}
