import { AccessibleVideo } from "@/components/accessible-video";
import { FinalCta } from "@/components/final-cta";
import { LinkButton } from "@/components/link-button";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { EditableImage } from "@/components/site-content/editable-image";
import { EditableText } from "@/components/site-content/editable-text";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { book, routeCopy } from "@/content/site";

export function BookMediaPageView({ content }: Readonly<{ content: CalebResolvedPageContent }>) {
  return <>
    <PageHero current="Book & Media" eyebrow={routeCopy.bookMedia.title} imageAlt={`Caleb Jakes with ${book.title}`} intro={routeCopy.bookMedia.intro} title={routeCopy.bookMedia.title} content={content} regions={{ eyebrow: "bookMedia.hero.eyebrow", title: "bookMedia.hero.title", intro: "bookMedia.hero.intro", image: "bookMedia.hero.image" }} />
    <section className="book-feature-route"><div className="container book-feature-route__grid"><Reveal className="book-feature-route__cover"><EditableImage content={content} height={900} regionId="bookMedia.book.cover" sizes="(max-width: 767px) 70vw, 34vw" width={600} /></Reveal><Reveal delay={0.08}><EditableText as="p" className="eyebrow" content={content} regionId="bookMedia.book.eyebrow" /><EditableText as="h2" content={content} regionId="bookMedia.book.title" /><EditableText as="p" className="serif-lead" content={content} regionId="bookMedia.book.lead" /><EditableText as="p" content={content} regionId="bookMedia.book.body" /><div className="button-row"><LinkButton href={book.purchaseUrl}>Buy the Book</LinkButton><LinkButton href="/book-caleb" variant="outline">Plan a Book-Based Event</LinkButton></div></Reveal></div></section>
    <section className="media-reel-route"><div className="container"><div className="section-heading section-heading--left"><EditableText as="p" className="eyebrow" content={content} regionId="bookMedia.reel.eyebrow" /><EditableText as="h2" content={content} regionId="bookMedia.reel.title" /><EditableText as="p" className="section-heading__body" content={content} regionId="bookMedia.reel.body" /></div><Reveal><AccessibleVideo compact /></Reveal></div></section>
    <section className="media-inquiry"><div className="container media-inquiry__grid"><Reveal><EditableText as="p" className="eyebrow" content={content} regionId="bookMedia.inquiry.eyebrow" /><EditableText as="h2" content={content} regionId="bookMedia.inquiry.title" /></Reveal><Reveal className="media-inquiry__copy" delay={0.08}><EditableText as="p" content={content} regionId="bookMedia.inquiry.body" /><LinkButton href="/book-caleb">Request Speaker Information</LinkButton></Reveal></div></section><FinalCta />
  </>;
}
