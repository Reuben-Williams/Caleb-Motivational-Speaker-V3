const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CheckoutStatus = Readonly<{
  state: "pending" | "paid" | "fulfilled" | "attention" | "canceled";
  orderId: string | null;
  grantsAccess: boolean;
}>;

export function parseCheckoutStatus(value: unknown): CheckoutStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return pending();
  }
  const input = value as Record<string, unknown>;
  const state = input.serverState;
  const orderId = typeof input.orderId === "string" && ORDER_ID.test(input.orderId)
    ? input.orderId
    : null;

  if (
    !orderId
    || !["pending", "paid", "fulfilled", "attention", "canceled"].includes(
      String(state),
    )
  ) {
    return pending();
  }
  return Object.freeze({
    state: state as CheckoutStatus["state"],
    orderId,
    grantsAccess: state === "fulfilled",
  });
}

function pending(): CheckoutStatus {
  return Object.freeze({ state: "pending", orderId: null, grantsAccess: false });
}
