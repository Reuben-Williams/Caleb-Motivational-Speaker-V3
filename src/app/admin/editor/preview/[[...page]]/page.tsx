import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import {
  CalebPageView,
  type CalebPageViewPath,
} from "@/components/site-pages/page-view-registry";
import { CalebPreviewBridge } from "@/components/site-editor/caleb-preview-bridge";
import { publicPathFromPreviewSegments } from "@/lib/site-editor/preview-paths";
import { staffLoginPath } from "@/lib/staff/editor-paths";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { createCalebWebsiteRuntime } from "@/lib/staff/website-runtime";

export const dynamic = "force-dynamic";

export default async function CalebPreviewPage({ params }: Readonly<{ params: Promise<{ page?: string[] }> }>) {
  let pagePath: CalebPageViewPath;
  try { pagePath = publicPathFromPreviewSegments((await params).page) as CalebPageViewPath; }
  catch { notFound(); }
  const runtime = createCalebWebsiteRuntime(process.env, nextCookieAdapter(await cookies()));
  if (!runtime) notFound();
  const request = new Request(new URL(`/admin/editor/preview${pagePath === "/" ? "" : pagePath}`, process.env.NEXT_PUBLIC_SITE_URL!), { headers: new Headers(await headers()) });
  let content;
  try {
    const authorized = await runtime.authorizeRead(request, "website.preview.read");
    content = (await authorized.adapter.getContentState(pagePath)).content;
  }
  catch { redirect(staffLoginPath()); }
  return <CalebPreviewBridge pagePath={pagePath}><CalebPageView content={content} pagePath={pagePath} /></CalebPreviewBridge>;
}
