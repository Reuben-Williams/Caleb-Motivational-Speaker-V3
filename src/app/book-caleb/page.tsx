import type { Metadata } from "next";

import { BookingForm } from "@/components/booking-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { contact, routeCopy } from "@/content/site";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/book-caleb");

export default function BookCalebPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isStaticPreview = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "true";

  return (
    <section className="booking-page">
      <div className="container">
        <Breadcrumbs current="Book Caleb" />
        <div className="booking-page__grid">
          <div className="booking-page__intro">
            <p className="eyebrow">SPEAKING INQUIRY</p>
            <h1>{routeCopy.booking.title}</h1>
            <p>{routeCopy.booking.intro}</p>
            <div className="booking-page__contact">
              <p>
                <span>Call</span>
                <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
              </p>
              <p>
                <span>Email</span>
                <a href={contact.emailHref}>{contact.email}</a>
              </p>
              <p>
                <span>Base</span>
                {contact.location}
              </p>
            </div>
          </div>
          <div className="booking-page__form">
            <div className="booking-page__form-heading">
              <span>EVENT DETAILS</span>
              <h2>BUILD THE RIGHT EXPERIENCE.</h2>
              <p>
                Fields marked by the form are validated before anything is
                sent. No date or engagement is confirmed by submission.
              </p>
            </div>
            <BookingForm
              challenge={
                turnstileSiteKey ? (
                  <TurnstileWidget siteKey={turnstileSiteKey} />
                ) : undefined
              }
              submissionUnavailableMessage={
                isStaticPreview
                  ? "This GitHub Pages preview cannot send inquiries. Call (404) 941-5670 or email info@calebjakes.com."
                  : undefined
              }
              variant="full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
