import type { Metadata } from "next";

import WebsiteEditorPage from "@/app/admin/editor/website/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website Editor | Caleb Jakes Staff",
  robots: { index: false, follow: false, nocache: true },
};

export default WebsiteEditorPage;
