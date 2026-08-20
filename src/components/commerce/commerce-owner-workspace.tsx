"use client";

import {
  CommerceWorkspace,
} from "@reuben-williams/growth-commerce-ui/owner";
import {
  type CommerceWorkspaceApi,
  type CommerceWorkspaceSnapshot,
} from "@reuben-williams/growth-commerce-ui";

const EMPTY_SNAPSHOT: CommerceWorkspaceSnapshot = Object.freeze({
  products: [],
  offers: [],
  orders: [],
  fulfillments: [],
  entitlements: [],
  providers: [],
  reconciliation: [],
});

const DENIED_API: CommerceWorkspaceApi = Object.freeze({
  externalEffects: false,
  async load() { return EMPTY_SNAPSHOT; },
  async revealShipping() { throw new TypeError("Access denied."); },
  async clearShipping() {},
  async transitionFulfillment() {
    return { status: "denied" as const, snapshot: EMPTY_SNAPSHOT, message: "Access denied." };
  },
});

export function CommerceOwnerWorkspace() {
  return (
    <CommerceWorkspace
      access={{
        canRead: false,
        canManageCatalog: false,
        canManageOrders: false,
        canManageFulfillment: false,
        canRevealShipping: false,
        canManageProviders: false,
      }}
      api={DENIED_API}
      mode="denied"
    />
  );
}
