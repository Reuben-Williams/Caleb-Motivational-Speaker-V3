import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const extension = entry.name.endsWith(".tsx") ? ".tsx" : entry.name.endsWith(".ts") ? ".ts" : "";
    return SOURCE_EXTENSIONS.has(extension) ? [path] : [];
  });
}

function patchSourceFile(file) {
  const source = readFileSync(file, "utf8");
  let replacements = 0;
  let patched = source.replace(
    /(["'])(\.\.?\/[^"'`\r\n]+)\.js\1/g,
    (match, quote, relativeTarget) => {
      const target = resolve(dirname(file), relativeTarget);
      if (existsSync(`${target}.js`)) return match;
      const extension = [".ts", ".tsx"].find((candidate) => existsSync(`${target}${candidate}`));
      if (!extension) return match;
      replacements += 1;
      return `${quote}${relativeTarget}${extension}${quote}`;
    },
  );
  // 0.5.0 declares post.editDraft but its data-plane validator omits it.
  // Admit only that exact declared capability; retain all other validation.
  if (file.replaceAll("\\", "/").endsWith("/next/src/database/contracts.ts")) {
    const original = "const CAPABILITY_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+){1,7}$/;";
    const corrected = "const CAPABILITY_PATTERN = /^(?:post\\.editDraft|[a-z][a-z0-9]*(?:[._-][a-z0-9]+){1,7})$/;";
    if (patched.includes(original)) {
      patched = patched.replace(original, corrected);
      replacements += 1;
    } else if (!patched.includes(corrected)) {
      throw new Error("Unexpected 0.5.0 data-plane capability validator; refusing compatibility patch.");
    }
  }
  if (replacements > 0) writeFileSync(file, patched, "utf8");
  return replacements;
}

export function prepareBuilderPackages(
  scopeRoot,
  { expectedVersion = "0.5.0" } = {},
) {
  if (!existsSync(scopeRoot)) {
    throw new Error("The installed @reuben-williams package scope is missing.");
  }

  let packageCount = 0;
  let replacementCount = 0;
  for (const entry of readdirSync(scopeRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageRoot = join(scopeRoot, entry.name);
    const manifestPath = join(packageRoot, "package.json");
    const sourceRoot = join(packageRoot, "src");
    if (!existsSync(manifestPath) || !existsSync(sourceRoot)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.version !== expectedVersion) {
      throw new Error(
        `Refusing to patch @reuben-williams/${entry.name} ${manifest.version}; expected ${expectedVersion}.`,
      );
    }
    packageCount += 1;
    for (const file of sourceFiles(sourceRoot)) {
      replacementCount += patchSourceFile(file);
    }
  }

  if (packageCount === 0) {
    throw new Error("No installed @reuben-williams source packages were found.");
  }
  return { packageCount, replacementCount };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const scopeRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "node_modules",
    "@reuben-williams",
  );
  const result = prepareBuilderPackages(scopeRoot);
  console.log(
    `Prepared ${result.packageCount} exact 0.5.0 builder packages (${result.replacementCount} extension mappings applied).`,
  );
}
