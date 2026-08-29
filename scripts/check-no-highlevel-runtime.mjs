import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const roots = [resolve("src")];
const additionalFiles = [resolve(".env.example")];
const violations = [];

function inspect(path) {
  const relativePath = relative(process.cwd(), path).replaceAll("\\", "/");
  if (/highlevel/i.test(relativePath) || /__fixtures__\/highlevel/i.test(relativePath)) {
    violations.push(`${relativePath}: inactive provider path`);
  }
  const source = readFileSync(path, "utf8");
  for (const [label, pattern] of [
    ["credential or environment read", /HIGHLEVEL_[A-Z0-9_]+/g],
    ["provider hostname", /services\.leadconnectorhq\.com/gi],
    ["provider fixture/import", /(?:__fixtures__\/highlevel|inquiries\/highlevel-)/gi],
  ]) {
    if (pattern.test(source)) violations.push(`${relativePath}: ${label}`);
  }
}

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(?:ts|tsx|js|jsx|json)$/.test(entry)) inspect(path);
  }
}

for (const root of roots) walk(root);
for (const path of additionalFiles) inspect(path);

if (violations.length > 0) {
  console.error("Inactive HighLevel runtime references remain:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("No HighLevel runtime, credential, hostname, import, or fixture references remain.");
