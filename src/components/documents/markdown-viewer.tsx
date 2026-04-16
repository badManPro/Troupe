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
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  const sectionMap = useMemo(
    () => createMarkdownDiagramSectionMap(content),
    [content]
  );

  const getSectionByNode = (node?: {
    position?: { start?: { line?: number } };
  }) => {
    const line = node?.position?.start?.line;
    return typeof line === "number" ? sectionMap.get(line) : undefined;
  };

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
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
            <p className="mb-2 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-muted/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted/50 p-3 rounded-lg overflow-x-auto mb-3 text-xs">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
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
            <blockquote className="border-l-4 border-primary/30 pl-4 my-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
