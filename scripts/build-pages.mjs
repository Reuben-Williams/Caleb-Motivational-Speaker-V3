import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  rename,
  rm,
} from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const stagingRoot = path.join(root, ".pages-staging");
const outDir = path.join(root, "out");
const normalDistDir = path.join(root, ".next");
const legacyPagesDistDir = path.join(root, ".next-pages");
const nextCli = path.join(
  root,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const stagingEntries = [
  {
    source: path.join(root, "src", "app", "api"),
    destination: path.join(stagingRoot, "api"),
    required: true,
  },
  {
    source: path.join(
      root,
      "public",
      "media",
      "video",
      "caleb-speaker-reel-1080.mp4",
    ),
    destination: path.join(stagingRoot, "caleb-speaker-reel-1080.mp4"),
    required: false,
  },
];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

if (await exists(stagingRoot)) {
  throw new Error(
    `Pages staging already exists at ${stagingRoot}. Restore or remove it before building.`,
  );
}

await rm(outDir, { recursive: true, force: true });
await rm(normalDistDir, { recursive: true, force: true });
await rm(legacyPagesDistDir, { recursive: true, force: true });
await mkdir(stagingRoot, { recursive: true });

const movedEntries = [];

try {
  for (const entry of stagingEntries) {
    if (!(await exists(entry.source))) {
      if (entry.required) {
        throw new Error(`Required Pages staging source is missing: ${entry.source}`);
      }
      continue;
    }
    await rename(entry.source, entry.destination);
    movedEntries.push(entry);
  }

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextCli, "build"], {
      cwd: root,
      env: {
        ...process.env,
        GITHUB_PAGES: "true",
        NEXT_PUBLIC_SITE_URL: "https://reuben-williams.github.io",
        NEXT_PUBLIC_STATIC_PREVIEW: "true",
      },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`GitHub Pages build failed with exit code ${exitCode}.`);
  }
} finally {
  for (const entry of movedEntries.reverse()) {
    if (await exists(entry.destination)) {
      await rename(entry.destination, entry.source);
    }
  }
  await rm(stagingRoot, { recursive: true, force: true });
}
