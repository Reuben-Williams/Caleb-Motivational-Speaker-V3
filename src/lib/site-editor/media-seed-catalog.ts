import { book } from "@/content/site";

export interface CalebSeedMediaAsset {
  id: string;
  path: string;
  alt: string;
  label: string;
  mimeType: "image/webp";
  source: "seed";
}

export const CALEB_MEDIA_SEEDS = [
  {
    id: "seed-home-hero-cutout-v1",
    path: "/media/people/caleb-home-hero-cutout.webp",
    alt: "Caleb Jakes smiling in a navy shirt with white stripes",
    label: "Homepage hero portrait",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-home-story-primary-v1",
    path: "/media/photos/caleb-book-portrait.webp",
    alt: "Caleb Jakes holding his book",
    label: "Homepage story portrait",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-home-story-secondary-v1",
    path: "/media/photos/caleb-book-wide-02.webp",
    alt: "Caleb Jakes in a portrait with his book",
    label: "Homepage story detail",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-book-cover-v1",
    path: "/media/book/caleb-book-front.webp",
    alt: `Cover of ${book.title}`,
    label: "Book cover",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-about-hero-v1",
    path: "/media/photos/caleb-book-portrait.webp",
    alt: "Caleb Jakes holding his book",
    label: "About page hero",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-about-collage-v1",
    path: "/media/photos/caleb-book-wide-01.webp",
    alt: "Caleb Jakes presenting his book",
    label: "About page story image",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-speaking-hero-v1",
    path: "/media/photos/caleb-speaking-wide.webp",
    alt: "Caleb Jakes speaking with a microphone",
    label: "Speaking page hero",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-schools-hero-v1",
    path: "/media/photos/caleb-speaking-mobile.webp",
    alt: "Caleb Jakes speaking",
    label: "Schools and colleges hero",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-faith-hero-v1",
    path: "/media/photos/caleb-book-wide-03.webp",
    alt: "Caleb Jakes with his book",
    label: "Faith events hero",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-conferences-hero-v1",
    path: "/media/photos/caleb-speaking-wide.webp",
    alt: "Caleb Jakes speaking into a microphone",
    label: "Conferences and workshops hero",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-book-media-hero-v1",
    path: "/media/book/caleb-book-amazon.webp",
    alt: `Caleb Jakes with ${book.title}`,
    label: "Book and media hero",
    mimeType: "image/webp",
    source: "seed",
  },
  {
    id: "seed-faq-hero-v1",
    path: "/media/photos/caleb-book-wide-02.webp",
    alt: "Caleb Jakes in a portrait",
    label: "FAQ page hero",
    mimeType: "image/webp",
    source: "seed",
  },
] as const satisfies readonly CalebSeedMediaAsset[];

const mediaById = new Map<string, CalebSeedMediaAsset>(
  CALEB_MEDIA_SEEDS.map((asset) => [asset.id, asset]),
);

export function getCalebSeedMedia(id: string): CalebSeedMediaAsset | undefined {
  return mediaById.get(id);
}
