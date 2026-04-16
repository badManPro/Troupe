"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MarkdownDiagramSection } from "@/lib/markdown/diagram-preview";
import { SectionDiagramPreviewButton } from "./section-diagram-preview-button";

interface MarkdownHeadingWithPreviewProps {
  as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  children: ReactNode;
  headingClassName?: string;
  wrapperClassName?: string;
  section?: MarkdownDiagramSection;
}

export function MarkdownHeadingWithPreview({
  as,
  children,
  headingClassName,
  wrapperClassName,
  section,
}: MarkdownHeadingWithPreviewProps) {
  const HeadingTag = as;

  return (
    <div className={cn("space-y-1", wrapperClassName)}>
      <HeadingTag className={headingClassName}>{children}</HeadingTag>
      {section?.previewEligible ? (
        <div className="flex justify-end">
          <SectionDiagramPreviewButton section={section} />
        </div>
      ) : null}
    </div>
  );
}
