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

export function createCalebInstallationHandlers(
  adapter: GrowthConfigurationAdapter,
): readonly ProvisioningSiteCommandHandler<any>[] {
  const candidates = createGrowthConfigurationHandlers(adapter, {
    configuration: "caleb-speaking-engagements-v1",
  });
  const byIdentity = new Map(
    candidates.map((handler) => [`${handler.type}@${handler.version}`, handler]),
  );
  const selected = CALEB_CONFIGURATION_POLICY.entries.map((entry) =>
    byIdentity.get(`${entry.commandType}@${entry.commandVersion}`),
  );
  if (selected.some((handler) => !handler)) throw new CalebHandlerPolicyError();
  const handlers = Object.freeze(
    selected as unknown as readonly ProvisioningSiteCommandHandler<any>[],
  );
  assertCalebHandlerPolicy(handlers);
  if (siteCommandHandlerRegistrySha256(handlers) !== CALEB_HANDLER_REGISTRY_SHA256) {
    throw new CalebHandlerPolicyError();
  }
  return handlers;
}
