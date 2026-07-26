function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export function withBasePath(
  path: string,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "",
): string {
  const normalizedBasePath = normalizeBasePath(basePath);
  if (
    !normalizedBasePath ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path === normalizedBasePath ||
    path.startsWith(`${normalizedBasePath}/`)
  ) {
    return path;
  }

  return `${normalizedBasePath}${path}`;
}
