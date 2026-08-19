"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  bookingSchema,
  type BookingInput,
} from "@/lib/booking-schema";
import {
  bookingDraftFieldsSchema,
  clearBookingDraft,
  readBookingDraft,
  writeBookingDraft,
} from "@/lib/booking-draft";
import { withBasePath } from "@/lib/base-path";

export const BOOKING_RECEIPT_KEY = "caleb-booking-receipt:v1";

type BookingFormProps = {
  variant: "compact" | "full";
  initialValues?: Partial<BookingInput>;
  challenge?: ReactNode;
  submissionUnavailableMessage?: string;
};

type FieldErrors = Record<string, string[]>;

const labels: Record<string, string> = {
  fullName: "your full name",
  workEmail: "your work email",
  phone: "your phone number",
  organization: "your organization or institution",
  roleTitle: "your role or title",
  audienceType: "the audience type",
  audienceTypeOther: "the audience description",
  eventType: "the event type",
  eventTypeOther: "the event description",
  preferredDateStart: "the preferred date",
  preferredDateEnd: "the preferred end date",
  estimatedAudienceSize: "the estimated audience size",
  eventLocation: "the event location",
  attendanceMode: "the attendance mode",
  programLength: "the program length",
  eventGoals: "the event goals",
  budgetRange: "the budget range",
  referralSource: "how you heard about Caleb",
  referralSourceOther: "the referral source",
  additionalDetails: "the additional details",
  consent: "privacy consent",
  turnstileToken: "the security check",
};

const audienceOptions = [
  ["", "Choose an audience"],
  ["schools-colleges", "Schools & colleges"],
  ["faith-community", "Churches & faith communities"],
  ["conference-organization", "Conferences & organizations"],
  ["leadership-male-empowerment", "Leadership & male empowerment"],
  ["podcast-media", "Podcast or media"],
  ["other", "Other"],
] as const;

const eventOptions = [
  ["", "Choose an event type"],
  ["keynote", "Keynote"],
  ["assembly", "School or college assembly"],
  ["faith-event", "Faith-based event"],
  ["leadership-seminar", "Leadership seminar"],
  ["half-day-workshop", "Half-day workshop"],
  ["full-day-workshop", "Full-day workshop"],
  ["male-empowerment-event", "Male-empowerment event"],
  ["multi-session", "Multi-session program"],
  ["panel", "Panel appearance"],
  ["podcast-media", "Podcast or media appearance"],
  ["other", "Other"],
] as const;

function FieldMessage({
  field,
  errors,
}: {
  field: string;
  errors: FieldErrors;
}) {
  const message = errors[field]?.[0];
  return message ? (
    <p className="field-error" id={`${field}-error`}>
      {message}
    </p>
  ) : null;
}

function errorProps(field: string, errors: FieldErrors) {
  return {
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  };
}

function valueOf(data: FormData, name: string) {
  return String(data.get(name) ?? "");
}

function getAttribution() {
  const search = new URLSearchParams(window.location.search);
  let referrerPath = "";
  try {
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin) {
        referrerPath = `${referrer.pathname}${referrer.search}`.slice(0, 200);
      }
    }
  } catch {
    referrerPath = "";
  }
  return {
    utmSource: search.get("utm_source") ?? "",
    utmMedium: search.get("utm_medium") ?? "",
    utmCampaign: search.get("utm_campaign") ?? "",
    utmTerm: search.get("utm_term") ?? "",
    utmContent: search.get("utm_content") ?? "",
    referrerPath,
  };
}

