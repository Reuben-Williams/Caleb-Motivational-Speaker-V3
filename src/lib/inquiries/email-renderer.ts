import type { BookingData } from "@/lib/booking-schema";

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const contactFooter =
  "Joyionaire™ Enterprises · info@calebjakes.com · (404) 941-5670";
const privacyFooter =
  "This message contains information submitted through the Caleb Jakes speaking-inquiry form. Do not forward it outside the booking process unless required to plan the event.";

function escapeHtml(value: string | number | boolean): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function row(label: string, value: string | number | boolean) {
  return { label, value: String(value) };
}

function renderRows(
  heading: string,
  intro: string,
  rows: Array<{ label: string; value: string }>,
): Pick<RenderedEmail, "html" | "text"> {
  const htmlRows = rows
    .map(
      ({ label, value }) =>
        `<tr><th align="left" style="padding:10px;border-bottom:1px solid #dedbd2;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px;border-bottom:1px solid #dedbd2">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const textRows = rows.map(({ label, value }) => `${label}: ${value}`).join("\n");

  return {
    html: `<!doctype html><html><body style="margin:0;background:#fdfcf8;color:#050505;font-family:Arial,sans-serif"><div style="max-width:720px;margin:0 auto;padding:40px 24px"><p style="color:#8c731b;font-weight:700;letter-spacing:.12em">CALEB JAKES · JOYIONAIRE™</p><h1 style="font-size:36px;line-height:1">${escapeHtml(heading)}</h1><p>${escapeHtml(intro)}</p><table style="width:100%;border-collapse:collapse;margin:30px 0">${htmlRows}</table><p style="font-size:13px">${escapeHtml(contactFooter)}</p><p style="color:#665f52;font-size:12px">${escapeHtml(privacyFooter)}</p></div></body></html>`,
    text: `${heading}\n\n${intro}\n\n${textRows}\n\n${contactFooter}\n${privacyFooter}`,
  };
}

export function renderBusinessEmail(
  inquiryId: string,
  data: BookingData,
): RenderedEmail {
  const rows = [
    row("Inquiry ID", inquiryId),
    row("Full name", data.fullName),
    row("Work email", data.workEmail),
    row("Phone", data.phone),
    row("Organization", data.organization),
    row("Role or title", data.roleTitle),
    row("Audience type", data.audienceType),
    row("Audience type other", data.audienceTypeOther),
    row("Event type", data.eventType),
    row("Event type other", data.eventTypeOther),
    row("Preferred date start", data.preferredDateStart),
    row("Preferred date end", data.preferredDateEnd),
    row("Estimated audience size", data.estimatedAudienceSize),
    row("Event location", data.eventLocation),
    row("Attendance mode", data.attendanceMode),
    row("Program length", data.programLength),
    row("Event goals", data.eventGoals),
    row("Budget range", data.budgetRange),
    row("Referral source", data.referralSource),
    row("Referral source other", data.referralSourceOther),
    row("Additional details", data.additionalDetails),
    row("Consent", data.consent),
    row("UTM source", data.utmSource),
    row("UTM medium", data.utmMedium),
    row("UTM campaign", data.utmCampaign),
    row("UTM term", data.utmTerm),
    row("UTM content", data.utmContent),
    row("Referrer path", data.referrerPath),
    row("Reply by email", `mailto:${data.workEmail}`),
    row("Reply by phone", `tel:${data.phone}`),
  ];
  const rendered = renderRows(
    `Speaking inquiry ${inquiryId}`,
    "A new speaking inquiry was submitted through calebjakesspeaks.com.",
    rows,
  );
  return {
    subject: `Speaking inquiry ${inquiryId} — ${data.organization}`,
    ...rendered,
  };
}

export function renderConfirmationEmail(
  inquiryId: string,
  data: BookingData,
): RenderedEmail {
  const dateRange = data.preferredDateEnd
    ? `${data.preferredDateStart} through ${data.preferredDateEnd}`
    : data.preferredDateStart;
  const rows = [
    row("Inquiry ID", inquiryId),
    row("Full name", data.fullName),
    row("Organization", data.organization),
    row("Audience type", data.audienceType),
    row("Event type", data.eventType),
    row("Preferred date", dateRange),
    row("Event location", data.eventLocation),
    row("Attendance mode", data.attendanceMode),
    row("Program length", data.programLength),
    row("Event goals", data.eventGoals),
  ];
  const rendered = renderRows(
    "We received your speaking inquiry.",
    "Caleb's team will review the event details and follow up using the contact information you provided. No response time is guaranteed.",
    rows,
  );
  return {
    subject: `We received your Caleb Jakes speaking inquiry — ${inquiryId}`,
    ...rendered,
  };
}

