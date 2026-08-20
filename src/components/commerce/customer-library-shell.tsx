"use client";

import { CustomerLibrary, type CustomerLibraryItem } from "@reuben-williams/growth-commerce-ui/customer";
import Link from "next/link";
import { useEffect, useState } from "react";

type LibraryState = Readonly<{
  mode: "ready" | "loading" | "empty" | "error" | "signed_out";
  customerLabel: string;
  items: readonly CustomerLibraryItem[];
}>;

export function CustomerLibraryShell() {
  const [state, setState] = useState<LibraryState>({
    mode: "loading",
    customerLabel: "Customer",
    items: [],
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await fetch("/api/customer-auth/session", { cache: "no-store" });
        if (session.status === 401) {
          if (active) setState({ mode: "signed_out", customerLabel: "Customer", items: [] });
          return;
        }
        if (!session.ok) throw new TypeError("Session unavailable.");
        const response = await fetch("/api/commerce/library", { cache: "no-store" });
        if (!response.ok) throw new TypeError("Library unavailable.");
        const result = await response.json() as {
          customerLabel?: string;
          items?: CustomerLibraryItem[];
        };
        const items = Array.isArray(result.items) ? result.items : [];
        if (active) setState({
          mode: items.length > 0 ? "ready" : "empty",
          customerLabel: result.customerLabel ?? "Customer",
          items,
        });
      } catch {
        if (active) setState({ mode: "error", customerLabel: "Customer", items: [] });
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="customer-library-shell">
      <CustomerLibrary
        customerLabel={state.customerLabel}
        items={state.items}
        mode={state.mode}
        onOpenAsset={(assetId) => {
          window.location.assign(`/api/commerce/assets/${encodeURIComponent(assetId)}`);
        }}
      />
      {state.mode === "signed_out" ? (
        <div className="library-sign-in-link">
          <Link className="button button--gold" href="/library/sign-in">
            <span>Request a secure sign-in link</span><span aria-hidden="true">↗</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
