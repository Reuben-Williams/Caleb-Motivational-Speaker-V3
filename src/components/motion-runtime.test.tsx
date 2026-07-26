import {
  act,
  cleanup,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MotionRuntime } from "@/components/motion-runtime";

const runtimeMocks = vi.hoisted(() => {
  const instances: MockLenis[] = [];
  const lenisConstructor = vi.fn();
  const gsapContext = vi.fn((setup: () => void) => {
    if (runtimeState.gsapError) throw runtimeState.gsapError;
    setup();
    return { revert: vi.fn() };
  });
  const scrollTriggerRefresh = vi.fn(() => {
    if (runtimeState.scrollTriggerError) {
      throw runtimeState.scrollTriggerError;
    }
  });
  const scrollTriggerUpdate = vi.fn();
  const runtimeState: {
    gsapError?: Error;
    lenisError?: Error;
    scrollTriggerError?: Error;
  } = {};

  class MockLenis {
    destroy = vi.fn();
    listeners = new Map<string, () => void>();
    off = vi.fn((event: string) => {
      this.listeners.delete(event);
    });
    on = vi.fn((event: string, listener: () => void) => {
      this.listeners.set(event, listener);
    });
    options: Record<string, unknown>;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      lenisConstructor(options);
      if (runtimeState.lenisError) throw runtimeState.lenisError;
      instances.push(this);
    }
  }

  return {
    gsapContext,
    instances,
    lenisConstructor,
    MockLenis,
    pathname: "/",
    runtimeState,
    scrollTriggerRefresh,
    scrollTriggerUpdate,
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => runtimeMocks.pathname,
}));

vi.mock("lenis", () => ({
  default: runtimeMocks.MockLenis,
}));

vi.mock("gsap", () => ({
  gsap: {
    context: runtimeMocks.gsapContext,
    fromTo: vi.fn(),
    registerPlugin: vi.fn(),
    ticker: {
      add: vi.fn(),
      lagSmoothing: vi.fn(),
      remove: vi.fn(),
    },
    to: vi.fn(),
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {
    refresh: runtimeMocks.scrollTriggerRefresh,
    update: runtimeMocks.scrollTriggerUpdate,
  },
}));

type MediaController = MediaQueryList & {
  setMatches: (matches: boolean) => void;
};

let mediaControllers = new Map<string, MediaController>();

function installMatchMedia(initialMatches: Record<string, boolean>) {
  mediaControllers = new Map();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      const existing = mediaControllers.get(query);
      if (existing) return existing;

      const listeners = new Set<() => void>();
      let matches = initialMatches[query] ?? false;
      const controller = {
        media: query,
        onchange: null,
        get matches() {
          return matches;
        },
        addEventListener: vi.fn(
          (_event: string, listener: () => void) => {
            listeners.add(listener);
          },
        ),
        removeEventListener: vi.fn(
          (_event: string, listener: () => void) => {
            listeners.delete(listener);
          },
        ),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        setMatches(nextMatches: boolean) {
          matches = nextMatches;
          for (const listener of listeners) listener();
        },
      } as unknown as MediaController;
      mediaControllers.set(query, controller);
      return controller;
    }),
  );
}

