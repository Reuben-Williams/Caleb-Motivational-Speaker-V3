export const STAFF_EDITOR_PATH = "/admin/editor";

export function resolveStaffEditorReturnPath(
  candidate: string | string[] | null | undefined,
): typeof STAFF_EDITOR_PATH {
  if (candidate === STAFF_EDITOR_PATH) return candidate;
  return STAFF_EDITOR_PATH;
}

export function staffLoginPath(): string {
  const params = new URLSearchParams({ next: STAFF_EDITOR_PATH });
  return `/admin/login?${params.toString()}`;
}
