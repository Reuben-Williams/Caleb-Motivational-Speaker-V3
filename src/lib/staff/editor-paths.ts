export const STAFF_EDITOR_PATH = "/admin/editor";
export const STAFF_WEBSITE_EDITOR_PATH = "/admin/editor/website";
export const STAFF_SPEAKING_ENGAGEMENTS_PATH = "/admin/editor/speaking-engagements";

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
