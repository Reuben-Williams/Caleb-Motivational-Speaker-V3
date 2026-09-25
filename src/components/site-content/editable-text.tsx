import { createElement, type HTMLAttributes } from "react";

import {
  resolvedText,
  type CalebResolvedPageContent,
} from "./site-page-content";

type EditableTextElement = "blockquote" | "h1" | "h2" | "h3" | "p" | "span";

export function EditableText({
  as,
  content,
  regionId,
  ...attributes
}: Readonly<{
  as: EditableTextElement;
  content: CalebResolvedPageContent;
  regionId: string;
}> & Omit<HTMLAttributes<HTMLElement>, "children" | "content">) {
  const value = resolvedText(content, regionId);
  return createElement(as, {
    ...attributes,
    "data-builder-region-id": regionId,
    "data-builder-region-kind": "text",
    "data-builder-region-value": value,
  }, value);
}
