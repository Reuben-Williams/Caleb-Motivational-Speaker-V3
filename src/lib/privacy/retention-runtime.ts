import { Pool } from "pg";

import {
  createRetentionWorker,
  PostgresRetentionRepository,
} from "@/lib/privacy/retention-worker";
import { normalizePostgresConnectionString } from "@/lib/postgres/connection-string";

type Environment = Record<string, string | undefined>;

let cachedConnectionString: string | undefined;
let cachedPool: Pool | undefined;

export function createRetentionRuntime(environment: Environment) {
  const rawConnectionString = environment.DATABASE_URL?.trim();
  const siteId = environment.NATIVE_INQUIRY_SITE_ID?.trim();
  const hmacSecret = environment.INQUIRY_RETENTION_HMAC_SECRET?.trim();
  if (!rawConnectionString || !siteId || !hmacSecret) return null;
  try {
    const connectionString = normalizePostgresConnectionString(
      rawConnectionString,
    );
    if (!cachedPool || cachedConnectionString !== connectionString) {
      cachedPool = new Pool({
        connectionString,
        max: 1,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 10_000,
        allowExitOnIdle: true,
      });
      cachedConnectionString = connectionString;
    }
    return createRetentionWorker({
      repository: new PostgresRetentionRepository({ pool: cachedPool, siteId }),
      hmacSecret,
    });
  } catch {
    return null;
  }
}
