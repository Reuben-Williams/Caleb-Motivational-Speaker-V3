export type ColorScheme = "cinematic" | "original";

export const DEFAULT_COLOR_SCHEME: ColorScheme = "cinematic";
export const COLOR_SCHEME_STORAGE_KEY = "caleb-color-scheme";
export const COLOR_SCHEME_CHANGE_EVENT = "caleb:color-scheme-change";
export const COLOR_SCHEME_BOOTSTRAP_SCRIPT = `(()=>{try{const value=localStorage.getItem("${COLOR_SCHEME_STORAGE_KEY}");document.documentElement.dataset.colorScheme=value==="original"?"original":"cinematic"}catch{}})();`;

type ColorSchemeEnvironment = {
  eventTarget?: EventTarget;
  root?: HTMLElement;
  storage?: Pick<Storage, "setItem">;
};

export function parseColorScheme(value: unknown): ColorScheme {
  return value === "original" ? "original" : DEFAULT_COLOR_SCHEME;
}

export function setColorScheme(
  value: unknown,
  environment: ColorSchemeEnvironment = {},
): ColorScheme {
  const scheme = parseColorScheme(value);
  const root = environment.root ?? document.documentElement;
  const eventTarget = environment.eventTarget ?? window;
  const storage = environment.storage ?? window.localStorage;

  root.dataset.colorScheme = scheme;
  eventTarget.dispatchEvent(
    new CustomEvent(COLOR_SCHEME_CHANGE_EVENT, {
      detail: { scheme },
    }),
  );

  try {
    storage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
  } catch {
    // Keep the visible preference even when browser storage is unavailable.
  }

  return scheme;
}
