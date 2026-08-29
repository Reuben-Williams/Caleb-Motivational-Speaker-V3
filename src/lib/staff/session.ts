import {
  createSupabaseStaffSessionVerifier,
  type StaffAuthenticationErrorCode,
  type StaffClaimsClient,
  type StaffSessionRevocations,
} from "@reuben-williams/next/auth/server";

export type { StaffAuthenticationErrorCode };

export function createCalebStaffSessionVerifier(input: Readonly<{
  client: StaffClaimsClient;
  expectedIssuer: string;
  expectedAudience: string;
  revocations: StaffSessionRevocations;
  now?: () => Date;
}>) {
  return createSupabaseStaffSessionVerifier(input);
}
