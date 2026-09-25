"use client";

import { useSyncExternalStore } from "react";

import {
  BOOKING_RECEIPT_KEY,
} from "@/components/booking-form";
import { LinkButton } from "@/components/link-button";
import { EditableText } from "@/components/site-content/editable-text";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { contact } from "@/content/site";

type Receipt = {
  inquiryId: string;
  acceptedAt: string;
};

function parseReceipt(raw: string | null): Receipt | false {
  try {
    if (!raw) return false;
    const value = JSON.parse(raw) as Partial<Receipt>;
    if (
      typeof value.inquiryId === "string" &&
      /^CJ-[A-F0-9]{12}$/.test(value.inquiryId) &&
      typeof value.acceptedAt === "string" &&
      Number.isFinite(Date.parse(value.acceptedAt))
    ) {
      return value as Receipt;
    }
  } catch {
    // Direct-access state remains truthful when storage is unavailable.
  }
  return false;
}

export function ThankYouState({ content }: Readonly<{ content?: CalebResolvedPageContent }>) {
  const rawReceipt = useSyncExternalStore(
    () => () => undefined,
    () => window.sessionStorage.getItem(BOOKING_RECEIPT_KEY),
    () => null,
  );
  const receipt = parseReceipt(rawReceipt);

  if (!receipt) {
    return (
      <section className="simple-state">
        {content ? <EditableText as="p" className="eyebrow" content={content} regionId="thankYou.empty.eyebrow" /> : <p className="eyebrow">SPEAKING INQUIRY</p>}
        {content ? <EditableText as="h1" content={content} regionId="thankYou.empty.title" /> : <h1>READY TO START THE CONVERSATION?</h1>}
        <p>
          {content ? <EditableText as="span" content={content} regionId="thankYou.empty.body" /> : "No accepted inquiry is associated with this page."}{" "}
          Use the booking page, call <a href={contact.phoneHref}>{contact.phoneDisplay}</a>, or
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
      <p>
        Save the inquiry ID for your records. If you need assistance, email{" "}
        <a href={contact.emailHref}>{contact.email}</a>.
      </p>
      <LinkButton href="/">Return Home</LinkButton>
    </section>
  );
}
