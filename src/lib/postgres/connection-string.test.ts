import { describe, expect, it } from "vitest";

import {
  PostgresConnectionStringError,
  normalizePostgresConnectionString,
} from "@/lib/postgres/connection-string";

describe("Postgres connection-string normalization", () => {
  it.each(["require", "prefer", "verify-ca"])(
    "upgrades sslmode=%s to verify-full",
    (sslmode) => {
      const normalized = normalizePostgresConnectionString(
        `postgresql://user:secret@db.example.test/caleb?sslmode=${sslmode}&channel_binding=require`,
      );
      const url = new URL(normalized);

      expect(url.searchParams.get("sslmode")).toBe("verify-full");
      expect(url.searchParams.get("channel_binding")).toBe("require");
    },
  );

  it("keeps verify-full and never returns credentials through an error", () => {
    expect(
      normalizePostgresConnectionString(
        "postgresql://user:secret@db.example.test/caleb?sslmode=verify-full",
      ),
    ).toContain("sslmode=verify-full");

    let failure: unknown;
    try {
      normalizePostgresConnectionString("not-a-secret-connection-string");
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(PostgresConnectionStringError);
    expect(String(failure)).not.toContain("not-a-secret-connection-string");
  });
});
