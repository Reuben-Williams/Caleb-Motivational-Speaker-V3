"use client";

import { useSyncExternalStore } from "react";

import {
  COLOR_SCHEME_CHANGE_EVENT,
  type ColorScheme,
  parseColorScheme,
  setColorScheme,
} from "@/lib/color-scheme";

type ColorSchemeToggleProps = {
  className?: string;
};

function subscribeToColorScheme(onChange: () => void) {
  window.addEventListener(COLOR_SCHEME_CHANGE_EVENT, onChange);
  return () =>
    window.removeEventListener(COLOR_SCHEME_CHANGE_EVENT, onChange);
}

function getColorSchemeSnapshot(): ColorScheme {
  return parseColorScheme(
    document.documentElement.dataset.colorScheme,
  );
}

export function ColorSchemeToggle({
  className = "",
}: ColorSchemeToggleProps) {
  const scheme = useSyncExternalStore<ColorScheme | null>(
    subscribeToColorScheme,
    getColorSchemeSnapshot,
    () => null,
  );
  const ready = scheme !== null;

  const toggleScheme = () => {
    if (!scheme) {
      return;
    }

    const nextScheme = scheme === "original" ? "cinematic" : "original";
    setColorScheme(nextScheme);
  };

  return (
    <button
      aria-pressed={ready ? scheme === "original" : undefined}
      className={`color-scheme-toggle ${className}`.trim()}
      data-ready={ready}
      disabled={!ready}
      type="button"
      onClick={toggleScheme}
    >
      Original colors
    </button>
  );
}
