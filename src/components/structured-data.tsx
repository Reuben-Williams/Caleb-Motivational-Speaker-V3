import { book, contact, faqs } from "@/content/site";
import { getSiteBaseUrl } from "@/lib/metadata";

export function StructuredData({ faq = false }: { faq?: boolean }) {
  const origin = getSiteBaseUrl();
  const graph: object[] = [
    {
      "@type": "Person",
      "@id": `${origin}/#caleb-jakes`,
      name: "Caleb Jakes",
      url: origin,
      jobTitle: "Motivational Speaker and Author",
      homeLocation: {
        "@type": "Place",
        name: contact.location,
      },
      sameAs: [contact.instagram, contact.facebook],
    },
    {
      "@type": "Organization",
      "@id": `${origin}/#joyionaire`,
      name: "Joyionaire™ Enterprises",
      url: origin,
      email: contact.email,
      telephone: contact.phoneDisplay,
      founder: { "@id": `${origin}/#caleb-jakes` },
    },
    {
      "@type": "Book",
      name: book.title,
      author: { "@id": `${origin}/#caleb-jakes` },
      url: book.purchaseUrl,
    },
  ];

  if (faq) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }).replace(/</g, "\\u003c"),
      }}
      type="application/ld+json"
    />
  );
}
