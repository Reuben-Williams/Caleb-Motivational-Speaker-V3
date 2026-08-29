import type { BuilderCookieAdapter } from "@reuben-williams/next/auth";

type CookieStore = Readonly<{
  getAll(): Array<{ name: string; value: string }>;
  set(
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ): void;
}>;

export function nextCookieAdapter(store: CookieStore): BuilderCookieAdapter {
  return {
    getAll: () => store.getAll(),
    setAll: (updates) => {
      for (const update of updates) {
        try {
          store.set(update.name, update.value, update.options);
        } catch {
          // Server Components cannot refresh cookies; route handlers can.
        }
      }
    },
  };
}
