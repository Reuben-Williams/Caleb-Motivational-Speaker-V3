import { describe, expect, it } from "vitest";

import manifestFixture from "@/lib/inquiries/__fixtures__/highlevel/field-manifest.json";
import {
  parseHighLevelFieldManifest,
} from "@/lib/inquiries/highlevel-field-manifest";

function cloneManifest() {
  return structuredClone(manifestFixture) as typeof manifestFixture;
}

describe("HighLevel field manifest", () => {
  it("accepts the complete versioned contact and opportunity field map", () => {
    const parsed = parseHighLevelFieldManifest(JSON.stringify(manifestFixture));

    expect(parsed.version).toBe(1);
    expect(parsed.fields.contactRoleTitle.object).toBe("contact");
    expect(parsed.fields.websiteInquiryId.object).toBe("opportunity");
    expect(Object.keys(parsed.fields)).toHaveLength(26);
  });

  it("rejects an unrecognized version or missing semantic field", () => {
    expect(() =>
      parseHighLevelFieldManifest(
        JSON.stringify({ ...manifestFixture, version: 2 }),
      ),
    ).toThrow("version");

    const missing = cloneManifest();
    delete (missing.fields as Partial<typeof missing.fields>).websiteInquiryId;
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(missing)),
    ).toThrow("Website Inquiry ID");
  });

  it("rejects duplicate provider IDs and keys", () => {
    const duplicateId = cloneManifest();
    duplicateId.fields.organization.id =
      duplicateId.fields.websiteInquiryId.id;
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(duplicateId)),
    ).toThrow("duplicate field ID");

    const duplicateKey = cloneManifest();
    duplicateKey.fields.organization.key =
      duplicateKey.fields.websiteInquiryId.key;
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(duplicateKey)),
    ).toThrow("duplicate field key");
  });

  it("rejects a field on the wrong object or with an incompatible data type", () => {
    const wrongObject = cloneManifest();
    wrongObject.fields.contactRoleTitle.object = "opportunity";
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(wrongObject)),
    ).toThrow("Role / Title");

    const wrongType = cloneManifest();
    wrongType.fields.preferredDateStart.dataType = "TEXT";
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(wrongType)),
    ).toThrow("Preferred Start Date");
  });

  it("rejects incomplete, reordered, or extra dropdown options", () => {
    const incomplete = cloneManifest();
    incomplete.fields.attendanceMode.options = ["in-person", "virtual"];
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(incomplete)),
    ).toThrow("Attendance Mode");

    const reordered = cloneManifest();
    reordered.fields.attendanceMode.options = [
      "virtual",
      "in-person",
      "hybrid",
    ];
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(reordered)),
    ).toThrow("Attendance Mode");

    const extra = cloneManifest();
    extra.fields.attendanceMode.options.push("phone");
    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(extra)),
    ).toThrow("Attendance Mode");
  });

  it("requires the single live-compatible privacy-consent checkbox option", () => {
    const liveCompatible = cloneManifest();
    liveCompatible.fields.privacyConsent.options = [
      "Yes - privacy consent captured",
    ];

    expect(() =>
      parseHighLevelFieldManifest(JSON.stringify(liveCompatible)),
    ).not.toThrow();
  });
});
