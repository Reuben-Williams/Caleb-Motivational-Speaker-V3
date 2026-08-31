import "server-only";

import {
  createInstallationClient,
  createSiteInstallationRuntime,
  type InstallationClient,
  type InstallationClientConfig,
  type ProvisioningSiteCommandHandler,
  type SiteInstallationRuntime,
} from "@reuben-williams/next/control-plane";

import { publicJwkSha256FromPrivateJwk } from "./canonical-json";
import { createCalebBoundedInstallationClient } from "./client";
import { parseCalebInstallationConfig } from "./config";
import { createCalebInstallationHealthSource } from "./health-source";
import { createCalebInstallationHandlers } from "./handlers";
import { parseCalebInstallationKeyBinding } from "./key-binding";
import {
  CALEB_SITE_DATA_PLANE_ID,
  CALEB_STABLE_SITE_KEY,
  CALEB_WORKER_VERSION,
  type CalebInstallationArtifacts,
  validateCalebInstallationArtifacts,
} from "./manifest";
import type { InstallationPostgresRpcClient } from "./postgres-client";
import { createPostgresGrowthConfigurationAdapter } from "./postgres-growth-configuration";
import { createPostgresInstallationIdentityStore } from "./postgres-identity-store";
import { createPostgresInstallationReceiptStore } from "./postgres-receipt-store";
import { createPostgresInstallationRunLeaseStore } from "./postgres-run-lease-store";
import {
  parseCalebInstallationRegistration,
  type CalebInstallationRegistration,
} from "./registration";

export class CalebInstallationRuntimeError extends Error {
  readonly code = "caleb_installation_runtime_invalid";
  constructor() {
    super("caleb_installation_runtime_invalid");
    this.name = "CalebInstallationRuntimeError";
  }
}

function failed(): never {
  throw new CalebInstallationRuntimeError();
}

function boundedHandlers(
  handlers: readonly ProvisioningSiteCommandHandler<unknown>[],
): readonly ProvisioningSiteCommandHandler<unknown>[] {
  return Object.freeze(handlers.map((handler) => Object.freeze({
    ...handler,
    async execute(input: Parameters<typeof handler.execute>[0]) {
      const timeout = AbortSignal.timeout(20_000);
      const signal = AbortSignal.any([input.signal, timeout]);
      return handler.execute({ ...input, signal });
    },
  })));
}

export function createCalebInstallationRuntime(input: {
  env: Readonly<Record<string, string | undefined>>;
  artifacts: CalebInstallationArtifacts;
  registration: unknown;
  binding: unknown;
  postgresClient: InstallationPostgresRpcClient;
  installationClientFactory?: (
    config: InstallationClientConfig,
  ) => Pick<InstallationClient, "pullCommands" | "acknowledgeResult" | "reportHealth">;
  now?: () => Date;
}): SiteInstallationRuntime {
  try {
    const config = parseCalebInstallationConfig(input.env);
    const artifacts = validateCalebInstallationArtifacts(input.artifacts);
    const registration = parseCalebInstallationRegistration(
      input.registration,
    ) as CalebInstallationRegistration;
    const binding = parseCalebInstallationKeyBinding(input.binding, input.artifacts);
    if (
      registration.installationId !== config.client.installationId ||
      registration.installationId !== binding.installationId ||
      registration.acceptedKeyId !== config.client.keyId ||
      registration.acceptedKeyId !== binding.acceptedKeyId ||
      binding.publicJwkSha256 !== publicJwkSha256FromPrivateJwk(config.client.privateJwk)
    ) return failed();

    const handlers = boundedHandlers(createCalebInstallationHandlers(
      createPostgresGrowthConfigurationAdapter(input.postgresClient),
    ));
    const baseFactory = input.installationClientFactory ?? createInstallationClient;
    return createSiteInstallationRuntime({
      config: config.client,
      siteDataPlaneSiteId: CALEB_SITE_DATA_PLANE_ID as never,
      expectedSiteKey: CALEB_STABLE_SITE_KEY,
      installationManifest: artifacts.installationManifest,
      workerVersion: CALEB_WORKER_VERSION,
      receiptStore: createPostgresInstallationReceiptStore(input.postgresClient, {
        installationId: registration.installationId,
      }),
      runLeaseStore: createPostgresInstallationRunLeaseStore(input.postgresClient),
      identityStore: createPostgresInstallationIdentityStore(input.postgresClient, {
        expectedSiteKey: CALEB_STABLE_SITE_KEY,
        installationId: registration.installationId,
      }),
      handlers,
      healthSource: createCalebInstallationHealthSource(input.postgresClient, {
        siteId: CALEB_SITE_DATA_PLANE_ID,
        installationId: registration.installationId,
      }),
    }, {
      leaseSeconds: 120,
      now: input.now,
      installationClientFactory: (clientConfig) =>
        createCalebBoundedInstallationClient(baseFactory(clientConfig), { now: input.now }),
    });
  } catch (error) {
    if (error instanceof CalebInstallationRuntimeError) throw error;
    return failed();
  }
}
