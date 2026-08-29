import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpeakingEngagementsWorkspace } from "@/components/admin/speaking-engagements-workspace";
import type { SpeakingLeadListItem } from "@/lib/staff/lead-repository";

const lead: SpeakingLeadListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  contactId: "22222222-2222-4222-8222-222222222222",
  displayName: "Jordan Avery",
  organization: "North Star College",
  title: "Keynote — North Star College",
  status: "new",
  pipeline: "Speaking Engagements",
  createdAt: "2026-08-29T12:00:00.000Z",
  updatedAt: "2026-08-29T12:00:00.000Z",
  version: 42,
};

afterEach(() => vi.unstubAllGlobals());

describe("Speaking Engagements workspace", () => {
  it("renders the native pipeline and never labels it as HighLevel", () => {
    render(<SpeakingEngagementsWorkspace initialLeads={[lead]} />);
    expect(screen.getByRole("heading", { name: "Speaking Engagements" })).toBeInTheDocument();
    expect(screen.getByText("Jordan Avery")).toBeInTheDocument();
    expect(screen.queryByText(/HighLevel/i)).not.toBeInTheDocument();
  });

  it("loads the linked event summary and safe delivery status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          lead: {
            ...lead,
            submission: {
              id: "33333333-3333-4333-8333-333333333333",
              payload: { eventType: "keynote", eventGoals: "Build resilience" },
            },
            identities: [{ kind: "email", value: "jordan@example.org" }],
            timeline: [],
            notifications: [
              { kind: "organizer_acknowledgement", state: "delivered" },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SpeakingEngagementsWorkspace initialLeads={[lead]} />);

    await userEvent.click(screen.getByRole("button", { name: /Open Jordan Avery/i }));

    await waitFor(() => expect(screen.getByText("Build resilience")).toBeInTheDocument());
    expect(screen.getByText(/Delivered/i)).toBeInTheDocument();
  });

  it("renders a calm empty state", () => {
    render(<SpeakingEngagementsWorkspace initialLeads={[]} />);
    expect(screen.getByText("No speaking inquiries yet")).toBeInTheDocument();
  });
});
