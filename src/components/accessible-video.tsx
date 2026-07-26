import { withBasePath } from "@/lib/base-path";

export function AccessibleVideo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "video-frame video-frame--compact" : "video-frame"}>
      <video
        controls
        playsInline
        poster={withBasePath("/media/video/caleb-speaker-reel-poster.webp")}
        preload="metadata"
      >
        <source
          src={withBasePath("/media/video/caleb-speaker-reel-720.mp4")}
          type="video/mp4"
        />
        <track
          default
          kind="captions"
          label="English"
          src={withBasePath("/media/video/caleb-speaker-reel.en.vtt")}
          srcLang="en"
        />
        Your browser does not support HTML video.
      </video>
      <a
        className="transcript-link"
        href={withBasePath("/media/video/caleb-speaker-reel-transcript.txt")}
      >
        Read the speaker reel transcript
      </a>
    </div>
  );
}
