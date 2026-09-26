export function websiteSecurityErrorCode(error: unknown): "security_verification_required" | null {
  return error && typeof error === "object" && "code" in error && error.code === "RECENT_AAL2_REQUIRED"
    ? "security_verification_required" : null;
}
