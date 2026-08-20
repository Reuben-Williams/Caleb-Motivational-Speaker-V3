import type { Metadata } from "next";

import { CommerceOwnerWorkspace } from "@/components/commerce/commerce-owner-workspace";

export const metadata: Metadata = {
  title: "Commerce Operations | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CommerceEditorPage() {
  return <div className="operator-page"><h1 className="sr-only">Commerce operations</h1><CommerceOwnerWorkspace /></div>;
}
