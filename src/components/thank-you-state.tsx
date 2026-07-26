"use client";

import { useSyncExternalStore } from "react";

import {
  BOOKING_RECEIPT_KEY,
} from "@/components/booking-form";
import { LinkButton } from "@/components/link-button";
import { contact } from "@/content/site";

type Receipt = {
  inquiryId: string;
  confirmationEmailSent: boolean;
  acceptedAt: number;
};

function parseReceipt(raw: string | null): Receipt | false {
  try {
    if (!raw) return false;
    const value = JSON.parse(raw) as Partial<Receipt>;
    if (
      typeof value.inquiryId === "string" &&
      /^CJ-[A-F0-9]{12}$/.test(value.inquiryId) &&
      typeof value.confirmationEmailSent === "boolean" &&
      typeof value.acceptedAt === "number"
    ) {
      return value as Receipt;
    }
  } catch {
    // Direct-access state remains truthful when storage is unavailable.
  }
  return false;
}

export function ThankYouState() {
  const rawReceipt = useSyncExternalStore(
    () => () => undefined,
    () => window.sessionStorage.getItem(BOOKING_RECEIPT_KEY),
    () => null,
  );
  const receipt = parseReceipt(rawReceipt);

  if (!receipt) {
    return (
      <section className="simple-state">
        <p className="eyebrow">SPEAKING INQUIRY</p>
        <h1>READY TO START THE CONVERSATION?</h1>
        <p>
          No accepted inquiry is associated with this page. Use the booking
          page, call <a href={contact.phoneHref}>{contact.phoneDisplay}</a>, or
          email <a href={contact.emailHref}>{contact.email}</a>.
        </p>
        <LinkButton href="/book-caleb">Book Caleb</LinkButton>
      </section>
    );
  }

  return (
    <section className="simple-state thank-you-accepted">
      <p className="eyebrow">SPEAKING INQUIRY · {receipt.inquiryId}</p>
      <h1>YOUR INQUIRY HAS BEEN RECEIVED.</h1>
      <p>
        Caleb&apos;s team will review the event details and follow up using the
        contact information you provided.
      </p>
      <p className="inquiry-id">
        Inquiry ID <strong>{receipt.inquiryId}</strong>
      </p>
      {!receipt.confirmationEmailSent ? (
        <p className="confirmation-warning">
          Your inquiry was received, but we could not send a confirmation
          email. Save the inquiry ID or contact{" "}
          <a href={contact.emailHref}>{contact.email}</a> if you need
          assistance.
        </p>
      ) : (
        <p className="confirmation-sent">
          A confirmation email was sent to the address you provided.
        </p>
      )}
      <LinkButton href="/">Return Home</LinkButton>
    </section>
  );
}
