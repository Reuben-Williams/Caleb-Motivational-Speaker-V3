from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(r"D:\Motivational Speaker Caleb\V3")

PHOTO_DERIVATIVES = (
    (
        Path(r"D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02040.jpg"),
        ROOT / "public/media/photos/caleb-book-portrait.webp",
        1800,
    ),
    (
        Path(r"D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02041.jpg"),
        ROOT / "public/media/photos/caleb-book-wide-01.webp",
        1920,
    ),
    (
        Path(r"D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02046.jpg"),
        ROOT / "public/media/photos/caleb-book-wide-02.webp",
        1920,
    ),
    (
        Path(r"D:\Motivational Speaker Caleb\Caleb Images and Videos\DSC02047.jpg"),
        ROOT / "public/media/photos/caleb-book-wide-03.webp",
        1920,
    ),
    (
        ROOT
        / "stitch_caleb_jakes_pain_has_purpose (1)"
        / "stitch_caleb_jakes_pain_has_purpose"
        / "image_from_https_lirp.cdn_website.com_bb893d4e_dms3rep_multi_opt_screenshot_1"
        / "screen.png",
        ROOT / "public/media/photos/caleb-speaking-wide.webp",
        1600,
    ),
    (
        ROOT
        / "stitch_caleb_jakes_pain_has_purpose (1)"
        / "stitch_caleb_jakes_pain_has_purpose"
        / "image_from_https_lirp.cdn_website.com_bb893d4e_dms3rep_multi_opt_screenshot_2"
        / "screen.png",
        ROOT / "public/media/photos/caleb-speaking-mobile.webp",
        1200,
    ),
)

REVIEW_IMAGES = (
    ("P01 · Book portrait", "public/media/photos/caleb-book-portrait.webp"),
    ("P02 · Book wide 01", "public/media/photos/caleb-book-wide-01.webp"),
    ("P03 · Book wide 02", "public/media/photos/caleb-book-wide-02.webp"),
    ("P04 · Book wide 03", "public/media/photos/caleb-book-wide-03.webp"),
    ("P05 · Speaking wide", "public/media/photos/caleb-speaking-wide.webp"),
    ("P06 · Speaking mobile", "public/media/photos/caleb-speaking-mobile.webp"),
    ("B01 · Authentic front cover", "public/media/book/caleb-book-front.webp"),
    ("B02 · Authentic Amazon art", "public/media/book/caleb-book-amazon.webp"),
)


def prepare_photo_derivatives() -> None:
    for source, destination, max_width in PHOTO_DERIVATIVES:
        with Image.open(source) as image:
            prepared = ImageOps.exif_transpose(image).convert("RGB")
            if prepared.width > max_width:
                height = round(prepared.height * max_width / prepared.width)
                prepared = prepared.resize(
                    (max_width, height),
                    Image.Resampling.LANCZOS,
                )
            prepared.save(destination, "WEBP", quality=88, method=6)


def prepare_book_derivatives() -> None:
    cover_wrap = ROOT / "media-sources/book/caleb-book-cover-wrap.png"
    with Image.open(cover_wrap) as image:
        prepared = image.convert("RGB")
        front = prepared.crop((532, 0, prepared.width, prepared.height))
        front = ImageOps.fit(
            front,
            (1000, 1500),
            method=Image.Resampling.LANCZOS,
            centering=(0.52, 0.5),
        )
        front.save(
            ROOT / "public/media/book/caleb-book-front.webp",
            "WEBP",
            quality=92,
            method=6,
        )

    amazon_source = ROOT / "media-sources/book/caleb-book-amazon.png"
    with Image.open(amazon_source) as image:
        image.convert("RGB").save(
            ROOT / "public/media/book/caleb-book-amazon.webp",
            "WEBP",
            quality=90,
            method=6,
        )


def create_review_sheet() -> None:
    card_width = 560
    image_height = 420
    label_height = 64
    columns = 2
    rows = (len(REVIEW_IMAGES) + columns - 1) // columns
    sheet = Image.new(
        "RGB",
        (card_width * columns, (image_height + label_height) * rows),
        "#0b0b0b",
    )

    for index, (label, relative_path) in enumerate(REVIEW_IMAGES):
        with Image.open(ROOT / relative_path) as image:
            prepared = image.convert("RGB")
            prepared.thumbnail((card_width, image_height), Image.Resampling.LANCZOS)
            x = (index % columns) * card_width
            y = (index // columns) * (image_height + label_height)
            image_x = x + (card_width - prepared.width) // 2
            image_y = y + (image_height - prepared.height) // 2
            sheet.paste(prepared, (image_x, image_y))

        # Pillow's default font keeps this audit script independent of system fonts.
        from PIL import ImageDraw

        draw = ImageDraw.Draw(sheet)
        draw.text((x + 16, y + image_height + 18), label, fill="#fdfcf8")

    sheet.save(
        ROOT / "media-review/photos/M1-photo-book-review.jpg",
        "JPEG",
        quality=92,
    )


def prepare_video_poster() -> None:
    poster_source = (
        ROOT / "media-sources/video/caleb-speaker-reel-poster-source.jpg"
    )
    if not poster_source.exists():
        return

    with Image.open(poster_source) as image:
        ImageOps.exif_transpose(image).convert("RGB").save(
            ROOT / "public/media/video/caleb-speaker-reel-poster.webp",
            "WEBP",
            quality=90,
            method=6,
        )


if __name__ == "__main__":
    prepare_photo_derivatives()
    prepare_book_derivatives()
    create_review_sheet()
    prepare_video_poster()
