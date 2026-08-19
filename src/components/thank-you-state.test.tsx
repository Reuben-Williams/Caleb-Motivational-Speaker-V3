import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { BOOKING_RECEIPT_KEY } from "@/components/booking-form";
import { ThankYouState } from "@/components/thank-you-state";

describe("ThankYouState", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("does not claim acceptance on direct access", async () => {
    render(<ThankYouState />);

    expect(
      await screen.findByRole("heading", {
        name: "READY TO START THE CONVERSATION?",
      }),
    ).toBeVisible();
    expect(screen.queryByText(/has been received/i)).not.toBeInTheDocument();
  });

  it("shows the accepted inquiry ID without claiming email delivery", async () => {
    sessionStorage.setItem(
      BOOKING_RECEIPT_KEY,
      JSON.stringify({
        inquiryId: "CJ-ABCDEF123456",
        acceptedAt: "2026-08-18T20:00:00.000Z",
      }),
    );

    render(<ThankYouState />);

    expect(
      await screen.findByRole("heading", {
        name: "YOUR INQUIRY HAS BEEN RECEIVED.",
      }),
    ).toBeVisible();
    expect(screen.getByText("CJ-ABCDEF123456")).toBeVisible();
    expect(screen.queryByText(/confirmation email/i)).not.toBeInTheDocument();
    expect(screen.getByText(/will review the event details/i)).toBeVisible();
  });
});
