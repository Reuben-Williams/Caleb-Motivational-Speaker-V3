import { describe, expect, it, vi } from "vitest";

import { createInquiryIdentityKeyring } from "@/lib/inquiries/identity";
import type {
  NativeInquiryAcceptance,
  NativeInquiryGatewayInput,
} from "@/lib/inquiries/native-contracts";
import { createNativeInquiryService } from "@/lib/inquiries/native-service";
import { validBooking } from "../../../tests/booking-fixture";

const keyring = createInquiryIdentityKeyring({
  activeKeyId: "v2",
  activeSecret: "active-test-secret-with-enough-entropy",
  previousKeysJson: JSON.stringify({
    v1: "previous-test-secret-with-enough-entropy",
  }),
});

function setup() {
  const calls: string[] = [];
  const verify = vi.fn(async () => {
    calls.push("turnstile");
    return true;
  });
  const incrementRateKey = vi.fn(async () => {
    calls.push("rate");
    return { allowed: true, retryAfter: 0 };
  });
  const acquireProcessingLease = vi.fn(async () => {
    calls.push("lease");
    return true;
  });
  const releaseProcessingLease = vi.fn(async () => true);
  const acceptInquiry = vi.fn<
    (input: NativeInquiryGatewayInput) => Promise<NativeInquiryAcceptance>
  >(async ({ candidates, receivedAt }) => {
      calls.push("neon");
      return {
        status: "accepted",
        inquiryId: candidates[0]!.inquiryId,
        acceptedAt: receivedAt.toISOString(),
        submissionId: "c1000000-0000-4000-8000-000000000020",
        contactId: "c1000000-0000-4000-8000-000000000021",
        leadId: "c1000000-0000-4000-8000-000000000022",
      };
    });
  const service = createNativeInquiryService({
    identityKeyring: keyring,
    spam: { verify },
    coordination: {
      incrementRateKey,
      acquireProcessingLease,
      releaseProcessingLease,
    },
    gateway: { acceptInquiry },
    now: () => new Date("2026-08-29T12:00:00.000Z"),
    ownerToken: () => "owner-a",
  });
  return {
    service,
    calls,
    verify,
    incrementRateKey,
    acquireProcessingLease,
    releaseProcessingLease,
    acceptInquiry,
  };
}

describe("native inquiry service", () => {
  it("accepts only after Turnstile, both rate windows, and Neon commit", async () => {
    const context = setup();

    const result = await context.service.submit(validBooking, {
      trustedClientIp: "203.0.113.10",
    });

    expect(result).toEqual({
      status: 202,
      body: {
        code: "accepted",
        message:
          "Your speaking inquiry was received. Keep the inquiry ID for your records.",
        inquiryId: expect.stringMatching(/^CJ-[A-F0-9]{12}$/),
        acceptedAt: "2026-08-29T12:00:00.000Z",
      },
    });
    expect(context.calls).toEqual([
      "turnstile",
      "rate",
      "rate",
      "lease",
      "neon",
    ]);
    expect(context.releaseProcessingLease).toHaveBeenCalledOnce();
  });

  it("returns the stored receipt for an exact replay", async () => {
    const context = setup();
    context.acceptInquiry.mockResolvedValueOnce({
      status: "duplicate_accepted",
      inquiryId: "CJ-ORIGINAL0001",
      acceptedAt: "2026-08-28T12:00:00.000Z",
      submissionId: "c1000000-0000-4000-8000-000000000020",
    });

    const result = await context.service.submit(validBooking, {});

    expect(result).toEqual({
      status: 200,
      body: {
        code: "duplicate_accepted",
        message:
          "Your speaking inquiry was received. Keep the inquiry ID for your records.",
        inquiryId: "CJ-ORIGINAL0001",
        acceptedAt: "2026-08-28T12:00:00.000Z",
      },
    });
  });

  it("fails closed when Neon cannot commit", async () => {
    const context = setup();
    context.acceptInquiry.mockRejectedValueOnce(new Error("database unavailable"));

    const result = await context.service.submit(validBooking, {});

    expect(result).toMatchObject({
      status: 503,
      body: { code: "service_unavailable" },
    });
    expect(result.body).not.toHaveProperty("inquiryId");
    expect(context.releaseProcessingLease).toHaveBeenCalledOnce();
  });

  it("does not touch rate limits or Neon after failed Turnstile", async () => {
    const context = setup();
    context.verify.mockResolvedValueOnce(false);

    const result = await context.service.submit(validBooking, {});

    expect(result).toMatchObject({ status: 400, body: { code: "spam_failed" } });
    expect(context.incrementRateKey).not.toHaveBeenCalled();
    expect(context.acceptInquiry).not.toHaveBeenCalled();
  });

  it("does not claim receipt when rate coordination is unavailable", async () => {
    const context = setup();
    context.incrementRateKey.mockRejectedValueOnce(new Error("upstash unavailable"));

    const result = await context.service.submit(validBooking, {});

    expect(result).toMatchObject({
      status: 503,
      body: { code: "service_unavailable" },
    });
    expect(context.acceptInquiry).not.toHaveBeenCalled();
  });
});
