import { CALEB_EDITOR_SITE_CONFIG } from "./site-config";

const PREFIX = "/admin/editor/preview";

function declared(path: string) {
  if (!CALEB_EDITOR_SITE_CONFIG.pages.some((page) => page.path === path)) {
    throw new Error("PREVIEW_PAGE_UNDECLARED");
  }
  return path;
}

export function publicPathFromPreviewSegments(segments: readonly string[] = []): string {
  if (segments.some((segment) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment))) {
    throw new Error("PREVIEW_PAGE_UNDECLARED");
  }
  return declared(segments.length === 0 ? "/" : `/${segments.join("/")}`);
}

export function calebPreviewPath(publicPath: string): string {
  const canonical = declared(publicPath);
  return canonical === "/" ? PREFIX : `${PREFIX}${canonical}`;
}
