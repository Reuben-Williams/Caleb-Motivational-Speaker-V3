from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(r"D:\Motivational Speaker Caleb\V3")
REVIEW = ROOT / "media-review/higgsfield"
PUBLIC = ROOT / "public/media"


def black_feather(image: Image.Image, top: int, bottom: int, span: int) -> Image.Image:
    prepared = image.convert("RGB")
    overlay = Image.new("RGBA", prepared.size, (0, 0, 0, 0))
    alpha = Image.new("L", prepared.size, 0)
    alpha_pixels = alpha.load()

    for y in range(prepared.height):
        if y <= top:
            opacity = 255
        elif y < top + span:
            opacity = round(255 * (1 - ((y - top) / span)))
        elif y < bottom - span:
            opacity = 0
        elif y < bottom:
            opacity = round(255 * ((y - (bottom - span)) / span))
        else:
            opacity = 255

        for x in range(prepared.width):
            alpha_pixels[x, y] = opacity

    overlay.putalpha(alpha)
    return Image.alpha_composite(prepared.convert("RGBA"), overlay).convert("RGB")


def prepare_stage_outputs() -> None:
    desktop_raw = REVIEW / "H02-stage-desktop-higgsfield-raw.png"
    mobile_raw = REVIEW / "H03-stage-mobile-higgsfield-raw.png"

    with Image.open(desktop_raw) as image:
        desktop = ImageOps.fit(
            image.convert("RGB"),
            (2400, 1350),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        desktop.save(REVIEW / "H02-stage-desktop.png", "PNG", optimize=True)
        desktop.save(
            PUBLIC / "backgrounds/stage-desktop.webp",
            "WEBP",
            quality=90,
            method=6,
        )

    with Image.open(mobile_raw) as image:
        mobile = ImageOps.fit(
            image.convert("RGB"),
            (1600, 2000),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        cleaned = black_feather(
            mobile,
            top=510,
            bottom=1490,
            span=260,
        )
        cleaned.save(REVIEW / "H03-stage-mobile.png", "PNG", optimize=True)
        cleaned.save(
            PUBLIC / "backgrounds/stage-mobile.webp",
            "WEBP",
            quality=90,
            method=6,
        )


def prepare_cutout_output() -> None:
    cutout = REVIEW / "H01-caleb-speaking-cutout.png"
    if not cutout.exists():
        return

    with Image.open(cutout) as image:
        image.convert("RGBA").save(
            PUBLIC / "people/caleb-speaking-cutout.webp",
            "WEBP",
            quality=92,
            method=6,
            lossless=False,
        )


if __name__ == "__main__":
    prepare_stage_outputs()
    prepare_cutout_output()
