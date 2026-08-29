import { describe, expect, it, vi } from "vitest";

import { PostgresSpeakingLeadRepository } from "@/lib/staff/lead-repository";

const session = {
  siteId: "11111111-1111-4111-8111-111111111111",
  memberId: "22222222-2222-4222-8222-222222222222",
  capabilities: ["leads.read", "leads.update", "tasks.manage", "messages.read"],
};

function repository(rows: readonly Record<string, unknown>[]) {
  const query = vi.fn().mockResolvedValue({ rows, rowCount: rows.length });
  const database = {
    withSession: vi.fn(async (_session, operation) => {
      expect(_session).toEqual(session);
      return operation({ ...session, query });
    }),
  };
  return { repository: new PostgresSpeakingLeadRepository({ database, session }), query };
}

describe("Speaking Engagements lead repository", () => {
  it("lists only speaking-engagement leads through the trusted site session", async () => {
    const { repository: leads, query } = repository([
      {
        id: "33333333-3333-4333-8333-333333333333",
        contact_id: "44444444-4444-4444-8444-444444444444",
        display_name: "Jordan Avery",
        organization: "North Star College",
        title: "Keynote — North Star College",
        status: "new",
        created_at: "2026-08-29T12:00:00.000Z",
        updated_at: "2026-08-29T12:00:00.000Z",
        version: "42",
      },
    ]);

    await expect(leads.list()).resolves.toEqual([
      expect.objectContaining({
        displayName: "Jordan Avery",
        pipeline: "Speaking Engagements",
        version: 42,
      }),
    ]);
    expect(query.mock.calls[0]?.[1]).toEqual(["speaking-engagement"]);
  });

  it("loads the submitted event, identities, timeline, and safe notification state", async () => {
    const { repository: leads } = repository([
      {
        id: "33333333-3333-4333-8333-333333333333",
        contact_id: "44444444-4444-4444-8444-444444444444",
        display_name: "Jordan Avery",
        organization: "North Star College",
        title: "Keynote — North Star College",
        status: "new",
        created_at: "2026-08-29T12:00:00.000Z",
        updated_at: "2026-08-29T12:00:00.000Z",
        version: "42",
        submission_id: "55555555-5555-4555-8555-555555555555",
        payload: { eventType: "keynote", eventGoals: "Build resilience" },
        identities: [{ kind: "email", value: "jordan@example.org" }],
        timeline: [{ kind: "created", occurredAt: "2026-08-29T12:00:00.000Z" }],
        notifications: [{ kind: "organizer_acknowledgement", state: "delivered" }],
      },
    ]);

    await expect(
      leads.get("33333333-3333-4333-8333-333333333333"),
    ).resolves.toMatchObject({
      submission: { payload: { eventType: "keynote" } },
      notifications: [{ state: "delivered" }],
    });
  });

  it("changes status with optimistic concurrency and appends a status event", async () => {
    const { repository: leads, query } = repository([{ version: "43" }]);

    await expect(
      leads.changeStatus({
        leadId: "33333333-3333-4333-8333-333333333333",
        expectedVersion: 42,
        status: "contacted",
        occurredAt: "2026-08-29T12:10:00.000Z",
      }),
    ).resolves.toEqual({ status: "applied", version: 43 });
    expect(query.mock.calls[0]?.[1]).toEqual([
      "33333333-3333-4333-8333-333333333333",
      42,
      "contacted",
      "2026-08-29T12:10:00.000Z",
    ]);
  });

  it("adds only bounded note or task metadata", async () => {
    const { repository: leads } = repository([{ id: "event-a" }]);
    await expect(
      leads.addActivity({
        leadId: "33333333-3333-4333-8333-333333333333",
        kind: "note",
        body: "Follow up next Tuesday.",
        occurredAt: "2026-08-29T12:10:00.000Z",
      }),
    ).resolves.toEqual({ status: "applied" });
    await expect(
      leads.addActivity({
        leadId: "33333333-3333-4333-8333-333333333333",
        kind: "note",
        body: "x".repeat(4001),
        occurredAt: "2026-08-29T12:10:00.000Z",
      }),
    ).rejects.toThrow("activity");
  });
});
