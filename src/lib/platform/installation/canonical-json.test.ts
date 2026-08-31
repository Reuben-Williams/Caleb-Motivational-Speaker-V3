import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  publicJwkSha256FromPrivateJwk,
  sha256CanonicalJson,
} from "./canonical-json";

describe("managed installation canonical JSON", () => {
  it("sorts object keys while preserving declared array order", () => {
    expect(canonicalJson({ z: 1, a: [{ y: true, x: false }, 2] })).toBe(
      '{"a":[{"x":false,"y":true},2],"z":1}',
    );
  });

  it("rejects values that JSON cannot represent canonically", () => {
    expect(() => canonicalJson({ unsafe: undefined })).toThrow("invalid_canonical_json");
    expect(() => canonicalJson(Number.NaN)).toThrow("invalid_canonical_json");
  });

  it("produces lowercase SHA-256 digests", () => {
    expect(sha256CanonicalJson({ value: "Caleb" })).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashes only the canonical Ed25519 public projection", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    const privateJwk = { ...privateKey.export({ format: "jwk" }), alg: "EdDSA" };
    const digest = publicJwkSha256FromPrivateJwk(privateJwk);

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(publicJwkSha256FromPrivateJwk({ ...privateJwk, d: privateJwk.d })).toBe(digest);
    expect(() => publicJwkSha256FromPrivateJwk({ ...privateJwk, alg: "RS256" })).toThrow(
      "invalid_installation_jwk",
    );
  });
});
