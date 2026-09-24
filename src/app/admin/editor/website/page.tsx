import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { CalebAttachedWebsiteEditor } from "@/components/site-editor/caleb-attached-website-editor";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { staffLoginPath } from "@/lib/staff/editor-paths";
import { createCalebWebsiteRuntime } from "@/lib/staff/website-runtime";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Website Editor | Caleb Jakes Staff", robots: { index: false, follow: false } };

export default async function WebsiteEditorPage() {
  const runtime = createCalebWebsiteRuntime(process.env, nextCookieAdapter(await cookies()));
  if (!runtime) return <main><h1>Website editor unavailable</h1><p>The private editor configuration is incomplete.</p></main>;
  try {
    await runtime.authorizeRead(new Request(new URL("/admin/editor/website", process.env.NEXT_PUBLIC_SITE_URL!), { headers: new Headers(await headers()) }), "website.preview.read");
  } catch { redirect(staffLoginPath()); }
  return <CalebAttachedWebsiteEditor />;
}
