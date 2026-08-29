import type { GrowthCapability } from "@reuben-williams/core";
import {
  createRepositoryBackedStaffAuthorizer,
  type StaffAuthorizationAuditSink,
  type StaffAuthorizationRepository,
} from "@reuben-williams/next/auth/server";
import type {
  SiteMembershipAuthorizer,
  StaffSessionVerifier,
} from "@reuben-williams/next/auth";

export const CALEB_SITE_KEY = "caleb-jakes-v3";

export function createCalebStaffAuthorizer(input: Readonly<{
  repository: StaffAuthorizationRepository;
  audit: StaffAuthorizationAuditSink;
  now?: () => Date;
}>) {
  return createRepositoryBackedStaffAuthorizer(input);
}

export async function authorizeCalebStaff(input: Readonly<{
  request: Request;
  verifier: StaffSessionVerifier;
  authorizer: SiteMembershipAuthorizer;
  capability: GrowthCapability;
  moduleAction: "read" | "write";
  correlationId: string;
}>) {
  const session = await input.verifier.verify(input.request);
  return input.authorizer.authorize({
    siteKey: CALEB_SITE_KEY,
    session,
    requiredCapability: input.capability,
    operation: "commerce.view",
    requiredModuleAction: {
      moduleId: "growth-leads",
      action: input.moduleAction,
    },
    correlationId: input.correlationId,
  });
}
