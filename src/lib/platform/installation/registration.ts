import "server-only";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KEY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REGISTERED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,6}Z$/;
const KEYS = ["version", "controlPlaneUrl", "stableSiteKey", "publicUrl", "registeredAt", "installationId", "acceptedKeyId", "publicSigningKeys", "endpoints"];
const ENDPOINTS = Object.freeze({
  pullCommands: "/api/platform/v1/installations/commands/pull",
  submitCommandResult: "/api/platform/v1/installations/commands/{commandId}/result",
  reportHealth: "/api/platform/v1/installations/health",
  rotateCredential: "/api/platform/v1/installations/credentials/rotate",
});

export interface CalebInstallationRegistration {
  version: 1;
  controlPlaneUrl: "https://site-editor-control-plane.vercel.app";
  stableSiteKey: "caleb-jakes-v3";
  publicUrl: "https://calebjakes.com";
  registeredAt: string;
  installationId: string;
  acceptedKeyId: string;
  publicSigningKeys: unknown[];
  endpoints: typeof ENDPOINTS;
}

export class CalebInstallationRegistrationError extends Error {
  readonly code = "caleb_installation_registration_invalid";
  constructor() {
    super("caleb_installation_registration_invalid");
    this.name = "CalebInstallationRegistrationError";
  }
}

function failed(): never {
  throw new CalebInstallationRegistrationError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

export function parseCalebInstallationRegistration(
  value: unknown,
): CalebInstallationRegistration {
  const endpoints = isRecord(value) && isRecord(value.endpoints) ? value.endpoints : null;
  if (
    !isRecord(value) ||
    JSON.stringify(value).length > 32_768 ||
    Object.keys(value).sort().join(",") !== [...KEYS].sort().join(",") ||
    value.version !== 1 ||
    value.controlPlaneUrl !== "https://site-editor-control-plane.vercel.app" ||
    value.stableSiteKey !== "caleb-jakes-v3" ||
    value.publicUrl !== "https://calebjakes.com" ||
    typeof value.registeredAt !== "string" ||
    !REGISTERED_AT.test(value.registeredAt) ||
    !Number.isFinite(Date.parse(value.registeredAt)) ||
    typeof value.installationId !== "string" ||
    !UUID.test(value.installationId) ||
    typeof value.acceptedKeyId !== "string" ||
    !KEY_ID.test(value.acceptedKeyId) ||
    !Array.isArray(value.publicSigningKeys) ||
    value.publicSigningKeys.length > 16 ||
    endpoints === null ||
    Object.keys(endpoints).sort().join(",") !== Object.keys(ENDPOINTS).sort().join(",") ||
    Object.entries(ENDPOINTS).some(([key, expected]) => endpoints[key] !== expected)
  ) return failed();
  return value as unknown as CalebInstallationRegistration;
}
