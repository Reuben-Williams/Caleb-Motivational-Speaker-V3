import type { EditableValue, PageContent } from "@reuben-williams/core";

export type CalebResolvedPageContent = Pick<PageContent, "path" | "regions">;

export function resolvedText(
  content: CalebResolvedPageContent,
  regionId: string,
): string {
  const value = content.regions[regionId];
  if (!value || value.type !== "text") {
    throw new Error(`Missing resolved text region: ${regionId}`);
  }
  return value.value;
}

export function resolvedImage(
  content: CalebResolvedPageContent,
  regionId: string,
): Extract<EditableValue, { type: "image" }> & { mediaId: string; alt: string } {
  const value = content.regions[regionId];
  if (!value || value.type !== "image" || !value.mediaId || !value.alt) {
    throw new Error(`Missing resolved image region: ${regionId}`);
  }
  return value as Extract<EditableValue, { type: "image" }> & {
    mediaId: string;
    alt: string;
  };
}
