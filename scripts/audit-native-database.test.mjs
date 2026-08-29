import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  compareMigrationState,
  loadMigrationManifest,
} from "./audit-native-database.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function manifest() {
  const root = mkdtempSync(join(tmpdir(), "native-migrations-"));
  roots.push(root);
  writeFileSync(join(root, "0001_base.sql"), "select 1;\n");
  writeFileSync(join(root, "0002_native.sql"), "select 2;\n");
  return loadMigrationManifest(root);
}

describe("native database audit", () => {
  it("computes a sequential manifest and pending suffix", () => {
    const expected = manifest();
    const state = compareMigrationState(expected, [expected[0]]);

    expect(state).toMatchObject({ drift: [], hasGap: false });
    expect(state.pending.map(({ name }) => name)).toEqual(["0002_native.sql"]);
  });

  it("detects changed checksums and installed gaps", () => {
    const expected = manifest();
    const changed = createHash("sha256").update("changed").digest("hex");
    const state = compareMigrationState(expected, [
      { name: expected[1].name, checksum: changed },
    ]);

    expect(state.drift).toHaveLength(1);
    expect(state.hasGap).toBe(true);
  });
});
