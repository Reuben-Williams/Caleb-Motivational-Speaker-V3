import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { SpeakingEngagementsWorkspace } from "@/components/admin/speaking-engagements-workspace";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { staffLoginPath } from "@/lib/staff/editor-paths";
import { createCalebStaffRuntime } from "@/lib/staff/runtime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Speaking Engagements | Caleb Jakes Staff",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SpeakingEngagementsPage() {
  const store = await cookies();
  const runtime = createCalebStaffRuntime(process.env, nextCookieAdapter(store));
  if (!runtime) {
    return (
      <section style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <div><h1>Staff workspace unavailable</h1><p>The private editor is not fully configured yet.</p></div>
      </section>
    );
  }
  const requestHeaders = new Headers(await headers());
  const request = new Request(
    new URL("/admin/editor/speaking-engagements", process.env.NEXT_PUBLIC_SITE_URL!),
    { headers: requestHeaders },
  );
  let authorized;
  try {
    authorized = await runtime.authorizeRead(request, ["leads.read"]);
  } catch {
    redirect(staffLoginPath());
  }
  const leads = await authorized.repository.list();
  return <SpeakingEngagementsWorkspace initialLeads={leads} />;
}
