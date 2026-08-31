import "server-only";

import {
  installationManifestSha256,
} from "@reuben-williams/entitlements/trust";

import { publicJwkSha256FromPrivateJwk } from "./canonical-json";
import {
  CALEB_STABLE_SITE_KEY,
  type CalebInstallationArtifacts,
  validateCalebInstallationArtifacts,
} from "./manifest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_CASE_INSENSITIVE = new RegExp(UUID.source, "i");
const KEY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const BINDING_KEYS = [
  "version",
  "stableSiteKey",
  "installationId",
  "acceptedKeyId",
  "installationManifestSha256",
  "handlerRegistrySha256",
  "configurationPolicySha256",
  "publicJwkSha256",
  "boundAt",
] as const;

export interface CalebInstallationKeyBinding {
  version: 1;
  stableSiteKey: typeof CALEB_STABLE_SITE_KEY;
  installationId: string;
  acceptedKeyId: string;
  installationManifestSha256: string;
  handlerRegistrySha256: string;
  configurationPolicySha256: string;
  publicJwkSha256: string;
  boundAt: string;
}

export class CalebInstallationKeyBindingError extends Error {
  readonly code = "invalid_caleb_installation_key_binding";

  constructor() {
    super("invalid_caleb_installation_key_binding");
    this.name = "CalebInstallationKeyBindingError";
  }
}

function invalid(): never {
  throw new CalebInstallationKeyBindingError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function isCanonicalInstant(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export function parseCalebInstallationKeyBinding(
  value: unknown,
  artifacts?: CalebInstallationArtifacts,
): CalebInstallationKeyBinding {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== [...BINDING_KEYS].sort().join(",") ||
    value.version !== 1 ||
    value.stableSiteKey !== CALEB_STABLE_SITE_KEY ||
    typeof value.installationId !== "string" ||
    !UUID.test(value.installationId) ||
    typeof value.acceptedKeyId !== "string" ||
    !KEY_ID.test(value.acceptedKeyId) ||
    typeof value.installationManifestSha256 !== "string" ||
    !SHA256.test(value.installationManifestSha256) ||
    typeof value.handlerRegistrySha256 !== "string" ||
    !SHA256.test(value.handlerRegistrySha256) ||
    typeof value.configurationPolicySha256 !== "string" ||
    !SHA256.test(value.configurationPolicySha256) ||
    typeof value.publicJwkSha256 !== "string" ||
    !SHA256.test(value.publicJwkSha256) ||
    !isCanonicalInstant(value.boundAt)
  ) {
    return invalid();
  }

  if (artifacts) {
    const verified = validateCalebInstallationArtifacts(artifacts);
    if (
      value.installationManifestSha256 !==
        installationManifestSha256(verified.installationManifest) ||
      value.handlerRegistrySha256 !== verified.siteRuntime.handlerRegistrySha256 ||
      value.configurationPolicySha256 !== verified.configurationPolicySha256
    ) {
      return invalid();
    }
  }

  return value as unknown as CalebInstallationKeyBinding;
}

export function createCalebInstallationKeyBinding(input: {
  registration: { installationId: string; acceptedKeyId: string };
  privateJwk: unknown;
  artifacts: CalebInstallationArtifacts;
  boundAt: string;
}): CalebInstallationKeyBinding {
  const installationId = input.registration.installationId.toLowerCase();
  if (
    !UUID_CASE_INSENSITIVE.test(input.registration.installationId) ||
    !KEY_ID.test(input.registration.acceptedKeyId) ||
    !isCanonicalInstant(input.boundAt)
  ) {
    return invalid();
  }
  const verified = validateCalebInstallationArtifacts(input.artifacts);
  let publicJwkSha256: string;
  try {
    publicJwkSha256 = publicJwkSha256FromPrivateJwk(input.privateJwk);
  } catch {
    return invalid();
  }
  return parseCalebInstallationKeyBinding(
    {
      version: 1,
      stableSiteKey: CALEB_STABLE_SITE_KEY,
      installationId,
      acceptedKeyId: input.registration.acceptedKeyId,
      installationManifestSha256: installationManifestSha256(verified.installationManifest),
      handlerRegistrySha256: verified.siteRuntime.handlerRegistrySha256,
      configurationPolicySha256: verified.configurationPolicySha256,
      publicJwkSha256,
      boundAt: input.boundAt,
    },
    input.artifacts,
  );
}
