import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import pg from "pg";

const migrationName = /^\d{4}_[a-z0-9_]+\.sql$/;

export const retentionPolicyQuery =
  "select exists(select 1 from public.builder_submission_retention_policies policy join public.builder_sites site on site.id=policy.site_id where site.stable_key=$1 and policy.raw_retention_days=400) as present";

export function loadMigrationManifest(directory) {
  const names = readdirSync(directory)
    .filter((name) => migrationName.test(name))
    .sort();
  if (
    names.length === 0 ||
    names.some((name, index) => !name.startsWith(`${String(index + 1).padStart(4, "0")}_`))
  ) {
    throw new Error("Migration manifest is missing or non-sequential.");
  }
  return names.map((name) => {
    const sql = readFileSync(resolve(directory, name), "utf8");
    if (!sql.trim()) throw new Error(`Migration ${name} is empty.`);
    return {
      name,
      checksum: createHash("sha256").update(sql, "utf8").digest("hex"),
    };
  });
}

export function compareMigrationState(manifest, installed) {
  const expected = new Map(manifest.map((migration) => [migration.name, migration.checksum]));
  const drift = installed.filter((migration) => expected.get(migration.name) !== migration.checksum);
  const installedNames = new Set(installed.map((migration) => migration.name));
  const pending = manifest.filter((migration) => !installedNames.has(migration.name));
  const installedIndexes = installed
    .map((migration) => manifest.findIndex((candidate) => candidate.name === migration.name))
    .filter((index) => index >= 0);
  const hasGap = installedIndexes.some((index, position) => index !== position);
  return { drift, pending, hasGap };
}

async function audit() {
  const connectionString = process.env.DATABASE_URL;
  const directory = process.argv[2];
  if (!connectionString || !directory) {
    throw new Error("DATABASE_URL and the migration directory are required.");
  }
  const target = new URL(connectionString);
  const manifest = loadMigrationManifest(resolve(directory));
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 8_000 });
  await client.connect();
  try {
    const table = await client.query(
      "select to_regclass('public.builder_schema_migrations') is not null as present",
    );
    const installed = table.rows[0]?.present
      ? (
          await client.query(
            "select name, checksum from public.builder_schema_migrations order by name",
          )
        ).rows
      : [];
    const comparison = compareMigrationState(manifest, installed);
    const site = await client.query(
      "select to_regclass('public.builder_sites') is not null as table_present",
    );
    const calebSitePresent = site.rows[0]?.table_present
      ? (
          await client.query(
            "select exists(select 1 from public.builder_sites where stable_key=$1) as present",
            ["caleb-jakes-v3"],
          )
        ).rows[0]?.present === true
      : false;
    const policy = await client.query(
      "select to_regclass('public.builder_submission_retention_policies') is not null as table_present",
    );
    const retentionPolicyPresent = policy.rows[0]?.table_present
      ? (
          await client.query(
            retentionPolicyQuery,
            ["caleb-jakes-v3"],
          )
        ).rows[0]?.present === true
      : false;
    console.log(
      JSON.stringify(
        {
          target: { host: target.hostname, database: target.pathname.replace(/^\//, "") },
          manifestCount: manifest.length,
          installed: installed.map(({ name }) => name),
          pending: comparison.pending.map(({ name }) => name),
          drift: comparison.drift.map(({ name }) => name),
          hasGap: comparison.hasGap,
          calebSitePresent,
          retentionPolicyPresent,
          readyToApply:
            comparison.drift.length === 0 &&
            !comparison.hasGap &&
            comparison.pending[0]?.name.startsWith("0010_") === true,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  audit().catch((error) => {
    const message = error instanceof Error && /^(DATABASE_URL|Migration manifest)/.test(error.message)
      ? error.message
      : "Database audit failed without exposing target credentials.";
    console.error(message);
    process.exitCode = 1;
  });
}
