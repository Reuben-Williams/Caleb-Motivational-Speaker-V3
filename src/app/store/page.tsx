import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LinkButton } from "@/components/link-button";
import { book } from "@/content/site";
import { withBasePath } from "@/lib/base-path";
import { getCommerceEnvironment } from "@/lib/platform/environment";
import { getPublicStoreRoute, listApprovedOffers } from "@/lib/platform/routing";

export const metadata: Metadata = {
  title: "Book & Resources | Caleb Jakes",
  description: "Explore Caleb Jakes's book and purpose-centered resources.",
  alternates: { canonical: "/store" },
};

export default function StorePage() {
  const environment = getCommerceEnvironment();
  const publicRoute = getPublicStoreRoute(environment.mode);
  const approvedOffers = listApprovedOffers();

  return (
    <div className="commerce-page">
      <section className="commerce-hero">
        <div className="container commerce-hero__grid">
          <div>
            <p className="eyebrow">BOOK · RESOURCES · PURPOSE</p>
            <h1>TAKE THE MESSAGE WITH YOU.</h1>
            <p className="commerce-lead">
              Caleb&apos;s current purchase experience remains on his established,
              secure book funnel while the new customer library is completed and
              verified in test mode.
            </p>
            <div className="button-row">
              <LinkButton href={publicRoute.href}>Open Caleb&apos;s Book Store</LinkButton>
              <LinkButton href="/library" variant="outline">
                Customer Library
              </LinkButton>
            </div>
            <p className="commerce-note">
              You will continue at joyfound.calebjakes.com. Purchases and delivery
              are handled by Caleb&apos;s current system.
            </p>
          </div>
          <div className="commerce-cover">
            <Image
              alt={`Cover of ${book.title}`}
              height={900}
              priority
              sizes="(max-width: 767px) 70vw, 32vw"
              src={withBasePath(book.cover)}
              width={600}
            />
          </div>
        </div>
      </section>

      <section className="commerce-catalog">
        <div className="container">
          <p className="eyebrow">CURRENTLY AVAILABLE</p>
          <h2>{book.title}</h2>
          <p>{book.body}</p>
          {approvedOffers.length === 0 ? (
            <aside className="commerce-status" role="status">
              The future audiobook, workbook, course, and customer-library offers
              are not being advertised or sold here until Caleb approves their
              final files, titles, prices, policies, and delivery details.
            </aside>
          ) : null}
          <Link href="/book-media" className="commerce-text-link">
            Learn more about the book and Caleb&apos;s message
          </Link>
        </div>
      </section>
    </div>
  );
}