export function BookingForm({
  variant,
  initialValues = {},
  challenge,
  submissionUnavailableMessage,
}: BookingFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [audienceType, setAudienceType] = useState(
    initialValues.audienceType ?? "",
  );
  const [eventType, setEventType] = useState(initialValues.eventType ?? "");
  const [referralSource, setReferralSource] = useState(
    initialValues.referralSource ?? "",
  );
  const [restoreMessage, setRestoreMessage] = useState("");

  useEffect(() => {
    if (variant !== "full" || !formRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const restored = readBookingDraft(window.sessionStorage);
      if (restored.status === "restored" && formRef.current) {
        for (const [name, value] of Object.entries(restored.fields)) {
          const control = formRef.current.elements.namedItem(name);
          if (
            control instanceof HTMLInputElement ||
            control instanceof HTMLTextAreaElement ||
            control instanceof HTMLSelectElement
          ) {
            control.value = value;
          }
        }
        setAudienceType(restored.fields.audienceType);
        setRestoreMessage(
          "Your homepage inquiry details were restored. Complete the remaining fields to send your request.",
        );
      } else if (
        restored.status === "expired" ||
        restored.status === "invalid" ||
        restored.status === "unavailable"
      ) {
        setRestoreMessage(restored.message);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [variant]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [errors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (variant === "full" && submissionUnavailableMessage) return;
    setErrors({});
    setFormMessage("");
    const data = new FormData(event.currentTarget);

    if (variant === "compact") {
      const draft = bookingDraftFieldsSchema.safeParse({
        fullName: valueOf(data, "fullName"),
        workEmail: valueOf(data, "workEmail"),
        organization: valueOf(data, "organization"),
        audienceType: valueOf(data, "audienceType"),
        preferredDateStart: valueOf(data, "preferredDateStart"),
        preferredDateEnd: valueOf(data, "preferredDateEnd"),
        eventGoals: valueOf(data, "eventGoals"),
      });
      if (!draft.success) {
        setErrors(draft.error.flatten().fieldErrors);
        return;
      }
      if (!writeBookingDraft(window.sessionStorage, draft.data)) {
        setFormMessage(
          "We couldn't save these details. Use the full booking form to continue.",
        );
        return;
      }
      router.push("/book-caleb?draft=1");
      return;
    }

    const payload = {
      fullName: valueOf(data, "fullName"),
      workEmail: valueOf(data, "workEmail"),
      phone: valueOf(data, "phone"),
      organization: valueOf(data, "organization"),
      roleTitle: valueOf(data, "roleTitle"),
      audienceType: valueOf(data, "audienceType"),
      audienceTypeOther: valueOf(data, "audienceTypeOther"),
      eventType: valueOf(data, "eventType"),
      eventTypeOther: valueOf(data, "eventTypeOther"),
      preferredDateStart: valueOf(data, "preferredDateStart"),
      preferredDateEnd: valueOf(data, "preferredDateEnd"),
      estimatedAudienceSize: Number(
        valueOf(data, "estimatedAudienceSize"),
      ),
      eventLocation: valueOf(data, "eventLocation"),
      attendanceMode: valueOf(data, "attendanceMode"),
      programLength: valueOf(data, "programLength"),
      eventGoals: valueOf(data, "eventGoals"),
      budgetRange: valueOf(data, "budgetRange") || "not-sure",
      referralSource: valueOf(data, "referralSource"),
      referralSourceOther: valueOf(data, "referralSourceOther"),
      additionalDetails: valueOf(data, "additionalDetails"),
      consent: data.get("consent") === "on",
      turnstileToken: valueOf(data, "turnstileToken"),
      ...getAttribution(),
    };
    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setPending(true);
    try {
      const response = await fetch(withBasePath("/api/inquiries"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as {
        code?: string;
        message?: string;
        inquiryId?: string;
        acceptedAt?: string;
        fieldErrors?: FieldErrors;
      };

      if (!response.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        setFormMessage(
          result.message ??
            "The inquiry could not be sent. Call (404) 941-5670 or email info@calebjakes.com.",
        );
        return;
      }
      if (
        !result.inquiryId ||
        !result.acceptedAt ||
        !Number.isFinite(Date.parse(result.acceptedAt))
      ) {
        setFormMessage(
          "The inquiry response was incomplete. Call (404) 941-5670 or email info@calebjakes.com.",
        );
        return;
      }

      window.sessionStorage.setItem(
        BOOKING_RECEIPT_KEY,
        JSON.stringify({
          inquiryId: result.inquiryId,
          acceptedAt: result.acceptedAt,
        }),
      );
      clearBookingDraft(window.sessionStorage);
      router.push("/thank-you");
    } catch {
      setFormMessage(
        "The inquiry could not be sent. Keep your details and try again, call (404) 941-5670, or email info@calebjakes.com.",
      );
    } finally {
      setPending(false);
    }
  }

  const isCompact = variant === "compact";

  return (
    <form
      aria-label="Speaking inquiry"
      className={`booking-form booking-form--${variant}`}
      noValidate
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {restoreMessage ? (
        <p className="form-notice" role="status">
          {restoreMessage}
        </p>
      ) : null}
      {Object.keys(errors).length > 0 ? (
        <div
          className="error-summary"
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
        >
          <h3>Please correct the following fields</h3>
          <ul>
            {Object.keys(errors).map((field) => (
              <li key={field}>
                <a href={`#${field}`}>{labels[field] ?? field}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {formMessage ? (
        <p className="form-message" role="alert">
          {formMessage}
        </p>
      ) : null}
      {variant === "full" && submissionUnavailableMessage ? (
        <p className="form-notice" role="status">
          {submissionUnavailableMessage}
        </p>
      ) : null}

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="fullName">Full name</label>
          <input
            defaultValue={initialValues.fullName}
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            {...errorProps("fullName", errors)}
          />
          <FieldMessage errors={errors} field="fullName" />
        </div>
        <div className="form-field">
          <label htmlFor="workEmail">Work email</label>
          <input
            defaultValue={initialValues.workEmail}
            id="workEmail"
            name="workEmail"
            type="email"
            autoComplete="email"
            {...errorProps("workEmail", errors)}
          />
          <FieldMessage errors={errors} field="workEmail" />
        </div>
        <div className="form-field">
          <label htmlFor="organization">Organization or institution</label>
          <input
            defaultValue={initialValues.organization}
            id="organization"
            name="organization"
            type="text"
            autoComplete="organization"
            {...errorProps("organization", errors)}
          />
          <FieldMessage errors={errors} field="organization" />
        </div>

        {!isCompact ? (
          <>
            <div className="form-field">
              <label htmlFor="phone">Phone number</label>
              <input
                defaultValue={initialValues.phone}
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                {...errorProps("phone", errors)}
              />
              <FieldMessage errors={errors} field="phone" />
            </div>
            <div className="form-field">
              <label htmlFor="roleTitle">Role or title</label>
              <input
                defaultValue={initialValues.roleTitle}
                id="roleTitle"
                name="roleTitle"
                type="text"
                autoComplete="organization-title"
                {...errorProps("roleTitle", errors)}
              />
              <FieldMessage errors={errors} field="roleTitle" />
            </div>
          </>
        ) : null}

        <div className="form-field">
          <label htmlFor="audienceType">Audience type</label>
          <select
            defaultValue={initialValues.audienceType}
            id="audienceType"
            name="audienceType"
            onChange={(event) => setAudienceType(event.currentTarget.value)}
            {...errorProps("audienceType", errors)}
          >
            {audienceOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <FieldMessage errors={errors} field="audienceType" />
        </div>
        {!isCompact && audienceType === "other" ? (
          <div className="form-field">
            <label htmlFor="audienceTypeOther">
              Describe the audience type
            </label>
            <input
              defaultValue={initialValues.audienceTypeOther}
              id="audienceTypeOther"
              name="audienceTypeOther"
              type="text"
              {...errorProps("audienceTypeOther", errors)}
            />
            <FieldMessage errors={errors} field="audienceTypeOther" />
          </div>
        ) : null}

        {!isCompact ? (
          <>
            <div className="form-field">
              <label htmlFor="eventType">Event type</label>
              <select
                defaultValue={initialValues.eventType}
                id="eventType"
                name="eventType"
                onChange={(event) => setEventType(event.currentTarget.value)}
                {...errorProps("eventType", errors)}
              >
                {eventOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <FieldMessage errors={errors} field="eventType" />
            </div>
            {eventType === "other" ? (
              <div className="form-field">
                <label htmlFor="eventTypeOther">Describe the event type</label>
                <input
                  defaultValue={initialValues.eventTypeOther}
                  id="eventTypeOther"
                  name="eventTypeOther"
                  type="text"
                  {...errorProps("eventTypeOther", errors)}
                />
                <FieldMessage errors={errors} field="eventTypeOther" />
              </div>
            ) : null}
          </>
        ) : null}

        <div className="form-field">
          <label htmlFor="preferredDateStart">
            {isCompact ? "Preferred date" : "Preferred date or range"}
          </label>
          <input
            defaultValue={initialValues.preferredDateStart}
            id="preferredDateStart"
            name="preferredDateStart"
            type="date"
            {...errorProps("preferredDateStart", errors)}
          />
          <FieldMessage errors={errors} field="preferredDateStart" />
        </div>
        <div className="form-field">
          <label htmlFor="preferredDateEnd">End date, if applicable</label>
          <input
            defaultValue={initialValues.preferredDateEnd}
            id="preferredDateEnd"
            name="preferredDateEnd"
            type="date"
            {...errorProps("preferredDateEnd", errors)}
          />
          <FieldMessage errors={errors} field="preferredDateEnd" />
        </div>

        {!isCompact ? (
          <>
            <div className="form-field">
              <label htmlFor="estimatedAudienceSize">
                Estimated audience size
              </label>
              <input
                defaultValue={initialValues.estimatedAudienceSize}
                id="estimatedAudienceSize"
                name="estimatedAudienceSize"
                type="number"
                min="1"
                inputMode="numeric"
                {...errorProps("estimatedAudienceSize", errors)}
              />
              <FieldMessage errors={errors} field="estimatedAudienceSize" />
            </div>
            <div className="form-field">
              <label htmlFor="eventLocation">Event location</label>
              <input
                defaultValue={initialValues.eventLocation}
                id="eventLocation"
                name="eventLocation"
                type="text"
                placeholder="City, state/country, or virtual"
                {...errorProps("eventLocation", errors)}
              />
              <FieldMessage errors={errors} field="eventLocation" />
            </div>
            <div className="form-field">
              <label htmlFor="attendanceMode">Attendance mode</label>
              <select
                defaultValue={initialValues.attendanceMode}
                id="attendanceMode"
                name="attendanceMode"
                {...errorProps("attendanceMode", errors)}
              >
                <option value="">Choose a mode</option>
                <option value="in-person">In person</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <FieldMessage errors={errors} field="attendanceMode" />
            </div>
            <div className="form-field">
              <label htmlFor="programLength">Approximate program length</label>
              <select
                defaultValue={initialValues.programLength}
                id="programLength"
                name="programLength"
                {...errorProps("programLength", errors)}
              >
                <option value="">Choose a length</option>
                <option value="under-45-min">Under 45 minutes</option>
                <option value="45-60-min">45–60 minutes</option>
                <option value="60-90-min">60–90 minutes</option>
                <option value="half-day">Half day</option>
                <option value="full-day">Full day</option>
                <option value="multi-session">Multiple sessions</option>
                <option value="not-sure">Not sure</option>
              </select>
              <FieldMessage errors={errors} field="programLength" />
            </div>
          </>
        ) : null}

        <div className="form-field form-field--wide">
          <label htmlFor="eventGoals">Event goals</label>
          <textarea
            defaultValue={initialValues.eventGoals}
            id="eventGoals"
            name="eventGoals"
            rows={isCompact ? 4 : 6}
            placeholder="What should the audience feel, understand, or do after the experience?"
            {...errorProps("eventGoals", errors)}
          />
          <FieldMessage errors={errors} field="eventGoals" />
        </div>

        {!isCompact ? (
          <>
            <div className="form-field">
              <label htmlFor="budgetRange">Budget range (optional)</label>
              <select
                defaultValue={initialValues.budgetRange ?? "not-sure"}
                id="budgetRange"
                name="budgetRange"
                {...errorProps("budgetRange", errors)}
              >
                <option value="not-sure">Not sure yet</option>
                <option value="under-2500">Under $2,500</option>
                <option value="2500-4999">$2,500–$4,999</option>
                <option value="5000-9999">$5,000–$9,999</option>
                <option value="10000-plus">$10,000+</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
              <FieldMessage errors={errors} field="budgetRange" />
            </div>
            <div className="form-field">
              <label htmlFor="referralSource">
                How did you hear about Caleb?
              </label>
              <select
                defaultValue={initialValues.referralSource}
                id="referralSource"
                name="referralSource"
                onChange={(event) =>
                  setReferralSource(event.currentTarget.value)
                }
                {...errorProps("referralSource", errors)}
              >
                <option value="">Choose a source</option>
                <option value="search">Search</option>
                <option value="social">Social media</option>
                <option value="referral">Referral</option>
                <option value="event">Saw Caleb at an event</option>
                <option value="podcast-media">Podcast or media</option>
                <option value="other">Other</option>
              </select>
              <FieldMessage errors={errors} field="referralSource" />
            </div>
            {referralSource === "other" ? (
              <div className="form-field">
                <label htmlFor="referralSourceOther">
                  Describe the referral source
                </label>
                <input
                  defaultValue={initialValues.referralSourceOther}
                  id="referralSourceOther"
                  name="referralSourceOther"
                  type="text"
                  {...errorProps("referralSourceOther", errors)}
                />
                <FieldMessage errors={errors} field="referralSourceOther" />
              </div>
            ) : null}
            <div className="form-field form-field--wide">
              <label htmlFor="additionalDetails">
                Additional details (optional)
              </label>
              <textarea
                defaultValue={initialValues.additionalDetails}
                id="additionalDetails"
                name="additionalDetails"
                rows={4}
                {...errorProps("additionalDetails", errors)}
              />
              <FieldMessage errors={errors} field="additionalDetails" />
            </div>
            <div className="form-field form-field--wide consent-field">
              <label htmlFor="consent">
                <input
                  defaultChecked={initialValues.consent === true}
                  id="consent"
                  name="consent"
                  type="checkbox"
                  {...errorProps("consent", errors)}
                />
                <span>
                  I consent to Joyionaire™ Enterprises using these details to
                  evaluate and respond to this speaking inquiry. I have read the{" "}
                  <Link href="/privacy">Privacy Policy</Link>.
                </span>
              </label>
              <FieldMessage errors={errors} field="consent" />
            </div>
            <div className="form-field form-field--wide challenge-field">
              {challenge ?? (
                <p className="challenge-unavailable">
                  The online security check is not configured. Call (404)
                  941-5670 or email info@calebjakes.com.
                </p>
              )}
              <FieldMessage errors={errors} field="turnstileToken" />
            </div>
          </>
        ) : null}
      </div>

      <button
        className="button button--gold form-submit"
        disabled={pending || Boolean(submissionUnavailableMessage)}
      >
        {pending
          ? "Sending Inquiry…"
          : isCompact
            ? "Continue Inquiry"
            : submissionUnavailableMessage
              ? "Online Inquiry Unavailable"
              : "Send Speaking Inquiry"}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="form-fine-print">
        Submitting an inquiry does not confirm an engagement or date.
      </p>
      <noscript>
        <p className="form-message">
          Online submission requires JavaScript. Call (404) 941-5670 or email
          info@calebjakes.com.
        </p>
      </noscript>
    </form>
  );
}
