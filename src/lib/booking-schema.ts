import { z } from "zod";

const audienceTypes = [
  "schools-colleges",
  "faith-community",
  "conference-organization",
  "leadership-male-empowerment",
  "podcast-media",
  "other",
] as const;

const eventTypes = [
  "keynote",
  "assembly",
  "faith-event",
  "leadership-seminar",
  "half-day-workshop",
  "full-day-workshop",
  "male-empowerment-event",
  "multi-session",
  "panel",
  "podcast-media",
  "other",
] as const;

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional().default("");

const requiredText = (
  label: string,
  minimum: number,
  maximum: number,
) =>
  z
    .string()
    .trim()
    .min(minimum, `Please enter ${label}.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`);

function newYorkToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = new Map(parts.map(({ type, value }) => [type, value]));
  return `${value.get("year")}-${value.get("month")}-${value.get("day")}`;
}

export const bookingSchema = z
  .object({
    fullName: requiredText("your full name", 2, 100),
    workEmail: z
      .string()
      .trim()
      .min(1, "Please enter your work email.")
      .max(254, "Work email must be 254 characters or fewer.")
      .email("Please enter a valid work email."),
    phone: z
      .string()
      .trim()
      .min(7, "Please enter your phone number.")
      .max(30, "Phone number must be 30 characters or fewer.")
      .regex(
        /^[+\d\s().-]+$/,
        "Please enter a phone number using digits and common punctuation.",
      ),
    organization: requiredText("your organization", 2, 150),
    roleTitle: requiredText("your role or title", 2, 100),
    audienceType: z.enum(audienceTypes, {
      message: "Please choose an audience type.",
    }),
    audienceTypeOther: optionalText(100),
    eventType: z.enum(eventTypes, {
      message: "Please choose an event type.",
    }),
    eventTypeOther: optionalText(100),
    preferredDateStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a preferred date."),
    preferredDateEnd: z
      .string()
      .regex(
        /^$|^\d{4}-\d{2}-\d{2}$/,
        "Please choose a valid end date.",
      )
      .optional()
      .default(""),
    estimatedAudienceSize: z
      .number()
      .int("Please enter a whole-number audience size.")
      .min(1, "Audience size must be at least 1.")
      .max(1_000_000, "Audience size must be 1,000,000 or fewer."),
    eventLocation: requiredText("the event location", 2, 180),
    attendanceMode: z.enum(["in-person", "virtual", "hybrid"], {
      message: "Please choose an attendance mode.",
    }),
    programLength: z.enum(
      [
        "under-45-min",
        "45-60-min",
        "60-90-min",
        "half-day",
        "full-day",
        "multi-session",
        "not-sure",
      ],
      { message: "Please choose a program length." },
    ),
    eventGoals: requiredText("the event goals", 20, 2_000),
    budgetRange: z
      .enum([
        "under-2500",
        "2500-4999",
        "5000-9999",
        "10000-plus",
        "not-sure",
        "prefer-not-to-say",
      ])
      .optional()
      .default("not-sure"),
    referralSource: z.enum(
      ["search", "social", "referral", "event", "podcast-media", "other"],
      { message: "Please choose how you heard about Caleb." },
    ),
    referralSourceOther: optionalText(100),
    additionalDetails: optionalText(3_000),
    consent: z.literal(true, {
      message: "Please read the Privacy Policy and provide consent.",
    }),
    turnstileToken: optionalText(2_048),
    utmSource: optionalText(100),
    utmMedium: optionalText(100),
    utmCampaign: optionalText(100),
    utmTerm: optionalText(100),
    utmContent: optionalText(100),
    referrerPath: z
      .string()
      .trim()
      .max(200)
      .refine(
        (value) => value === "" || (value.startsWith("/") && !value.startsWith("//")),
        "Referrer path must be a same-origin path.",
      )
      .optional()
      .default(""),
  })
  .superRefine((value, context) => {
    if (value.audienceType === "other" && value.audienceTypeOther.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["audienceTypeOther"],
        message: "Please enter the audience type.",
      });
    }
    if (value.eventType === "other" && value.eventTypeOther.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["eventTypeOther"],
        message: "Please enter the event type.",
      });
    }
    if (
      value.referralSource === "other" &&
      value.referralSourceOther.length < 2
    ) {
      context.addIssue({
        code: "custom",
        path: ["referralSourceOther"],
        message: "Please enter how you heard about Caleb.",
      });
    }
    if (value.preferredDateStart < newYorkToday()) {
      context.addIssue({
        code: "custom",
        path: ["preferredDateStart"],
        message: "Please choose today or a future date.",
      });
    }
    if (
      value.preferredDateEnd &&
      value.preferredDateEnd < value.preferredDateStart
    ) {
      context.addIssue({
        code: "custom",
        path: ["preferredDateEnd"],
        message: "Please choose an end date on or after the start date.",
      });
    }
  });

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingData = z.output<typeof bookingSchema>;
export { audienceTypes, eventTypes };
