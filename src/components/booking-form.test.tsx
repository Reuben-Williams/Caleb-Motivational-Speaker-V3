import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingForm } from "@/components/booking-form";
import {
  BOOKING_DRAFT_KEY,
} from "@/lib/booking-draft";
import { validBooking } from "../../tests/booking-fixture";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("BookingForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a linked error summary instead of sending an invalid form", async () => {
    render(<BookingForm variant="full" />);

    fireEvent.submit(screen.getByRole("form", { name: "Speaking inquiry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please correct the following fields",
    );
    expect(
      screen.getByRole("link", { name: /your full name/i }),
    ).toHaveAttribute("href", "#fullName");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reveals the conditional audience field", async () => {
    const user = userEvent.setup();
    render(<BookingForm variant="full" />);

    await user.selectOptions(
      screen.getByLabelText("Audience type"),
      "other",
    );

    expect(screen.getByLabelText("Describe the audience type")).toBeVisible();
  });

  it("hands the abbreviated homepage inquiry to the full form as a draft", async () => {
    const user = userEvent.setup();
    render(<BookingForm variant="compact" />);

    await user.type(screen.getByLabelText("Full name"), "Jordan Avery");
    await user.type(
      screen.getByLabelText("Work email"),
      "jordan@example.org",
    );
    await user.type(
      screen.getByLabelText("Organization or institution"),
      "North Star College",
    );
    await user.selectOptions(
      screen.getByLabelText("Audience type"),
      "schools-colleges",
    );
    await user.type(screen.getByLabelText("Preferred date"), "2099-06-20");
    await user.type(
      screen.getByLabelText("Event goals"),
      "Help students connect resilience and identity with purpose.",
    );
    await user.click(screen.getByRole("button", { name: "Continue Inquiry" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/book-caleb?draft=1");
    });
    expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toContain(
      "North Star College",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores the accepted receipt and navigates only after API success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          code: "accepted",
          message: "received",
          inquiryId: "CJ-ABCDEF123456",
          acceptedAt: "2026-08-18T20:00:00.000Z",
        },
        { status: 202 },
      ),
    );
    render(
      <BookingForm
        challenge={
          <input
            name="turnstileToken"
            type="hidden"
            value="test-token"
            readOnly
          />
        }
        initialValues={validBooking}
        variant="full"
      />,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Send Speaking Inquiry" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/thank-you");
    });
    expect(sessionStorage.getItem("caleb-booking-receipt:v1")).toContain(
      "CJ-ABCDEF123456",
    );
    expect(sessionStorage.getItem("caleb-booking-receipt:v1")).toContain(
      "2026-08-18T20:00:00.000Z",
    );
    expect(sessionStorage.getItem("caleb-booking-receipt:v1")).not.toContain(
      "confirmationEmailSent",
    );
  });

  it("keeps a static preview fail-closed without attempting delivery", () => {
    render(
      <BookingForm
        submissionUnavailableMessage="This preview cannot send inquiries. Call (404) 941-5670 or email info@calebjakes.com."
        variant="full"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "This preview cannot send inquiries",
    );
    expect(
      screen.getByRole("button", { name: "Online Inquiry Unavailable" }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Speaking inquiry" }));
    expect(fetch).not.toHaveBeenCalled();
  });
});
