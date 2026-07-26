export type EvidenceId = "E01" | "E02" | "E03" | "E04" | "E05" | "E06";

export type EvidenceRecord = {
  source: string;
  sha256?: string;
  permits: readonly string[];
};

export const evidenceRegistry: Record<EvidenceId, EvidenceRecord> = {
  E01: {
    source:
      "C:\\Users\\Anoth\\.codex\\attachments\\a96c2c60-e541-4355-bb40-cae56b30e322\\pasted-text.txt",
    sha256:
      "f970c4ac463fb83f971bbf96304231203ce033447045f2a6576928721392fb4e",
    permits: [
      "brand message",
      "audiences",
      "routes",
      "calls to action",
      "contact details",
      "visual direction",
      "booking fields",
    ],
  },
  E02: {
    source: "docs/evidence/official-home-2026-07-25.md",
    sha256:
      "53e7a3290c4ca33253a00fcccdae5caa436700f128ab0a0b498f591bd20d70a9",
    permits: [
      "IAPO certification title",
      "RTF minister title",
      "six years of speaking experience",
      "international availability",
      "Rochester base",
      "Joyionaire founded in 2023",
    ],
  },
  E03: {
    source: "docs/evidence/official-about-2026-07-25.md",
    sha256:
      "763409ac2801b9d44258c8c2505a23f3555ee2b676db507a294ba8accb7b78b0",
    permits: [
      "authorship",
      "book title",
      "transformation themes",
      "Joyionaire mission",
      "supported speaking formats",
    ],
  },
  E04: {
    source: "docs/evidence/official-speaking-2026-07-25.md",
    sha256:
      "3d458444275eb26f7af0fa2ef3e0567c21aa163db2baaa5795b6627d3ea199b0",
    permits: [
      "keynotes",
      "workshops",
      "school and college programs",
      "faith events",
      "leadership",
      "panels",
      "podcast and media availability",
    ],
  },
  E05: {
    source: "docs/media-manifest.md revision 1",
    permits: ["Caleb's appearance in approved photographed settings"],
  },
  E06: {
    source:
      "https://www.amazon.com/Shedding-Pounds-Gaining-Purpose-Surrender/dp/B0D2YFGMJR",
    permits: ["verified book identity", "purchase destination"],
  },
};
