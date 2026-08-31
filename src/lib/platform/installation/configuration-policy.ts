import "server-only";

import { sha256CanonicalJson } from "./canonical-json";

const POLICY_ENTRIES = [
  {
    commandType: "growth.customers.configure-v2",
    commandVersion: 1,
    idempotency: "commandId",
    moduleId: "growth.customers",
    moduleVersion: "1.1.1",
    configVersion: 1,
    configuration: "caleb-speaking-engagements-v1",
  },
  {
    commandType: "growth.leads.configure-v2",
    commandVersion: 1,
    idempotency: "commandId",
    moduleId: "growth.leads",
    moduleVersion: "1.1.1",
    configVersion: 1,
    configuration: "caleb-speaking-engagements-v1",
  },
  {
    commandType: "growth.messaging.configure",
    commandVersion: 1,
    idempotency: "commandId",
    moduleId: "growth.messaging",
    moduleVersion: "1.0.1",
    configVersion: 1,
    configuration: "caleb-speaking-engagements-v1",
  },
] as const;

export const CALEB_CONFIGURATION_POLICY = Object.freeze({
  version: 1 as const,
  stableSiteKey: "caleb-jakes-v3" as const,
  entries: Object.freeze(POLICY_ENTRIES.map((entry) => Object.freeze({ ...entry }))),
});

export type CalebConfigurationPolicy = typeof CALEB_CONFIGURATION_POLICY;

export class CalebConfigurationPolicyError extends Error {
  readonly code = "invalid_caleb_configuration_policy";

  constructor() {
    super("invalid_caleb_configuration_policy");
    this.name = "CalebConfigurationPolicyError";
  }
}

function invalid(): never {
  throw new CalebConfigurationPolicyError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}

export function parseCalebConfigurationPolicy(value: unknown): CalebConfigurationPolicy {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["version", "stableSiteKey", "entries"]) ||
    value.version !== 1 ||
    value.stableSiteKey !== "caleb-jakes-v3" ||
    !Array.isArray(value.entries) ||
    value.entries.length !== POLICY_ENTRIES.length
  ) {
    return invalid();
  }

  const entries = value.entries.map((entry) => {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, [
        "commandType",
        "commandVersion",
        "idempotency",
        "moduleId",
        "moduleVersion",
        "configVersion",
        "configuration",
      ])
    ) {
      return invalid();
    }
    return entry;
  });
  const sorted = [...entries].sort((left, right) =>
    String(left.commandType).localeCompare(String(right.commandType)) ||
    Number(left.commandVersion) - Number(right.commandVersion));

  for (const [index, expected] of POLICY_ENTRIES.entries()) {
    const observed = sorted[index];
    if (
      observed.commandType !== expected.commandType ||
      observed.commandVersion !== expected.commandVersion ||
      observed.idempotency !== expected.idempotency ||
      observed.moduleId !== expected.moduleId ||
      observed.moduleVersion !== expected.moduleVersion ||
      observed.configVersion !== expected.configVersion ||
      observed.configuration !== expected.configuration
    ) {
      return invalid();
    }
  }

  if (new Set(entries.map((entry) => `${entry.commandType}@${entry.commandVersion}`)).size !== 3) {
    return invalid();
  }
  if (new Set(entries.map((entry) => entry.moduleId)).size !== 3) return invalid();

  return CALEB_CONFIGURATION_POLICY;
}

export function configurationPolicySha256(value: unknown): string {
  return sha256CanonicalJson(parseCalebConfigurationPolicy(value));
}
