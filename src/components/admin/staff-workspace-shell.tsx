"use client";

import { BuilderAppShell, ResponsiveNavigation } from "@reuben-williams/editor";
import type { RegisteredWorkspace } from "@reuben-williams/editor";
import type { ReactNode } from "react";

const workspaces: readonly RegisteredWorkspace[] = [
  { id: "website.pages", label: "Website Editor", group: "website", icon: "website", status: "active", render: () => null, mobilePriority: 1 },
  { id: "website.media", label: "Media", group: "website", icon: "media", status: "active", render: () => null, mobilePriority: 2 },
  { id: "website.history", label: "History", group: "website", icon: "history", status: "active", render: () => null, mobilePriority: 3 },
  { id: "growth.leads", label: "Speaking Engagements", group: "growth", icon: "leads", status: "active", render: () => null, mobilePriority: 4 },
];

export function StaffWorkspaceShell({ activeWorkspace, currentPath, onPageChange, onWorkspaceChange, children }: Readonly<{
  activeWorkspace: RegisteredWorkspace["id"];
  currentPath?: string;
  onPageChange?: (path: string) => void;
  onWorkspaceChange?: (workspace: RegisteredWorkspace["id"]) => void;
  children: ReactNode;
}>) {
  const choose = (workspace: RegisteredWorkspace["id"]) => {
    if (workspace === activeWorkspace) return;
    if (onWorkspaceChange && workspace !== "growth.leads") return onWorkspaceChange(workspace);
    window.location.assign(workspace === "growth.leads" ? "/admin/editor/speaking-engagements" : "/admin/editor/website");
  };
  return (
    <BuilderAppShell navigation={
      <ResponsiveNavigation
        siteLabel="Caleb Jakes"
        siteStatus="Live site workspace"
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onWorkspaceChange={choose}
        pageLinks={[]}
        currentPath={currentPath}
        onPageChange={onPageChange}
      />
    }>
      {children}
    </BuilderAppShell>
  );
}
