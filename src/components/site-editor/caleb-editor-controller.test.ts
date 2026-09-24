import { describe, expect, it } from "vitest";

import { calebEditorReducer, initialCalebEditorState } from "./caleb-editor-controller";

describe("Caleb editor controller", () => {
  it("models every approved operation state and preserves local text on conflict", () => {
    expect(calebEditorReducer(initialCalebEditorState, { type: "loading" }).status).toBe("loading");
    expect(calebEditorReducer(initialCalebEditorState, { type: "saving" }).status).toBe("saving");
    expect(calebEditorReducer(initialCalebEditorState, { type: "publishing" }).status).toBe("publishing");
    expect(calebEditorReducer(initialCalebEditorState, { type: "restoring" }).status).toBe("restoring");
    expect(calebEditorReducer(initialCalebEditorState, { type: "uploading" }).status).toBe("uploading");
    expect(calebEditorReducer(initialCalebEditorState, { type: "success", message: "Saved" })).toMatchObject({ status: "success", message: "Saved" });
    expect(calebEditorReducer({ ...initialCalebEditorState, localValue: "Keep this" }, { type: "conflict" }))
      .toMatchObject({ status: "conflict", localValue: "Keep this" });
    expect(calebEditorReducer(initialCalebEditorState, { type: "revalidation_pending", correlationId: "c" }))
      .toMatchObject({ status: "revalidation_pending", correlationId: "c" });
    expect(calebEditorReducer(initialCalebEditorState, { type: "error", message: "Failed" }))
      .toMatchObject({ status: "error", message: "Failed" });
  });
});
