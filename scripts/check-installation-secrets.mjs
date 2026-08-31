import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const DATABASE_URL = /postgres(?:ql)?:\/\/[^\s"']+/gi;
const SECRET_PATTERNS = [
  /"d"\s*:\s*"[A-Za-z0-9_-]{43}"/,
  /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/,
  /\bwhsec_[A-Za-z0-9]{16,}\b/,
  /\bre_[A-Za-z0-9]{24,}\b/,
];

function containsSecret(text) {
  for (const match of text.matchAll(DATABASE_URL)) {
    try {
      const url = new URL(match[0]);
      const fixtureHost = url.hostname.includes("example") || url.hostname.endsWith(".test");
      if (!fixtureHost && url.username !== "" && url.password !== "") return true;
    } catch {
      return true;
    }
  }
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

async function trackedFiles(projectDir) {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
    cwd: projectDir,
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.toString("utf8").split("\0").filter(Boolean);
}

export async function scanInstallationSecrets({ projectDir, files }) {
  const candidates = files ?? await trackedFiles(projectDir);
  const unsafe = [];
  for (const file of candidates) {
    let text;
    try {
      text = await readFile(resolve(projectDir, file), "utf8");
    } catch {
      continue;
    }
    if (containsSecret(text)) unsafe.push(file.replaceAll("\\", "/"));
  }
  unsafe.sort();
  return { ok: unsafe.length === 0, files: unsafe };
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invoked) {
  const result = await scanInstallationSecrets({
    projectDir: fileURLToPath(new URL("../", import.meta.url)),
  });
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
