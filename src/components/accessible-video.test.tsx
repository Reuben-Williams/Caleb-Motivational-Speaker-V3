import { act, cleanup, render, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccessibleVideo } from "@/components/accessible-video";

const MOBILE_VIDEO_QUERY = "(max-width: 767px)";

type MediaController = MediaQueryList & {
  setMatches: (matches: boolean) => void;
};

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  let matches = initialMatches;
  const controller = {
    media: MOBILE_VIDEO_QUERY,
    onchange: null,
    get matches() {
      return matches;
    },
    addEventListener: vi.fn(
      (_event: string, listener: () => void) => listeners.add(listener),
    ),
    removeEventListener: vi.fn(
      (_event: string, listener: () => void) => listeners.delete(listener),
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      for (const listener of listeners) listener();
    },
  } as unknown as MediaController;

  const matchMedia = vi.fn((query: string) => {
    expect(query).toBe(MOBILE_VIDEO_QUERY);
    return controller;
  });
  vi.stubGlobal("matchMedia", matchMedia);

  return { controller, matchMedia };
}

function getSelectedMedia(container: HTMLElement) {
  const source = container.querySelector("video source");
  const track = container.querySelector("video track");
  const transcript = container.querySelector<HTMLAnchorElement>(
    "a.transcript-link",
  );

  return {
    source: source?.getAttribute("src"),
    track: track?.getAttribute("src"),
    transcript: transcript?.getAttribute("href"),
  };
}

describe("AccessibleVideo", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("waits for the responsive viewport before emitting a video source", () => {
    const html = renderToStaticMarkup(
      <AccessibleVideo responsiveHomepage />,
    );

    expect(html).toContain('preload="none"');
    expect(html).not.toContain("<source");
    expect(html).toContain("Watch the speaker reel");
    expect(html).toContain("Read the speaker reel transcript");
  });

  it("selects the portrait media package for the homepage on mobile", async () => {
    installMatchMedia(true);

    const { container } = render(<AccessibleVideo responsiveHomepage />);

    await waitFor(() => {
      expect(container.firstElementChild).toHaveClass(
        "video-frame--responsive-homepage",
      );
      expect(getSelectedMedia(container)).toEqual({
        source: "/media/video/caleb-pain-comes-to-develop-mobile.mp4",
        track:
          "/media/video/caleb-pain-comes-to-develop-mobile.en.vtt",
        transcript:
          "/media/video/caleb-pain-comes-to-develop-mobile-transcript.txt",
      });
    });
  });

  it("keeps the existing speaker reel for the homepage on desktop", async () => {
    installMatchMedia(false);

    const { container } = render(<AccessibleVideo responsiveHomepage />);

    await waitFor(() => {
      expect(getSelectedMedia(container)).toEqual({
        source: "/media/video/caleb-speaker-reel-720.mp4",
        track: "/media/video/caleb-speaker-reel.en.vtt",
        transcript: "/media/video/caleb-speaker-reel-transcript.txt",
      });
    });
  });

  it("does not make the compact book-media player responsive", () => {
    const { matchMedia } = installMatchMedia(true);

    const { container } = render(<AccessibleVideo compact />);

    expect(getSelectedMedia(container)).toEqual({
      source: "/media/video/caleb-speaker-reel-720.mp4",
      track: "/media/video/caleb-speaker-reel.en.vtt",
      transcript: "/media/video/caleb-speaker-reel-transcript.txt",
    });
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("switches complete media packages and removes its listener", async () => {
    const { controller } = installMatchMedia(false);
    const view = render(<AccessibleVideo responsiveHomepage />);

    await waitFor(() => {
      expect(getSelectedMedia(view.container).source).toBe(
        "/media/video/caleb-speaker-reel-720.mp4",
      );
    });

    act(() => controller.setMatches(true));

    await waitFor(() => {
      expect(getSelectedMedia(view.container)).toEqual({
        source: "/media/video/caleb-pain-comes-to-develop-mobile.mp4",
        track:
          "/media/video/caleb-pain-comes-to-develop-mobile.en.vtt",
        transcript:
          "/media/video/caleb-pain-comes-to-develop-mobile-transcript.txt",
      });
    });

    view.unmount();
    expect(controller.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
