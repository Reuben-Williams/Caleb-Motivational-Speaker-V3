"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  resolveMotionMode,
  resolveMotionRuntimePolicy,
} from "@/lib/motion-capabilities";

export function MotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const queries = {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
      mobile: window.matchMedia("(max-width: 767px)"),
      tablet: window.matchMedia(
        "(min-width: 768px) and (max-width: 1023px)",
      ),
      coarsePointer: window.matchMedia("(pointer: coarse)"),
    };
    let disposed = false;
    let generation = 0;
    let teardownRuntime: (() => void) | undefined;

    const configure = async () => {
      generation += 1;
      const currentGeneration = generation;
      teardownRuntime?.();
      teardownRuntime = undefined;

      const mode = resolveMotionMode({
        reducedMotion: queries.reducedMotion.matches,
        mobile: queries.mobile.matches,
        tablet: queries.tablet.matches,
        coarsePointer: queries.coarsePointer.matches,
      });
      document.documentElement.dataset.motionMode = mode;
      window.dispatchEvent(
        new CustomEvent("caleb:motion-mode", { detail: mode }),
      );
      const policy = resolveMotionRuntimePolicy(mode);
      if (!policy.lenis) return;

      let lenis: InstanceType<(typeof import("lenis"))["default"]>;
      try {
        const { default: Lenis } = await import("lenis");
        if (disposed || currentGeneration !== generation) return;

        lenis = new Lenis({
          anchors: true,
          autoRaf: true,
          lerp: 0.075,
          smoothWheel: true,
          syncTouch: policy.syncTouch,
          syncTouchLerp: 0.075,
        });
      } catch {
        return;
      }
      teardownRuntime = () => lenis.destroy();
      if (!policy.enhancedEffects) return;

      let updateScroll: (() => void) | undefined;
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (disposed || currentGeneration !== generation) return;

        gsap.registerPlugin(ScrollTrigger);
        updateScroll = () => ScrollTrigger.update();
        lenis.on("scroll", updateScroll);

        let context;
        try {
          context = gsap.context(() => {
            const homeHero = document.querySelector(".home-hero");
            const heroPortrait = document.querySelector(
              ".home-hero__portrait img",
            );
            const heroBackdrop = document.querySelector(
              ".home-hero__backdrop",
            );
            if (homeHero && heroPortrait) {
              gsap.to(heroPortrait, {
                yPercent: 7,
                ease: "none",
                scrollTrigger: {
                  trigger: homeHero,
                  start: "top top",
                  end: "bottom top",
                  scrub: 1,
                },
              });
            }
            if (homeHero && heroBackdrop) {
              gsap.to(heroBackdrop, {
                backgroundPosition: "50% 62%",
                ease: "none",
                scrollTrigger: {
                  trigger: homeHero,
                  start: "top top",
                  end: "bottom top",
                  scrub: 1,
                },
              });
            }

            const storySection =
              document.querySelector(".story-section");
            const storyImage = document.querySelector(
              ".story-image--primary img",
            );
            if (storySection && storyImage) {
              gsap.fromTo(
                storyImage,
                { scale: 1.06 },
                {
                  scale: 1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: storySection,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                  },
                },
              );
            }

            const audienceGrid =
              document.querySelector(".audience-grid");
            const audienceHeadings = document.querySelectorAll(
              ".audience-card h3",
            );
            if (audienceGrid && audienceHeadings.length > 0) {
              gsap.fromTo(
                audienceHeadings,
                { clipPath: "inset(0 100% 0 0)" },
                {
                  clipPath: "inset(0 0% 0 0)",
                  duration: 0.8,
                  stagger: 0.08,
                  ease: "power3.out",
                  scrollTrigger: {
                    trigger: audienceGrid,
                    start: "top 72%",
                    once: true,
                  },
                },
              );
            }

            const reelSection =
              document.querySelector(".reel-section");
            const reelFrame = document.querySelector(
              ".reel-section__frame",
            );
            if (reelSection && reelFrame) {
              gsap.fromTo(
                reelFrame,
                { clipPath: "inset(5% 7%)" },
                {
                  clipPath: "inset(0% 0%)",
                  ease: "none",
                  scrollTrigger: {
                    trigger: reelSection,
                    start: "top 80%",
                    end: "center 42%",
                    scrub: 1,
                  },
                },
              );
            }

            const processSection =
              document.querySelector(".process-section");
            const processCable = document.querySelector(
              ".process-section .cable-line path",
            );
            if (processSection && processCable) {
              gsap.fromTo(
                processCable,
                { strokeDasharray: 1600, strokeDashoffset: 1600 },
                {
                  strokeDashoffset: 0,
                  ease: "none",
                  scrollTrigger: {
                    trigger: processSection,
                    start: "top 70%",
                    end: "bottom 75%",
                    scrub: 1,
                  },
                },
              );
            }
          }, document.body);
        } catch {
          lenis.off("scroll", updateScroll);
          return;
        }

        ScrollTrigger.refresh();
        teardownRuntime = () => {
          context.revert();
          lenis.off("scroll", updateScroll!);
          lenis.destroy();
        };
      } catch {
        if (updateScroll) {
          lenis.off("scroll", updateScroll);
        }
        return;
      }
    };

    const handleChange = () => void configure();
    for (const query of Object.values(queries)) {
      query.addEventListener("change", handleChange);
    }
    void configure();

    return () => {
      disposed = true;
      generation += 1;
      teardownRuntime?.();
      for (const query of Object.values(queries)) {
        query.removeEventListener("change", handleChange);
      }
    };
  }, [pathname]);

  return null;
}
