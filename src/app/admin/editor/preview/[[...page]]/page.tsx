import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import AboutPage from "@/app/about/page";
import BookCalebPage from "@/app/book-caleb/page";
import BookMediaPage from "@/app/book-media/page";
import ConferencesWorkshopsPage from "@/app/conferences-workshops/page";
import FaithEventsPage from "@/app/faith-events/page";
import FaqPage from "@/app/faq/page";
import HomePage from "@/app/page";
import PrivacyPage from "@/app/privacy/page";
import SchoolsCollegesPage from "@/app/schools-colleges/page";
import SpeakingPage from "@/app/speaking/page";
import ThankYouPage from "@/app/thank-you/page";
import { CalebPreviewBridge } from "@/components/site-editor/caleb-preview-bridge";
import { publicPathFromPreviewSegments } from "@/lib/site-editor/preview-paths";
import { staffLoginPath } from "@/lib/staff/editor-paths";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { createCalebWebsiteRuntime } from "@/lib/staff/website-runtime";

export const dynamic = "force-dynamic";

const pages = {
  "/": HomePage,
  "/about": AboutPage,
  "/speaking": SpeakingPage,
  "/schools-colleges": SchoolsCollegesPage,
  "/faith-events": FaithEventsPage,
  "/conferences-workshops": ConferencesWorkshopsPage,
  "/book-media": BookMediaPage,
  "/faq": FaqPage,
  "/book-caleb": BookCalebPage,
  "/privacy": PrivacyPage,
  "/thank-you": ThankYouPage,
} as const;

export default async function CalebPreviewPage({ params }: Readonly<{ params: Promise<{ page?: string[] }> }>) {
  let pagePath: keyof typeof pages;
  try { pagePath = publicPathFromPreviewSegments((await params).page) as keyof typeof pages; }
  catch { notFound(); }
  const runtime = createCalebWebsiteRuntime(process.env, nextCookieAdapter(await cookies()));
  if (!runtime) notFound();
  const request = new Request(new URL(`/admin/editor/preview${pagePath === "/" ? "" : pagePath}`, process.env.NEXT_PUBLIC_SITE_URL!), { headers: new Headers(await headers()) });
  try { await runtime.authorizeRead(request, "website.preview.read"); }
  catch { redirect(staffLoginPath()); }
  const Page = pages[pagePath];
  return <CalebPreviewBridge pagePath={pagePath}><Page /></CalebPreviewBridge>;
}
