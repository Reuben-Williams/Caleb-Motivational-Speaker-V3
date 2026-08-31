import "server-only";

import { createHash, createPrivateKey, createPublicKey, type JsonWebKey } from "node:crypto";

export class CanonicalJsonError extends Error {
  readonly code = "invalid_canonical_json";

  constructor() {
    super("invalid_canonical_json");
    this.name = "CanonicalJsonError";
  }
}

export class InstallationJwkError extends Error {
  readonly code = "invalid_installation_jwk";

  constructor() {
    super("invalid_installation_jwk");
    this.name = "InstallationJwkError";
  }
}

function invalidCanonical(): never {
  throw new CanonicalJsonError();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return invalidCanonical();
}

export function sha256CanonicalJson(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

const BASE64URL_32 = /^[A-Za-z0-9_-]{43}$/;

function invalidJwk(): never {
  throw new InstallationJwkError();
}

export function publicJwkSha256FromPrivateJwk(value: unknown): string {
  if (!isPlainRecord(value)) return invalidJwk();
  if (
    Object.keys(value).sort().join(",") !== "alg,crv,d,kty,x" ||
    value.alg !== "EdDSA" ||
    value.crv !== "Ed25519" ||
    value.kty !== "OKP" ||
    typeof value.x !== "string" ||
    !BASE64URL_32.test(value.x) ||
    typeof value.d !== "string" ||
    !BASE64URL_32.test(value.d)
  ) {
    return invalidJwk();
  }

  try {
    const privateKey = createPrivateKey({ key: value as JsonWebKey, format: "jwk" });
    const derived = createPublicKey(privateKey).export({ format: "jwk" });
    if (derived.kty !== "OKP" || derived.crv !== "Ed25519" || derived.x !== value.x) {
      return invalidJwk();
    }
    return sha256CanonicalJson({ alg: "EdDSA", crv: "Ed25519", kty: "OKP", x: value.x });
  } catch (error) {
    if (error instanceof InstallationJwkError) throw error;
    return invalidJwk();
  }
}
