import "server-only";

import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";

export type CheckoutAttemptReservation = Readonly<{
  siteId: string;
  attemptId: string;
  checkoutId: string;
  buyerIntentId: string;
  offerStableKey: string;
  nonceDigest: string;
  idempotencyKey: string;
  requestedAt: string;
  expiresAt: string;
}>;

export interface CheckoutAttemptRepository {
  reserve(input: CheckoutAttemptReservation): Promise<Readonly<{
    status: "created" | "conflict";
  }>>;
}

export function createCheckoutAttemptService(input: Readonly<{
  repository: CheckoutAttemptRepository;
  randomBytes?: () => Uint8Array;
}>) {
  const nextBytes = input.randomBytes ?? (() => nodeRandomBytes(32));
  return Object.freeze({
    async startNewAttempt(command: Readonly<{
      siteId: string;
      buyerIntentId: string;
      offerStableKey: string;
      requestedAt: string;
    }>) {
      requireUuid(command.siteId);
      requireUuid(command.buyerIntentId);
      requireStableKey(command.offerStableKey);
      const requestedAt = instant(command.requestedAt);

      for (let tries = 0; tries < 3; tries += 1) {
        const bytes = Buffer.from(nextBytes());
        if (bytes.byteLength !== 32) throw new TypeError("Checkout nonce entropy is invalid.");
        const nonce = bytes.toString("base64url");
        const nonceDigest = createHash("sha256").update(bytes).digest("hex");
        const attemptId = stableUuid(`${command.siteId}:attempt:${nonceDigest}`);
        const checkoutId = stableUuid(`${command.siteId}:checkout:${nonceDigest}`);
        const expiresAt = new Date(Date.parse(requestedAt) + 20 * 60 * 1_000).toISOString();
        const idempotencyKey = `caleb-preview:${attemptId}`;
        const reserved = await input.repository.reserve(Object.freeze({
          siteId: command.siteId,
          attemptId,
          checkoutId,
          buyerIntentId: command.buyerIntentId,
          offerStableKey: command.offerStableKey,
          nonceDigest,
          idempotencyKey,
          requestedAt,
          expiresAt,
        }));
        if (reserved.status === "created") {
          return Object.freeze({ nonce, attemptId, checkoutId, idempotencyKey, expiresAt });
        }
      }
      throw new TypeError("A distinct Checkout attempt could not be reserved.");
    },
  });
}

function stableUuid(value: string): string {
  const bytes = Buffer.from(createHash("sha256").update(value).digest().subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function requireUuid(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError("Checkout attempt identity is invalid.");
  }
}

function requireStableKey(value: string): void {
  if (!/^[a-z][a-z0-9-]{2,119}$/.test(value)) {
    throw new TypeError("Checkout offer key is invalid.");
  }
}

function instant(value: string): string {
  if (Number.isNaN(Date.parse(value))) throw new TypeError("Checkout attempt time is invalid.");
  return new Date(value).toISOString();
}