describe("MotionRuntime", () => {
  beforeEach(() => {
    runtimeMocks.instances.length = 0;
    runtimeMocks.lenisConstructor.mockReset();
    runtimeMocks.gsapContext.mockClear();
    runtimeMocks.scrollTriggerUpdate.mockReset();
    runtimeMocks.pathname = "/";
    runtimeMocks.runtimeState.gsapError = undefined;
    runtimeMocks.runtimeState.lenisError = undefined;
    runtimeMocks.runtimeState.scrollTriggerError = undefined;
    runtimeMocks.scrollTriggerRefresh.mockClear();
    document.documentElement.style.setProperty(
      "--header-height",
      "72px",
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-motion-mode");
    document.documentElement.style.removeProperty("--header-height");
  });

  it("initializes synchronized Lenis scrolling in mobile mode", async () => {
    installMatchMedia({
      "(max-width: 767px)": true,
      "(max-width: 900px)": true,
    });

    render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.lenisConstructor).toHaveBeenCalledWith({
        anchors: true,
        autoRaf: true,
        lerp: 0.075,
        smoothWheel: true,
        syncTouch: true,
        syncTouchLerp: 0.075,
      });
    });
    expect(runtimeMocks.gsapContext).not.toHaveBeenCalled();
  });

  it("uses synchronized Lenis without enhanced effects in tablet mode", async () => {
    installMatchMedia({
      "(max-width: 900px)": true,
      "(min-width: 768px) and (max-width: 1023px)": true,
    });

    render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.lenisConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          anchors: true,
          syncTouch: true,
        }),
      );
    });
    expect(runtimeMocks.gsapContext).not.toHaveBeenCalled();
  });

  it("keeps Lenis and enhanced effects synchronized on desktop", async () => {
    document.documentElement.style.setProperty(
      "--header-height",
      "84px",
    );
    installMatchMedia({});

    render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.lenisConstructor).toHaveBeenCalledWith({
        anchors: true,
        autoRaf: true,
        lerp: 0.075,
        smoothWheel: true,
        syncTouch: false,
        syncTouchLerp: 0.075,
      });
      expect(runtimeMocks.gsapContext).toHaveBeenCalledOnce();
    });

    runtimeMocks.instances[0].listeners.get("scroll")?.();
    expect(runtimeMocks.scrollTriggerUpdate).toHaveBeenCalledOnce();
  });

  it("uses only native scrolling when reduced motion is requested", async () => {
    installMatchMedia({
      "(prefers-reduced-motion: reduce)": true,
    });

    render(<MotionRuntime />);

    await waitFor(() => {
      expect(document.documentElement.dataset.motionMode).toBe("reduced");
    });
    expect(runtimeMocks.lenisConstructor).not.toHaveBeenCalled();
    expect(runtimeMocks.gsapContext).not.toHaveBeenCalled();
  });

  it("lets Lenis read the responsive CSS anchor offset without recreating", async () => {
    installMatchMedia({
      "(max-width: 900px)": true,
      "(min-width: 768px) and (max-width: 1023px)": true,
    });

    render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.instances).toHaveLength(1);
    });
    const compactHeaderQuery = mediaControllers.get("(max-width: 900px)");
    expect(compactHeaderQuery).toBeUndefined();

    document.documentElement.style.setProperty(
      "--header-height",
      "84px",
    );
    await Promise.resolve();

    expect(runtimeMocks.instances).toHaveLength(1);
    expect(runtimeMocks.instances[0].destroy).not.toHaveBeenCalled();
    expect(runtimeMocks.instances[0].options).toEqual(
      expect.objectContaining({
        anchors: true,
        syncTouch: true,
      }),
    );
  });

  it("destroys the current runtime on pathname and reduced-motion changes", async () => {
    installMatchMedia({});
    const view = render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.instances).toHaveLength(1);
      expect(runtimeMocks.gsapContext).toHaveBeenCalledOnce();
    });
    const firstInstance = runtimeMocks.instances[0];

    runtimeMocks.pathname = "/about";
    view.rerender(<MotionRuntime />);

    await waitFor(() => {
      expect(firstInstance.off).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
      );
      expect(firstInstance.destroy).toHaveBeenCalledOnce();
      expect(runtimeMocks.instances).toHaveLength(2);
    });

    const reducedMotionQuery = mediaControllers.get(
      "(prefers-reduced-motion: reduce)",
    );
    act(() => reducedMotionQuery?.setMatches(true));

    await waitFor(() => {
      expect(runtimeMocks.instances[1].destroy).toHaveBeenCalledOnce();
      expect(document.documentElement.dataset.motionMode).toBe("reduced");
    });
  });

  it("falls back to native scrolling when Lenis initialization fails", async () => {
    runtimeMocks.runtimeState.lenisError = new Error("lenis unavailable");
    installMatchMedia({
      "(max-width: 767px)": true,
      "(max-width: 900px)": true,
    });

    render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.lenisConstructor).toHaveBeenCalledOnce();
    });
    expect(runtimeMocks.instances).toHaveLength(0);
    expect(runtimeMocks.gsapContext).not.toHaveBeenCalled();
  });

  it("keeps Lenis active when enhanced effects fail", async () => {
    runtimeMocks.runtimeState.gsapError = new Error("gsap unavailable");
    installMatchMedia({});

    const view = render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.instances).toHaveLength(1);
      expect(runtimeMocks.gsapContext).toHaveBeenCalledOnce();
    });
    expect(runtimeMocks.instances[0].destroy).not.toHaveBeenCalled();
    expect(runtimeMocks.instances[0].off).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );

    view.unmount();
    expect(runtimeMocks.instances[0].destroy).toHaveBeenCalledOnce();
  });

  it("removes GSAP synchronization if ScrollTrigger setup fails", async () => {
    runtimeMocks.runtimeState.scrollTriggerError = new Error(
      "refresh unavailable",
    );
    installMatchMedia({});

    const view = render(<MotionRuntime />);

    await waitFor(() => {
      expect(runtimeMocks.scrollTriggerRefresh).toHaveBeenCalledOnce();
    });
    expect(runtimeMocks.instances[0].off).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
    expect(runtimeMocks.instances[0].destroy).not.toHaveBeenCalled();

    view.unmount();
    expect(runtimeMocks.instances[0].destroy).toHaveBeenCalledOnce();
  });
});
