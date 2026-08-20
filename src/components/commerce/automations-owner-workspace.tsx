"use client";

import {
  AutomationsWorkspace,
  type AutomationsWorkspaceApi,
} from "@reuben-williams/growth-automations-ui/owner";

const DENIED_API: AutomationsWorkspaceApi = Object.freeze({
  externalEffects: false,
  async listAutomations() { return []; },
  async getAutomation() { return null; },
  async listTemplates() { return []; },
  async listActivity() { return []; },
  async createFromTemplate() { return { status: "denied" as const, message: "Access denied." }; },
  async saveDraft() { return { status: "denied" as const, message: "Access denied." }; },
  async transition() { return { status: "denied" as const, message: "Access denied." }; },
  async recoverRun() { return { status: "denied" as const, message: "Access denied." }; },
});

export function AutomationsOwnerWorkspace() {
  return (
    <AutomationsWorkspace
      access={{
        canRead: false,
        canCreate: false,
        canManage: false,
        canApprove: false,
        canRecover: false,
      }}
      api={DENIED_API}
      mode="denied"
    />
  );
}
