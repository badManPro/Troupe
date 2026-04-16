"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { createMarkdownDiagramSectionMap } from "@/lib/markdown/diagram-preview";
import { MarkdownHeadingWithPreview } from "@/components/markdown/markdown-heading-with-preview";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  density?: "default" | "compact";
  showDiagramPreview?: boolean;
}

export function MarkdownViewer({
  content,
  className,
  density = "default",
  showDiagramPreview = true,
}: MarkdownViewerProps) {
  const sectionMap = useMemo(
    () => createMarkdownDiagramSectionMap(content),
    [content]
  );

  const getSectionByNode = (node?: {
    position?: { start?: { line?: number } };
  }) => {
    if (!showDiagramPreview) return undefined;
    const line = node?.position?.start?.line;
    return typeof line === "number" ? sectionMap.get(line) : undefined;
  };

  const isCompact = density === "compact";

  return (
    <div
      className={cn(
        "prose max-w-none text-foreground dark:prose-invert",
        "prose-headings:text-foreground prose-strong:text-foreground",
        "prose-p:text-foreground/88 prose-li:text-foreground/84 prose-blockquote:text-foreground/72",
        "prose-code:text-foreground prose-th:text-foreground prose-td:text-foreground/84",
        isCompact
          ? [
              "prose-sm",
              "prose-headings:mb-1.5 prose-headings:mt-4",
              "prose-h1:text-lg prose-h2:text-base prose-h3:text-[0.95rem]",
              "prose-p:my-2 prose-p:leading-6",
              "prose-ul:my-2 prose-ul:space-y-1 prose-ul:pl-4",
              "prose-ol:my-2 prose-ol:space-y-1 prose-ol:pl-4",
              "prose-li:leading-6",
              "prose-blockquote:my-3 prose-blockquote:pl-3",
              "prose-pre:my-3 prose-pre:px-3 prose-pre:py-2.5",
              "prose-table:my-3",
            ]
          : [
              "prose-sm",
              "prose-headings:mb-2 prose-headings:mt-5",
              "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
              "prose-p:my-3 prose-p:leading-7",
              "prose-ul:my-3 prose-ul:space-y-1.5 prose-ul:pl-5",
              "prose-ol:my-3 prose-ol:space-y-1.5 prose-ol:pl-5",
              "prose-li:leading-7",
              "prose-blockquote:my-4 prose-blockquote:pl-4",
              "prose-pre:my-4 prose-pre:px-4 prose-pre:py-3",
              "prose-table:my-4",
            ],
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, node }) => (
            <MarkdownHeadingWithPreview
              as="h1"
              wrapperClassName="mb-3 mt-6 first:mt-0"
              headingClassName="text-xl font-bold"
              section={getSectionByNode(node)}
            >
              {children}
            </MarkdownHeadingWithPreview>
          ),
          h2: ({ children, node }) => (
            <MarkdownHeadingWithPreview
              as="h2"
              wrapperClassName="mb-2 mt-5"
              headingClassName="text-lg font-semibold"
              section={getSectionByNode(node)}
            >
              {children}
            </MarkdownHeadingWithPreview>
          ),
          h3: ({ children, node }) => (
            <MarkdownHeadingWithPreview
              as="h3"
              wrapperClassName="mb-2 mt-4"
              headingClassName="text-base font-semibold"
              section={getSectionByNode(node)}
            >
              {children}
            </MarkdownHeadingWithPreview>
          ),
          p: ({ children }) => (
            <p>{children}</p>
          ),
          ul: ({ children }) => (
            <ul>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol>{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[0.9em] font-medium">
                  {children}
                </code>
              );
            }
            return (
              <code className="block overflow-x-auto rounded-xl bg-muted/55 text-xs font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/40 text-xs shadow-sm">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-1.5 text-left font-medium text-xs">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-1.5 text-xs">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="rounded-r-lg border-l-4 border-primary/25 bg-muted/20 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border/80" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
