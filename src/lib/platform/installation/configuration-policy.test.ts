import { describe, expect, it } from "vitest";

import {
  CALEB_CONFIGURATION_POLICY,
  configurationPolicySha256,
  parseCalebConfigurationPolicy,
} from "./configuration-policy";
import { sha256CanonicalJson } from "./canonical-json";

describe("Caleb managed configuration policy", () => {
  it("contains exactly the three approved command handlers", () => {
    const policy = parseCalebConfigurationPolicy(CALEB_CONFIGURATION_POLICY);

    expect(policy.entries.map((entry) => entry.commandType)).toEqual([
      "growth.customers.configure-v2",
      "growth.leads.configure-v2",
      "growth.messaging.configure",
    ]);
    expect(policy.entries.every((entry) => entry.commandVersion === 1)).toBe(true);
    expect(policy.entries.every((entry) => entry.idempotency === "commandId")).toBe(true);
    expect(policy.entries.every((entry) => entry.configuration === "caleb-speaking-engagements-v1"))
      .toBe(true);
  });

  it("rejects extra handlers, duplicate modules, and unknown fields", () => {
    const extra = structuredClone(CALEB_CONFIGURATION_POLICY) as any;
    extra.entries.push({ ...extra.entries[0], commandType: "growth.ai.configure", moduleId: "growth.ai" });
    expect(() => parseCalebConfigurationPolicy(extra)).toThrow("invalid_caleb_configuration_policy");

    const duplicateModule = structuredClone(CALEB_CONFIGURATION_POLICY) as any;
    duplicateModule.entries[1].moduleId = duplicateModule.entries[0].moduleId;
    expect(() => parseCalebConfigurationPolicy(duplicateModule)).toThrow(
      "invalid_caleb_configuration_policy",
    );

    expect(() => parseCalebConfigurationPolicy({ ...CALEB_CONFIGURATION_POLICY, extra: true }))
      .toThrow("invalid_caleb_configuration_policy");
  });

  it("binds the complete canonical policy document", () => {
    expect(configurationPolicySha256(CALEB_CONFIGURATION_POLICY)).toMatch(/^[a-f0-9]{64}$/);
    expect(configurationPolicySha256(CALEB_CONFIGURATION_POLICY)).not.toBe(
      sha256CanonicalJson(CALEB_CONFIGURATION_POLICY.entries),
    );
  });
});
