import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { contact, privacyDisclosure } from "@/content/site";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/privacy");

export default function PrivacyPage() {
  return (
    <article className="legal-page">
      <div className="container legal-page__inner">
        <Breadcrumbs current="Privacy" />
        <p className="eyebrow">PRIVACY POLICY</p>
        <h1>YOUR INQUIRY. YOUR INFORMATION.</h1>
        <p className="legal-page__lead">{privacyDisclosure}</p>

        <section>
          <h2>Information used for speaking inquiries</h2>
          <p>
            The speaking inquiry asks for event-planning and contact
            information so Joyionaire™ Enterprises can evaluate and respond to
            a request. Do not include sensitive personal, medical, financial,
            or student information.
          </p>
        </section>
        <section>
          <h2>How the website stores and delivers an inquiry</h2>
          <p>
            A completed speaking inquiry is stored in Caleb&apos;s website database
            so the organizer, event request, follow-up status, consent record,
            and safe delivery history can be managed in the private Speaking
            Engagements workspace. Cloudflare Turnstile and rate limiting
            process limited request information to protect the public form.
            Resend delivers the organizer receipt and the internal notification
            to the monitored Caleb Jakes inbox.
          </p>
        </section>
        <section>
          <h2>Retention and deletion</h2>
          <p>
            Accepted speaking inquiries are retained for 400 days under the
            reviewed site policy. Delivery message contents are redacted after they are no
            longer operationally needed, and due inquiry records are removed by
            an authorized retention process. A verified privacy request may
            shorten that period.
          </p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>
            Questions about an inquiry can be directed to{" "}
            <a href={contact.emailHref}>{contact.email}</a> or{" "}
            <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
            Privacy requests may be sent to info@calebjakes.com.
          </p>
        </section>
      </div>
    </article>
  );
}
