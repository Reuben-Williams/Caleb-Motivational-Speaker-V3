import type { Metadata } from "next";

import { AutomationsOwnerWorkspace } from "@/components/commerce/automations-owner-workspace";

export const metadata: Metadata = {
  title: "Automations | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AutomationsEditorPage() {
  return <div className="operator-page"><AutomationsOwnerWorkspace /></div>;
}
