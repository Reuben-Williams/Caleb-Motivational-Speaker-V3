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

  it("shows the accepted inquiry ID and confirmation warning", async () => {
    sessionStorage.setItem(
      BOOKING_RECEIPT_KEY,
      JSON.stringify({
        inquiryId: "CJ-ABCDEF123456",
        confirmationEmailSent: false,
        acceptedAt: Date.now(),
      }),
    );

    render(<ThankYouState />);

    expect(
      await screen.findByRole("heading", {
        name: "YOUR INQUIRY HAS BEEN RECEIVED.",
      }),
    ).toBeVisible();
    expect(screen.getByText("CJ-ABCDEF123456")).toBeVisible();
    expect(
      screen.getByText(/could not send a confirmation email/i),
    ).toBeVisible();
  });
});

