import type { EditableValue } from "@reuben-williams/core";

import { getCalebSeedMedia } from "./media-seed-catalog";
import type { CalebEditorRegionDefinition } from "./site-config";

export type CalebContentValidationCode =
  | "invalid_value"
  | "value_type_not_allowed"
  | "value_type_mismatch"
  | "metadata_not_allowed"
  | "required_value_missing"
  | "value_too_long"
  | "control_character_not_allowed"
  | "markup_not_allowed"
  | "unknown_media"
  | "image_src_not_allowed";

export class CalebContentValidationError extends Error {
  constructor(
    public readonly code: CalebContentValidationCode,
    message = code,
  ) {
    super(message);
    this.name = "CalebContentValidationError";
  }
}

interface ResolvedCalebMedia {
  path: string;
}

export interface CalebContentValidationOptions {
  phase: "draft" | "publish";
  resolveMedia?: (mediaId: string) => ResolvedCalebMedia | undefined;
}

const FORBIDDEN_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;
const MARKUP_PATTERNS = [
  /<\/?[a-z][^>]*>/iu,
  /!?\[[^\]]+\]\([^)]+\)/u,
  /```|`[^`]+`/u,
  /^\s{0,3}#{1,6}\s+/mu,
  /^\s*(?:[-+*]|\d+\.)\s+/mu,
  /^\s*>\s+/mu,
  /(?:\*\*|__)[^\n]+(?:\*\*|__)/u,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const observed = Object.keys(value).sort();
  const expected = [...keys].sort();
  return observed.length === expected.length && observed.every((key, index) => key === expected[index]);
}

function normalizePlainText(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").normalize("NFC").trim();
}

function assertPlainText(value: string): void {
  if (FORBIDDEN_CONTROL_CHARACTERS.test(value)) {
    throw new CalebContentValidationError("control_character_not_allowed");
  }
  if (MARKUP_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new CalebContentValidationError("markup_not_allowed");
  }
}

function assertLength(
  region: CalebEditorRegionDefinition,
  value: string,
  phase: "draft" | "publish",
): void {
  if (!value && (region.kind === "image" || (region.required && phase === "publish"))) {
    throw new CalebContentValidationError("required_value_missing");
  }
  if (Array.from(value).length > region.maxCodePoints) {
    throw new CalebContentValidationError("value_too_long");
  }
}

export function validateCalebEditableValue(
  region: CalebEditorRegionDefinition,
  value: unknown,
  options: CalebContentValidationOptions,
): EditableValue {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new CalebContentValidationError("invalid_value");
  }
  if (value.type !== "text" && value.type !== "image") {
    throw new CalebContentValidationError("value_type_not_allowed");
  }
  if (value.type !== region.kind) {
    throw new CalebContentValidationError("value_type_mismatch");
  }

  if (value.type === "text") {
    if (!hasExactKeys(value, ["type", "value"])) {
      throw new CalebContentValidationError("metadata_not_allowed");
    }
    if (typeof value.value !== "string") {
      throw new CalebContentValidationError("invalid_value");
    }
    const normalized = normalizePlainText(value.value);
    assertPlainText(normalized);
    assertLength(region, normalized, options.phase);
    return { type: "text", value: normalized };
  }

  if (!hasExactKeys(value, ["type", "mediaId", "src", "alt"])) {
    throw new CalebContentValidationError("metadata_not_allowed");
  }
  if (
    typeof value.mediaId !== "string" ||
    typeof value.src !== "string" ||
    typeof value.alt !== "string"
  ) {
    throw new CalebContentValidationError("invalid_value");
  }

  const mediaId = value.mediaId.trim();
  const seed = getCalebSeedMedia(mediaId);
  const media = options.resolveMedia?.(mediaId) ?? seed;
  if (!media) throw new CalebContentValidationError("unknown_media");
  if (!media.path.startsWith("/") || value.src !== media.path) {
    throw new CalebContentValidationError("image_src_not_allowed");
  }

  const alt = normalizePlainText(value.alt);
  assertPlainText(alt);
  assertLength(region, alt, options.phase);
  return {
    type: "image",
    mediaId,
    src: media.path,
    alt,
  };
}
