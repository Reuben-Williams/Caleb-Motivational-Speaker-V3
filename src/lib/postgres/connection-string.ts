const LEGACY_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export class PostgresConnectionStringError extends Error {
  readonly code = "postgres_connection_string_invalid";

  constructor() {
    super("postgres_connection_string_invalid");
    this.name = "PostgresConnectionStringError";
  }
}

export function normalizePostgresConnectionString(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PostgresConnectionStringError();
  }

  if (
    (url.protocol !== "postgresql:" && url.protocol !== "postgres:") ||
    !url.username ||
    !url.password ||
    !url.hostname ||
    url.pathname.length < 2
  ) {
    throw new PostgresConnectionStringError();
  }

  const sslmode = url.searchParams.get("sslmode")?.toLowerCase();
  if (sslmode && LEGACY_SSL_MODES.has(sslmode)) {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}
