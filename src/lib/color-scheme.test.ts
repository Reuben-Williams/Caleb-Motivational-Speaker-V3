import { describe, expect, it, vi } from "vitest";

import {
  COLOR_SCHEME_BOOTSTRAP_SCRIPT,
  COLOR_SCHEME_CHANGE_EVENT,
  COLOR_SCHEME_STORAGE_KEY,
  parseColorScheme,
  setColorScheme,
} from "@/lib/color-scheme";

describe("parseColorScheme", () => {
  it("accepts only the two supported color schemes", () => {
    expect(parseColorScheme("cinematic")).toBe("cinematic");
    expect(parseColorScheme("original")).toBe("original");
    expect(parseColorScheme("sepia")).toBe("cinematic");
    expect(parseColorScheme(null)).toBe("cinematic");
  });
});

describe("setColorScheme", () => {
  it("applies, announces, and stores the validated scheme", () => {
    const storage = { setItem: vi.fn() };
    const listener = vi.fn();
    window.addEventListener(COLOR_SCHEME_CHANGE_EVENT, listener);

    setColorScheme("original", {
      eventTarget: window,
      root: document.documentElement,
      storage,
    });

    expect(document.documentElement.dataset.colorScheme).toBe("original");
    expect(storage.setItem).toHaveBeenCalledWith(
      COLOR_SCHEME_STORAGE_KEY,
      "original",
    );
    expect(listener).toHaveBeenCalledOnce();
    expect(
      (listener.mock.calls[0][0] as CustomEvent).detail,
    ).toEqual({ scheme: "original" });

    window.removeEventListener(COLOR_SCHEME_CHANGE_EVENT, listener);
  });

  it("keeps the document and controls synchronized when storage rejects the write", () => {
    const listener = vi.fn();
    const storage = {
      setItem: vi.fn(() => {
        throw new DOMException("Storage disabled", "SecurityError");
      }),
    };
    window.addEventListener(COLOR_SCHEME_CHANGE_EVENT, listener);

    expect(() =>
      setColorScheme("original", {
        eventTarget: window,
        root: document.documentElement,
        storage,
      }),
    ).not.toThrow();
    expect(document.documentElement.dataset.colorScheme).toBe("original");
    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener(COLOR_SCHEME_CHANGE_EVENT, listener);
  });
});

describe("COLOR_SCHEME_BOOTSTRAP_SCRIPT", () => {
  it("applies a valid stored scheme before the controls mount", () => {
    document.documentElement.dataset.colorScheme = "cinematic";
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, "original");

    window.eval(COLOR_SCHEME_BOOTSTRAP_SCRIPT);

    expect(document.documentElement.dataset.colorScheme).toBe("original");
  });

  it("falls back to cinematic for an unsupported stored value", () => {
    document.documentElement.dataset.colorScheme = "cinematic";
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, "sepia");

    window.eval(COLOR_SCHEME_BOOTSTRAP_SCRIPT);

    expect(document.documentElement.dataset.colorScheme).toBe("cinematic");
  });

  it("keeps the server default when storage cannot be read", () => {
    document.documentElement.dataset.colorScheme = "cinematic";
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementationOnce(() => {
        throw new DOMException("Storage disabled", "SecurityError");
      });

    try {
      expect(() => window.eval(COLOR_SCHEME_BOOTSTRAP_SCRIPT)).not.toThrow();
      expect(document.documentElement.dataset.colorScheme).toBe("cinematic");
    } finally {
      getItem.mockRestore();
    }
  });
});
