import "server-only";

import { CALEB_CONFIGURATION_POLICY } from "./configuration-policy";

interface HandlerIdentity {
  readonly type: string;
  readonly version: number;
  readonly idempotency: string;
}

export class CalebHandlerPolicyError extends Error {
  readonly code = "caleb_handler_policy_mismatch";
  constructor() {
    super("caleb_handler_policy_mismatch");
    this.name = "CalebHandlerPolicyError";
  }
}

function failed(): never {
  throw new CalebHandlerPolicyError();
}

export function assertCalebHandlerPolicy<T extends HandlerIdentity>(
  handlers: readonly T[],
): readonly T[] {
  if (handlers.length !== CALEB_CONFIGURATION_POLICY.entries.length) return failed();
  const observed = new Map<string, T>();
  for (const handler of handlers) {
    if (
      typeof handler.type !== "string" ||
      !Number.isSafeInteger(handler.version) ||
      handler.idempotency !== "commandId"
    ) return failed();
    const key = `${handler.type}@${handler.version}`;
    if (observed.has(key)) return failed();
    observed.set(key, handler);
  }
  for (const entry of CALEB_CONFIGURATION_POLICY.entries) {
    if (!observed.has(`${entry.commandType}@${entry.commandVersion}`)) return failed();
  }
  return handlers;
}
