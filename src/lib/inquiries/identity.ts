import type { BookingData } from "@/lib/booking-schema";
import { inquiryDigest } from "@/lib/inquiries/canonical";

export const ACCEPTED_INQUIRY_TTL_SECONDS = 400 * 24 * 60 * 60;

export type InquiryIdentityKeyring = {
  activeKeyId: string;
  activeSecret: string;
  previousKeys: Readonly<Record<string, string>>;
};

export type InquiryIdentityCandidate = {
  keyId: string;
  digest: string;
  ledgerKey: string;
  inquiryId: string;
};

type KeyringInput = {
  activeKeyId: string | undefined;
  activeSecret: string | undefined;
  previousKeysJson: string | undefined;
};

const keyIdPattern = /^[A-Za-z0-9._-]{1,40}$/;

export function createInquiryIdentityKeyring({
  activeKeyId,
  activeSecret,
  previousKeysJson,
}: KeyringInput): InquiryIdentityKeyring {
  const keyId = activeKeyId?.trim() ?? "";
  const secret = activeSecret?.trim() ?? "";
  if (!keyIdPattern.test(keyId)) {
    throw new Error("Inquiry active key ID is invalid.");
  }
  if (!secret) {
    throw new Error("Inquiry active secret is missing.");
  }

  let rawPrevious: unknown;
  try {
    rawPrevious = JSON.parse(previousKeysJson?.trim() || "{}");
  } catch {
    throw new Error("Inquiry previous keys JSON is invalid.");
  }
  if (
    !rawPrevious ||
    typeof rawPrevious !== "object" ||
    Array.isArray(rawPrevious)
  ) {
    throw new Error("Inquiry previous keys must be an object.");
  }

  const previousKeys: Record<string, string> = {};
  for (const [previousKeyId, previousSecret] of Object.entries(rawPrevious)) {
    if (!keyIdPattern.test(previousKeyId) || typeof previousSecret !== "string") {
      throw new Error("Inquiry previous keys are invalid.");
    }
    const normalizedSecret = previousSecret.trim();
    if (!normalizedSecret) {
      throw new Error("Inquiry previous keys are invalid.");
    }
    if (previousKeyId === keyId) {
      throw new Error("Inquiry active key cannot also be a previous key.");
    }
    previousKeys[previousKeyId] = normalizedSecret;
  }

  return {
    activeKeyId: keyId,
    activeSecret: secret,
    previousKeys,
  };
}

export function inquiryIdentityCandidates(
  data: BookingData,
  keyring: InquiryIdentityKeyring,
): InquiryIdentityCandidate[] {
  const keys = [
    [keyring.activeKeyId, keyring.activeSecret] as const,
    ...Object.entries(keyring.previousKeys),
  ];

  return keys.map(([keyId, secret]) => {
    const digest = inquiryDigest(data, secret);
    return {
      keyId,
      digest,
      ledgerKey: `inquiry:${keyId}:${digest}`,
      inquiryId: `CJ-${digest.slice(0, 12).toUpperCase()}`,
    };
  });
}
