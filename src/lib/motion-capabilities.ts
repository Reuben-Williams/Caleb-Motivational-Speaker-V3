export type MotionMode = "reduced" | "mobile" | "tablet" | "enhanced";

export type MotionCapabilities = {
  reducedMotion: boolean;
  mobile: boolean;
  tablet: boolean;
  coarsePointer: boolean;
};

export type MotionRuntimePolicy = {
  enhancedEffects: boolean;
  lenis: boolean;
  syncTouch: boolean;
};

export function resolveMotionMode({
  reducedMotion,
  mobile,
  tablet,
  coarsePointer,
}: MotionCapabilities): MotionMode {
  if (reducedMotion) return "reduced";
  if (mobile) return "mobile";
  if (tablet || coarsePointer) return "tablet";
  return "enhanced";
}

export function resolveMotionRuntimePolicy(
  mode: MotionMode,
): MotionRuntimePolicy {
  return {
    enhancedEffects: mode === "enhanced",
    lenis: mode !== "reduced",
    syncTouch: mode === "mobile" || mode === "tablet",
  };
}
