import { z } from "zod";

export const BOOKING_DRAFT_KEY = "caleb-booking-draft:v1";
const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1_000;

export const bookingDraftFieldsSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  workEmail: z.string().trim().email().max(254),
  organization: z.string().trim().min(2).max(150),
  audienceType: z.enum([
    "schools-colleges",
    "faith-community",
    "conference-organization",
    "leadership-male-empowerment",
    "podcast-media",
    "other",
  ]),
  preferredDateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredDateEnd: z
    .string()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/)
    .default(""),
  eventGoals: z.string().trim().min(20).max(2_000),
});

const storedDraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  savedAt: z.number().int().nonnegative(),
  fields: bookingDraftFieldsSchema,
});

export type BookingDraftFields = z.output<typeof bookingDraftFieldsSchema>;

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type DraftReadResult =
  | { status: "empty" }
  | { status: "restored"; fields: BookingDraftFields }
  | { status: "invalid" | "expired" | "unavailable"; message: string };

const restoreFailureMessage =
  "We couldn't restore your saved details. Please continue with the form below.";

export function writeBookingDraft(
  storage: StorageLike,
  fields: BookingDraftFields,
  savedAt = Date.now(),
): boolean {
  try {
    const parsedFields = bookingDraftFieldsSchema.parse(fields);
    storage.setItem(
      BOOKING_DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt,
        fields: parsedFields,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readBookingDraft(
  storage: StorageLike,
  now = Date.now(),
): DraftReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(BOOKING_DRAFT_KEY);
  } catch {
    return {
      status: "unavailable",
      message:
        "Saved details are unavailable in this browser. You can still complete the form below.",
    };
  }

  if (raw === null) {
    return { status: "empty" };
  }

  try {
    const parsed = storedDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      storage.removeItem(BOOKING_DRAFT_KEY);
      return { status: "invalid", message: restoreFailureMessage };
    }
    if (now - parsed.data.savedAt > DRAFT_TTL_MS) {
      storage.removeItem(BOOKING_DRAFT_KEY);
      return {
        status: "expired",
        message:
          "Your saved booking draft expired. Please continue with the form below.",
      };
    }
    return { status: "restored", fields: parsed.data.fields };
  } catch {
    try {
      storage.removeItem(BOOKING_DRAFT_KEY);
    } catch {
      return {
        status: "unavailable",
        message:
          "Saved details are unavailable in this browser. You can still complete the form below.",
      };
    }
    return { status: "invalid", message: restoreFailureMessage };
  }
}

export function clearBookingDraft(storage: StorageLike): void {
  try {
    storage.removeItem(BOOKING_DRAFT_KEY);
  } catch {
    // Clearing is best effort. Submission and manual entry remain available.
  }
}
