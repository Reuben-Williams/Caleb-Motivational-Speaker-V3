import Image, { type ImageProps } from "next/image";

import { withBasePath } from "@/lib/base-path";

import {
  resolvedImage,
  type CalebResolvedPageContent,
} from "./site-page-content";

export function EditableImage({
  content,
  regionId,
  ...imageProps
}: Readonly<{
  content: CalebResolvedPageContent;
  regionId: string;
}> & Omit<ImageProps, "alt" | "content" | "src">) {
  const value = resolvedImage(content, regionId);
  const isFirstPartyMedia = value.src.startsWith("/api/site-media/");
  return (
    <Image
      {...imageProps}
      alt={value.alt}
      data-builder-region-alt={value.alt}
      data-builder-region-id={regionId}
      data-builder-region-kind="image"
      data-builder-region-value={value.src}
      src={withBasePath(value.src)}
      unoptimized={imageProps.unoptimized ?? isFirstPartyMedia}
    />
  );
}
