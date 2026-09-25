export type CalebEditorStatus =
  | "idle" | "loading" | "saving" | "publishing" | "restoring" | "uploading"
  | "success" | "conflict" | "revalidation_pending" | "revalidation_failed" | "error";

export interface CalebEditorState {
  status: CalebEditorStatus;
  message: string;
  localValue: string;
  correlationId?: string;
}

export const initialCalebEditorState: CalebEditorState = {
  status: "idle",
  message: "",
  localValue: "",
};

export type CalebEditorAction =
  | { type: Exclude<CalebEditorStatus, "success" | "error" | "revalidation_pending" | "revalidation_failed"> }
  | { type: "success" | "error"; message: string }
  | { type: "revalidation_pending"; correlationId: string }
  | { type: "revalidation_failed"; correlationId: string; message: string }
  | { type: "local"; value: string };

export function calebEditorReducer(state: CalebEditorState, action: CalebEditorAction): CalebEditorState {
  if (action.type === "local") return { ...state, localValue: action.value };
  if (action.type === "success" || action.type === "error") return { ...state, status: action.type, message: action.message };
  if (action.type === "revalidation_failed") return {
    ...state,
    status: action.type,
    correlationId: action.correlationId,
    message: action.message,
  };
  if (action.type === "revalidation_pending") return {
    ...state,
    status: action.type,
    correlationId: action.correlationId,
    message: "Published; public refresh is still being completed.",
  };
  return { ...state, status: action.type, message: "" };
}
