import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { bookingSchema } from "@/lib/booking-schema";
import { createNativeInquiryGateway } from "@/lib/inquiries/native-gateway";
import {
  createInquiryIdentityKeyring,
  inquiryIdentityCandidates,
} from "@/lib/inquiries/identity";
import { validBooking } from "../../../tests/booking-fixture";

const booking = bookingSchema.parse(validBooking);
const keyring = createInquiryIdentityKeyring({
  activeKeyId: "v2",
  activeSecret: "active-secret-with-enough-entropy",
  previousKeysJson: JSON.stringify({
    v1: "previous-secret-with-enough-entropy",
  }),
});

describe("NativeInquiryGateway", () => {
  it("maps one event to the published intake and two allowlisted messages", async () => {
    const accept = vi.fn(async (write) => ({
      status: "accepted" as const,
      inquiryId: write.inquiryId,
      acceptedAt: write.receivedAt,
      submissionId: "c1000000-0000-4000-8000-000000000020",
      contactId: "c1000000-0000-4000-8000-000000000021",
      leadId: "c1000000-0000-4000-8000-000000000022",
    }));
    const gateway = createNativeInquiryGateway({
      repository: { accept },
      from: "Caleb Jakes Bookings <bookings@mail.calebjakes.com>",
      notificationEmail: "info@calebjakes.com",
      replyTo: "info@calebjakes.com",
    });
    const candidates = inquiryIdentityCandidates(booking, keyring);

    await gateway.acceptInquiry({
      data: booking,
      candidates,
      receivedAt: new Date("2026-08-29T12:00:00.000Z"),
    });

    expect(accept).toHaveBeenCalledOnce();
    const write = accept.mock.calls[0]?.[0];
    expect(write).toMatchObject({
      keyId: candidates[0]?.keyId,
      identityDigest: candidates[0]?.digest,
      inquiryId: candidates[0]?.inquiryId,
      idempotencyKey: `inquiry:${candidates[0]?.inquiryId}`,
      receivedAt: "2026-08-29T12:00:00.000Z",
      leadSummary: {
        source: "website_form",
        persistedSource: "public_form",
        serviceKey: "speaking-engagement",
        status: "new",
      },
    });
    expect(write).not.toHaveProperty("siteId");
    expect(write).not.toHaveProperty("capabilities");
    expect(write.candidates).toEqual(
      candidates.map(({ keyId, digest }) => ({ keyId, digest })),
    );
    expect(write.organizer).toMatchObject({
      email: "jordan@example.org",
      phone: "+14045550199",
      emailDigest: createHash("sha256")
        .update("jordan@example.org")
        .digest("hex"),
    });
    expect(write.messages).toHaveLength(2);
    expect(write.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messageKind: "organizer_acknowledgement",
          recipientKind: "organizer",
          destination: "jordan@example.org",
          replyTo: "info@calebjakes.com",
        }),
        expect.objectContaining({
          messageKind: "internal_notification",
          recipientKind: "internal",
          destination: "info@calebjakes.com",
          replyTo: "jordan@example.org",
        }),
      ]),
    );
  });

  it("preserves the original receipt returned by a previous-key replay", async () => {
    const accept = vi.fn(async () => ({
      status: "duplicate_accepted" as const,
      inquiryId: "CJ-ORIGINAL0001",
      acceptedAt: "2026-08-28T12:00:00.000Z",
      submissionId: "c1000000-0000-4000-8000-000000000020",
    }));
    const gateway = createNativeInquiryGateway({
      repository: { accept },
      from: "Caleb Jakes Bookings <bookings@mail.calebjakes.com>",
      notificationEmail: "info@calebjakes.com",
      replyTo: "info@calebjakes.com",
    });

    const result = await gateway.acceptInquiry({
      data: booking,
      candidates: inquiryIdentityCandidates(booking, keyring),
      receivedAt: new Date("2026-08-29T12:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "duplicate_accepted",
      inquiryId: "CJ-ORIGINAL0001",
      acceptedAt: "2026-08-28T12:00:00.000Z",
      submissionId: "c1000000-0000-4000-8000-000000000020",
    });
  });
});
