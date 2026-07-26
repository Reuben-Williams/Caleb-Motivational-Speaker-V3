import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const outputDir = path.join(root, "public", "og");
const reviewDir = path.join(root, "artifacts", "m2");
const width = 1200;
const height = 630;

await mkdir(outputDir, { recursive: true });
await mkdir(reviewDir, { recursive: true });

const source = (...parts) => path.join(root, "public", "media", ...parts);
const output = (name) => path.join(outputDir, name);

function textSvg(content) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .display { font-family: "Arial Narrow", Impact, sans-serif; font-weight: 900; }
        .sans { font-family: Arial, sans-serif; font-weight: 700; }
      </style>
      ${content}
    </svg>
  `);
}

async function coverBackground(input, overlay) {
  return sharp(input)
    .resize(width, height, { fit: "cover", position: "centre" })
    .composite([{ input: textSvg(overlay) }])
    .jpeg({ quality: 91, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

const homeBackground = await coverBackground(
  source("backgrounds", "stage-desktop.webp"),
  `
    <defs>
      <linearGradient id="veil" x1="0" x2="1">
        <stop offset="0" stop-color="#050505" stop-opacity=".98"/>
        <stop offset=".58" stop-color="#050505" stop-opacity=".70"/>
        <stop offset="1" stop-color="#050505" stop-opacity=".18"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#veil)"/>
    <circle cx="925" cy="190" r="220" fill="#D4AF37" opacity=".10"/>
  `,
);

const homePortrait = await sharp(
  source("people", "caleb-speaking-cutout.webp"),
)
  .resize(680, 450, { fit: "contain", position: "bottom" })
  .png()
  .toBuffer();

await sharp(homeBackground)
  .composite([
    { input: homePortrait, left: 560, top: 180 },
    {
      input: textSvg(`
        <text x="72" y="82" class="sans" fill="#D4AF37" font-size="20" letter-spacing="4">CALEB JAKES  /  JOYIONAIRE™</text>
        <text x="70" y="250" class="display" fill="#FDFCF8" font-size="124" letter-spacing="-3">PAIN HAS</text>
        <text x="70" y="365" class="display" fill="#D4AF37" font-size="124" letter-spacing="-3">PURPOSE.</text>
        <rect x="72" y="420" width="66" height="4" fill="#D4AF37"/>
        <text x="72" y="466" class="sans" fill="#FDFCF8" font-size="22" letter-spacing="1">MOTIVATIONAL SPEAKER · AUTHOR</text>
        <text x="72" y="505" class="sans" fill="#D0C5AF" font-size="19">Turning struggles into strength and dreams into destiny.</text>
        <path d="M0 580 C 180 540, 330 620, 515 580 S 850 540, 1225 588" fill="none" stroke="#D4AF37" stroke-width="3"/>
      `),
    },
  ])
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
  .toFile(output("home.jpg"));

const speakingBackground = await coverBackground(
  source("photos", "caleb-speaking-wide.webp"),
  `
    <defs>
      <linearGradient id="speak-veil" x1="0" y1="1" x2=".75" y2=".2">
        <stop offset="0" stop-color="#050505" stop-opacity=".98"/>
        <stop offset=".58" stop-color="#050505" stop-opacity=".72"/>
        <stop offset="1" stop-color="#050505" stop-opacity=".24"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#speak-veil)"/>
  `,
);

await sharp(speakingBackground)
  .composite([
    {
      input: textSvg(`
        <text x="72" y="76" class="sans" fill="#D4AF37" font-size="19" letter-spacing="4">CALEB JAKES</text>
        <text x="66" y="358" class="display" fill="#FDFCF8" font-size="154" letter-spacing="-3">SPEAKING</text>
        <rect x="72" y="390" width="380" height="5" fill="#D4AF37"/>
        <text x="72" y="442" class="sans" fill="#FDFCF8" font-size="22" letter-spacing="1">KEYNOTES · WORKSHOPS · CONVERSATIONS</text>
        <text x="72" y="485" class="sans" fill="#D0C5AF" font-size="19">A message shaped for the people in the room.</text>
        <text x="72" y="565" class="sans" fill="#D4AF37" font-size="18" letter-spacing="3">PAIN HAS PURPOSE.</text>
      `),
    },
  ])
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
  .toFile(output("speaking.jpg"));

const bookCover = await sharp(source("book", "caleb-book-front.webp"))
  .resize(310, 465, { fit: "cover" })
  .extend({
    top: 0,
    right: 16,
    bottom: 0,
    left: 0,
    background: "#2d250f",
  })
  .rotate(-3, { background: { r: 5, g: 5, b: 5, alpha: 0 } })
  .png()
  .toBuffer();

await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: "#050505",
  },
})
  .composite([
    {
      input: textSvg(`
        <defs>
          <radialGradient id="book-glow">
            <stop offset="0" stop-color="#D4AF37" stop-opacity=".34"/>
            <stop offset="1" stop-color="#050505" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="285" cy="320" r="300" fill="url(#book-glow)"/>
        <text x="545" y="76" class="sans" fill="#D4AF37" font-size="19" letter-spacing="4">THE BOOK BY CALEB JAKES</text>
        <text x="545" y="190" class="display" fill="#FDFCF8" font-size="72">SHEDDING POUNDS,</text>
        <text x="545" y="263" class="display" fill="#D4AF37" font-size="72">GAINING PURPOSE</text>
        <text x="545" y="328" class="sans" fill="#D0C5AF" font-size="22">THE WEIGHTY JOY OF SURRENDER</text>
        <rect x="545" y="365" width="72" height="5" fill="#D4AF37"/>
        <text x="545" y="422" class="sans" fill="#FDFCF8" font-size="20">Faith. Identity. Transformation. Purpose.</text>
        <text x="545" y="548" class="sans" fill="#D4AF37" font-size="18" letter-spacing="3">PAIN HAS PURPOSE.</text>
      `),
    },
    { input: bookCover, left: 118, top: 80 },
  ])
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
  .toFile(output("book-media.jpg"));

const reviewTiles = await Promise.all(
  ["home.jpg", "speaking.jpg", "book-media.jpg"].map(async (name) => ({
    input: await sharp(output(name))
      .resize(600, 315)
      .jpeg({ quality: 88 })
      .toBuffer(),
    name,
  })),
);

const reviewSvg = (label) => {
  const escapedLabel = label.toUpperCase().replaceAll("&", "&amp;");
  return Buffer.from(`
    <svg width="600" height="55" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="55" fill="#131313"/>
      <text x="18" y="35" fill="#D4AF37" font-size="17" font-family="Arial" font-weight="700" letter-spacing="2">${escapedLabel} · 1200×630</text>
    </svg>
  `);
};

await sharp({
  create: {
    width: 1240,
    height: 780,
    channels: 3,
    background: "#050505",
  },
})
  .composite([
    { input: reviewTiles[0].input, left: 20, top: 20 },
    { input: reviewSvg("Homepage"), left: 20, top: 335 },
    { input: reviewTiles[1].input, left: 620, top: 20 },
    { input: reviewSvg("Speaking"), left: 620, top: 335 },
    { input: reviewTiles[2].input, left: 20, top: 410 },
    { input: reviewSvg("Book & Media"), left: 20, top: 725 },
    {
      input: textSvg(`
        <text x="680" y="500" class="display" fill="#FDFCF8" font-size="64">M2 REVIEW</text>
        <text x="680" y="550" class="sans" fill="#D0C5AF" font-size="19">Generated only from M1-approved media.</text>
        <text x="680" y="584" class="sans" fill="#D0C5AF" font-size="19">No metadata references are active yet.</text>
        <rect x="680" y="620" width="320" height="5" fill="#D4AF37"/>
      `),
      left: 0,
      top: 0,
    },
  ])
  .jpeg({ quality: 91, chromaSubsampling: "4:4:4" })
  .toFile(path.join(reviewDir, "m2-social-images-review.jpg"));

const hashes = {};
for (const name of ["home.jpg", "speaking.jpg", "book-media.jpg"]) {
  const bytes = await readFile(output(name));
  hashes[name] = createHash("sha256").update(bytes).digest("hex");
}

await writeFile(
  path.join(reviewDir, "social-image-hashes.json"),
  `${JSON.stringify(hashes, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(hashes, null, 2));
