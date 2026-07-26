"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import {
  resolveMotionMode,
  type MotionMode,
} from "@/lib/motion-capabilities";

const StageCanvas = dynamic(
  () =>
    import("@/components/stage-canvas").then((module) => module.StageCanvas),
  { ssr: false },
);

function currentMode(): MotionMode {
  return resolveMotionMode({
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    mobile: window.matchMedia("(max-width: 767px)").matches,
    tablet: window.matchMedia(
      "(min-width: 768px) and (max-width: 1023px)",
    ).matches,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  });
}

export function HeroAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<MotionMode>("mobile");
  const [visible, setVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);

  useEffect(() => {
    const updateMode = () => setMode(currentMode());
    const handleRuntimeMode = (event: Event) => {
      const next = (event as CustomEvent<MotionMode>).detail;
      if (next) setMode(next);
    };
    updateMode();
    window.addEventListener("caleb:motion-mode", handleRuntimeMode);

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    if (rootRef.current) observer.observe(rootRef.current);

    const handleVisibility = () =>
      setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      window.removeEventListener("caleb:motion-mode", handleRuntimeMode);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const enabled = mode === "enhanced" && visible && documentVisible;

  return (
    <div
      aria-hidden="true"
      className="hero-atmosphere"
      data-enabled={enabled}
      ref={rootRef}
    >
      {enabled ? <StageCanvas /> : null}
    </div>
  );
}

