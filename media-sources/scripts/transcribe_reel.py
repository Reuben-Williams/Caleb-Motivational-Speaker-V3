from pathlib import Path
import sys
import textwrap


ROOT = Path(r"D:\Motivational Speaker Caleb\V3")
TOOLS = ROOT / ".media-tools/faster-whisper"
sys.path.insert(0, str(TOOLS))

from faster_whisper import WhisperModel  # noqa: E402


SOURCE = Path(
    r"D:\Motivational Speaker Caleb\Caleb Images and Videos\C4157-015.MP4"
)
OUTPUT_DIRECTORY = ROOT / "public/media/video"
MODEL_DIRECTORY = ROOT / ".media-tools/hf"


def timestamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def caption_text(text: str) -> str:
    return "\n".join(
        textwrap.wrap(
            " ".join(text.strip().split()),
            width=42,
            break_long_words=False,
            break_on_hyphens=False,
        )
    )


def apply_context_corrections(text: str) -> str:
    corrections = {
        "the P.A.N.P. is for Purpose": "the P in P.A.I.N. is for Purpose",
        "The A is for Invitation": "The I is for Invitation",
        "Joy and Air Enterprises": "Joyionaire Enterprises",
        "the word Joy and Air": "the word Joyionaire",
        "the word Willy and Air": "the word millionaire",
        "a place of joy": "a play off of joy",
        "A Joy and Air is": "A Joyionaire is",
        "their honor well": "their inner wealth",
    }
    for source, replacement in corrections.items():
        text = text.replace(source, replacement)
    return text


def main() -> None:
    model = WhisperModel(
        "small.en",
        device="cpu",
        compute_type="int8",
        download_root=str(MODEL_DIRECTORY),
    )
    segments, info = model.transcribe(
        str(SOURCE),
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=True,
        initial_prompt=(
            "Caleb Jakes of Joyionaire Enterprises explains the P.A.I.N. "
            "framework: P is Purpose, A is Access, I is Invitation, and N is "
            "Newness. Pain is not your ending; it is the birthplace of your "
            "becoming."
        ),
        word_timestamps=False,
    )
    materialized = list(segments)

    vtt_lines = ["WEBVTT", ""]
    transcript_lines = [
        "Caleb Jakes Speaker Reel",
        "Machine-assisted transcript draft — pending Caleb/user approval",
        f"Detected language: {info.language}",
        "",
    ]
    for segment in materialized:
        normalized = apply_context_corrections(
            " ".join(segment.text.strip().split())
        )
        if not normalized:
            continue
        vtt_lines.extend(
            [
                f"{timestamp(segment.start)} --> {timestamp(segment.end)}",
                caption_text(normalized),
                "",
            ]
        )
        transcript_lines.append(
            f"[{timestamp(segment.start)} --> {timestamp(segment.end)}] {normalized}"
        )

    (OUTPUT_DIRECTORY / "caleb-speaker-reel.en.vtt").write_text(
        "\n".join(vtt_lines),
        encoding="utf-8",
        newline="\n",
    )
    (OUTPUT_DIRECTORY / "caleb-speaker-reel-transcript.txt").write_text(
        "\n".join(transcript_lines) + "\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
