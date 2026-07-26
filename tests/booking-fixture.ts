import type { BookingInput } from "@/lib/booking-schema";

export const validBooking: BookingInput = {
  fullName: "Jordan Avery",
  workEmail: "jordan@example.org",
  phone: "(404) 555-0199",
  organization: "North Star College",
  roleTitle: "Director of Student Life",
  audienceType: "schools-colleges",
  audienceTypeOther: "",
  eventType: "keynote",
  eventTypeOther: "",
  preferredDateStart: "2099-06-20",
  preferredDateEnd: "2099-06-21",
  estimatedAudienceSize: 450,
  eventLocation: "Rochester, New York",
  attendanceMode: "in-person",
  programLength: "45-60-min",
  eventGoals:
    "Help students connect resilience, identity, and purpose with practical next steps.",
  budgetRange: "not-sure",
  referralSource: "search",
  referralSourceOther: "",
  additionalDetails: "",
  consent: true,
  turnstileToken: "test-token",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmTerm: "",
  utmContent: "",
  referrerPath: "/speaking",
};

