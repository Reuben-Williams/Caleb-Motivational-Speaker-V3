import { BookingForm } from "@/components/booking-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EditableText } from "@/components/site-content/editable-text";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { contact } from "@/content/site";

export function BookCalebPageView({ content }: Readonly<{ content: CalebResolvedPageContent }>) {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isStaticPreview = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "true";
  return <section className="booking-page"><div className="container"><Breadcrumbs current="Book Caleb" /><div className="booking-page__grid"><div className="booking-page__intro"><EditableText as="p" className="eyebrow" content={content} regionId="bookCaleb.intro.eyebrow" /><EditableText as="h1" content={content} regionId="bookCaleb.intro.title" /><EditableText as="p" content={content} regionId="bookCaleb.intro.body" /><div className="booking-page__contact"><p><span>Call</span><a href={contact.phoneHref}>{contact.phoneDisplay}</a></p><p><span>Email</span><a href={contact.emailHref}>{contact.email}</a></p><p><span>Base</span>{contact.location}</p></div></div><div className="booking-page__form"><div className="booking-page__form-heading"><span>EVENT DETAILS</span><h2>BUILD THE RIGHT EXPERIENCE.</h2><p>Fields marked by the form are validated before anything is sent. No date or engagement is confirmed by submission.</p></div><BookingForm challenge={turnstileSiteKey ? <TurnstileWidget siteKey={turnstileSiteKey} /> : undefined} submissionUnavailableMessage={isStaticPreview ? "This GitHub Pages preview cannot send inquiries. Call (404) 941-5670 or email info@calebjakes.com." : undefined} variant="full" /></div></div></div></section>;
}
