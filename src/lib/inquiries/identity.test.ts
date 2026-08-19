import { describe, expect, it } from "vitest";

import { bookingSchema } from "@/lib/booking-schema";
import {
  ACCEPTED_INQUIRY_TTL_SECONDS,
  createInquiryIdentityKeyring,
  inquiryIdentityCandidates,
} from "@/lib/inquiries/identity";
import { validBooking } from "../../../tests/booking-fixture";

const booking = bookingSchema.parse(validBooking);

describe("inquiry identity keyring", () => {
  it("requires an explicit active key ID and secret", () => {
    expect(() =>
      createInquiryIdentityKeyring({
        activeKeyId: "",
        activeSecret: "active-secret-with-enough-entropy",
        previousKeysJson: "{}",
      }),
    ).toThrow("active key");
    expect(() =>
      createInquiryIdentityKeyring({
        activeKeyId: "v2",
        activeSecret: "",
        previousKeysJson: "{}",
      }),
    ).toThrow("active secret");
  });

  it("produces the active identity followed by retained previous identities", () => {
    const keyring = createInquiryIdentityKeyring({
      activeKeyId: "v2",
      activeSecret: "active-secret-with-enough-entropy",
      previousKeysJson: JSON.stringify({
        v1: "previous-secret-with-enough-entropy",
      }),
    });

    const candidates = inquiryIdentityCandidates(booking, keyring);

    expect(candidates.map(({ keyId }) => keyId)).toEqual(["v2", "v1"]);
    expect(candidates[0]).toMatchObject({
      ledgerKey: expect.stringMatching(/^inquiry:v2:[a-f0-9]{64}$/),
      inquiryId: expect.stringMatching(/^CJ-[A-F0-9]{12}$/),
    });
    expect(candidates[1]?.digest).not.toBe(candidates[0]?.digest);
  });

  it("rejects malformed previous keys and an active key repeated as previous", () => {
    expect(() =>
      createInquiryIdentityKeyring({
        activeKeyId: "v2",
        activeSecret: "active-secret-with-enough-entropy",
        previousKeysJson: "not-json",
      }),
    ).toThrow("previous keys");
    expect(() =>
      createInquiryIdentityKeyring({
        activeKeyId: "v2",
        activeSecret: "active-secret-with-enough-entropy",
        previousKeysJson: JSON.stringify({
          v2: "previous-secret-with-enough-entropy",
        }),
      }),
    ).toThrow("active key");
  });

  it("excludes Turnstile tokens and includes canonical event changes", () => {
    const keyring = createInquiryIdentityKeyring({
      activeKeyId: "v1",
      activeSecret: "active-secret-with-enough-entropy",
      previousKeysJson: "{}",
    });
    const first = inquiryIdentityCandidates(booking, keyring)[0];
    const tokenChanged = inquiryIdentityCandidates(
      { ...booking, turnstileToken: "a-different-ephemeral-token" },
      keyring,
    )[0];
    const eventChanged = inquiryIdentityCandidates(
      { ...booking, additionalDetails: "A distinct event requirement." },
      keyring,
    )[0];

    expect(tokenChanged).toEqual(first);
    expect(eventChanged?.digest).not.toBe(first?.digest);
  });

  it("retains accepted duplicate identities for exactly 400 days", () => {
    expect(ACCEPTED_INQUIRY_TTL_SECONDS).toBe(400 * 24 * 60 * 60);
  });
});
