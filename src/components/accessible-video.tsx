"use client";

import { useSyncExternalStore } from "react";

import { withBasePath } from "@/lib/base-path";

const MOBILE_VIDEO_QUERY = "(max-width: 767px)";

type VideoVariant = {
  captions: string;
  transcript: string;
  transcriptLabel: string;
  video: string;
};

const DESKTOP_VARIANT: VideoVariant = {
  captions: "/media/video/caleb-speaker-reel.en.vtt",
  transcript: "/media/video/caleb-speaker-reel-transcript.txt",
  transcriptLabel: "Read the speaker reel transcript",
  video: "/media/video/caleb-speaker-reel-720.mp4",
};

const MOBILE_VARIANT: VideoVariant = {
  captions: "/media/video/caleb-pain-comes-to-develop-mobile.en.vtt",
  transcript:
    "/media/video/caleb-pain-comes-to-develop-mobile-transcript.txt",
  transcriptLabel: "Read the mobile video transcript",
  video: "/media/video/caleb-pain-comes-to-develop-mobile.mp4",
};

type AccessibleVideoProps = {
  compact?: boolean;
  responsiveHomepage?: boolean;
};

function subscribeToMobileVideo(onChange: () => void) {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(MOBILE_VIDEO_QUERY);
  mediaQuery.addEventListener("change", onChange);

  return () => {
    mediaQuery.removeEventListener("change", onChange);
  };
}

function getMobileVideoSnapshot(): boolean | null {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia(MOBILE_VIDEO_QUERY).matches;
}

function getResponsiveServerSnapshot(): boolean | null {
  return null;
}

function subscribeToNothing() {
  return () => undefined;
}

function getDesktopSnapshot(): boolean | null {
  return false;
}

export function AccessibleVideo({
  compact = false,
  responsiveHomepage = false,
}: AccessibleVideoProps) {
  const isMobile = useSyncExternalStore(
    responsiveHomepage ? subscribeToMobileVideo : subscribeToNothing,
    responsiveHomepage ? getMobileVideoSnapshot : getDesktopSnapshot,
    responsiveHomepage
      ? getResponsiveServerSnapshot
      : getDesktopSnapshot,
  );

  const selectedVariant = responsiveHomepage
    ? isMobile === null
      ? null
      : isMobile
        ? MOBILE_VARIANT
        : DESKTOP_VARIANT
    : DESKTOP_VARIANT;
  const frameClassName = [
    "video-frame",
    compact ? "video-frame--compact" : null,
    responsiveHomepage ? "video-frame--responsive-homepage" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={frameClassName}>
      <video
        key={selectedVariant?.video ?? "responsive-video-pending"}
        controls
        playsInline
        poster={withBasePath("/media/video/caleb-speaker-reel-poster.webp")}
        preload={selectedVariant ? "metadata" : "none"}
      >
        {selectedVariant ? (
          <>
            <source
              src={withBasePath(selectedVariant.video)}
              type="video/mp4"
            />
            <track
              default
              kind="captions"
              label="English"
              src={withBasePath(selectedVariant.captions)}
              srcLang="en"
            />
          </>
        ) : null}
        Your browser does not support HTML video.
      </video>
      {selectedVariant ? (
        <a
          className="transcript-link"
          href={withBasePath(selectedVariant.transcript)}
        >
          {selectedVariant.transcriptLabel}
        </a>
      ) : null}
      {responsiveHomepage ? (
        <noscript>
          <a
            className="transcript-link"
            href={withBasePath(DESKTOP_VARIANT.video)}
          >
            Watch the speaker reel
          </a>{" "}
          <a
            className="transcript-link"
            href={withBasePath(DESKTOP_VARIANT.transcript)}
          >
            {DESKTOP_VARIANT.transcriptLabel}
          </a>
        </noscript>
      ) : null}
    </div>
  );
}
