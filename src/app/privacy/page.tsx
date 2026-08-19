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
          <h2>Service providers</h2>
          <p>
            Form-security and rate-limiting providers process limited
            information needed to protect the form. Submitted inquiry details
            are sent to Caleb&apos;s customer relationship management system
            to create or update contact and speaking-opportunity records and
            support follow-up workflows. This release does not add an
            application database for complete inquiry payloads.
          </p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>
            Questions about an inquiry can be directed to{" "}
            <a href={contact.emailHref}>{contact.email}</a> or{" "}
            <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
