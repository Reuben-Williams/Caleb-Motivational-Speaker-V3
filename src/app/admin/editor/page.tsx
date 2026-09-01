import type { Metadata } from "next";

import SpeakingEngagementsPage from "@/app/admin/editor/speaking-engagements/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Speaking Engagements | Caleb Jakes Staff",
  robots: { index: false, follow: false, nocache: true },
};

export default SpeakingEngagementsPage;
