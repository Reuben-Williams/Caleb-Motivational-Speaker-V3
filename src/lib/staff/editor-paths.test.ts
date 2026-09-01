import { describe, expect, it } from "vitest";

import {
  STAFF_EDITOR_PATH,
  resolveStaffEditorReturnPath,
  staffLoginPath,
} from "@/lib/staff/editor-paths";

describe("staff editor paths", () => {
  it("keeps the canonical editor route as the only approved return path", () => {
    expect(resolveStaffEditorReturnPath(STAFF_EDITOR_PATH)).toBe(
      STAFF_EDITOR_PATH,
    );
    expect(resolveStaffEditorReturnPath("/admin/editor/speaking-engagements")).toBe(
      STAFF_EDITOR_PATH,
    );
    expect(resolveStaffEditorReturnPath("https://attacker.example/steal")).toBe(
      STAFF_EDITOR_PATH,
    );
    expect(resolveStaffEditorReturnPath("//attacker.example/steal")).toBe(
      STAFF_EDITOR_PATH,
    );
  });

  it("builds a login URL that returns only to the canonical editor", () => {
    expect(staffLoginPath()).toBe("/admin/login?next=%2Fadmin%2Feditor");
  });
});
