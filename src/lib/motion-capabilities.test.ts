import { describe, expect, it } from "vitest";

import {
  resolveMotionMode,
  resolveMotionRuntimePolicy,
} from "@/lib/motion-capabilities";

describe("motion capability precedence", () => {
  it("always gives reduced motion first priority", () => {
    expect(
      resolveMotionMode({
        reducedMotion: true,
        mobile: false,
        tablet: false,
        coarsePointer: false,
      }),
    ).toBe("reduced");
  });

  it("uses mobile before tablet or pointer capability", () => {
    expect(
      resolveMotionMode({
        reducedMotion: false,
        mobile: true,
        tablet: true,
        coarsePointer: true,
      }),
    ).toBe("mobile");
  });

  it("reserves enhanced mode for wide fine-pointer devices", () => {
    expect(
      resolveMotionMode({
        reducedMotion: false,
        mobile: false,
        tablet: false,
        coarsePointer: false,
      }),
    ).toBe("enhanced");
    expect(
      resolveMotionMode({
        reducedMotion: false,
        mobile: false,
        tablet: false,
        coarsePointer: true,
      }),
    ).toBe("tablet");
  });
});

describe("motion runtime policy", () => {
  it.each([
    [
      "reduced",
      { enhancedEffects: false, lenis: false, syncTouch: false },
    ],
    [
      "mobile",
      { enhancedEffects: false, lenis: true, syncTouch: true },
    ],
    [
      "tablet",
      { enhancedEffects: false, lenis: true, syncTouch: true },
    ],
    [
      "enhanced",
      { enhancedEffects: true, lenis: true, syncTouch: false },
    ],
  ] as const)("maps %s mode to its allowed runtime features", (mode, expected) => {
    expect(resolveMotionRuntimePolicy(mode)).toEqual(expected);
  });
});
