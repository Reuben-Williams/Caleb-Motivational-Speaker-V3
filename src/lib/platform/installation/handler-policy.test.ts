import { describe, expect, it } from "vitest";

import {
  CalebHandlerPolicyError,
  assertCalebHandlerPolicy,
} from "./handler-policy";

const handlers = [
  { type: "growth.customers.configure-v2", version: 1, idempotency: "commandId" },
  { type: "growth.leads.configure-v2", version: 1, idempotency: "commandId" },
  { type: "growth.messaging.configure", version: 1, idempotency: "commandId" },
] as const;

describe("Caleb handler policy", () => {
  it("accepts exactly the three approved command identities", () => {
    expect(assertCalebHandlerPolicy(handlers)).toEqual(handlers);
  });

  it("rejects a fourth handler, duplicate, wrong version, or wrong idempotency", () => {
    for (const value of [
      [...handlers, { type: "growth.dashboard.configure-v2", version: 1, idempotency: "commandId" }],
      [handlers[0], handlers[0], handlers[2]],
      [{ ...handlers[0], version: 2 }, handlers[1], handlers[2]],
      [{ ...handlers[0], idempotency: "payload" }, handlers[1], handlers[2]],
    ]) {
      expect(() => assertCalebHandlerPolicy(value)).toThrowError(CalebHandlerPolicyError);
    }
  });
});
