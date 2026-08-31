import "server-only";

import {
  createGrowthConfigurationHandlers,
  siteCommandHandlerRegistrySha256,
  type GrowthConfigurationAdapter,
  type ProvisioningSiteCommandHandler,
} from "@reuben-williams/next/control-plane";

import { CALEB_CONFIGURATION_POLICY } from "./configuration-policy";
import { assertCalebHandlerPolicy, CalebHandlerPolicyError } from "./handler-policy";
import { CALEB_HANDLER_REGISTRY_SHA256 } from "./manifest";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

export function createCalebInstallationHandlers(
  adapter: GrowthConfigurationAdapter,
): readonly ProvisioningSiteCommandHandler<unknown>[] {
  const policyByModule = new Map<
    string,
    (typeof CALEB_CONFIGURATION_POLICY.entries)[number]
  >(
    CALEB_CONFIGURATION_POLICY.entries.map((entry) => [entry.moduleId, entry]),
  );
  const versionedAdapter: GrowthConfigurationAdapter = {
    async upsertConfiguration(input) {
      const policy = policyByModule.get(input.moduleId);
      if (!policy) throw new CalebHandlerPolicyError();
      const target = { ...input, moduleVersion: policy.moduleVersion };
      const result = await adapter.upsertConfiguration(target);
      if (
        !isRecord(result) ||
        result.moduleId !== target.moduleId ||
        result.moduleVersion !== target.moduleVersion ||
        result.configVersion !== target.configVersion ||
        result.configuration !== target.configuration
      ) {
        throw new CalebHandlerPolicyError();
      }
      return {
        ...result,
        moduleVersion: input.moduleVersion,
      };
    },
  };
  const candidates = createGrowthConfigurationHandlers(versionedAdapter, {
    configuration: "caleb-speaking-engagements-v1",
  });
  const byIdentity = new Map(
    candidates.map((handler) => [`${handler.type}@${handler.version}`, handler]),
  );
  const selected = CALEB_CONFIGURATION_POLICY.entries.map((entry) => {
    const handler = byIdentity.get(`${entry.commandType}@${entry.commandVersion}`);
    return handler
      ? Object.freeze({ ...handler, moduleVersion: entry.moduleVersion })
      : undefined;
  });
  if (selected.some((handler) => !handler)) throw new CalebHandlerPolicyError();
  const handlers = Object.freeze(
    selected as unknown as readonly ProvisioningSiteCommandHandler<unknown>[],
  );
  assertCalebHandlerPolicy(handlers);
  if (siteCommandHandlerRegistrySha256(handlers) !== CALEB_HANDLER_REGISTRY_SHA256) {
    throw new CalebHandlerPolicyError();
  }
  return handlers;
}
