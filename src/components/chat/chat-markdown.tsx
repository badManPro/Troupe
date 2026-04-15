"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words text-foreground dark:prose-invert",
        "prose-headings:mb-2 prose-headings:mt-5 prose-headings:font-semibold prose-headings:text-foreground",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        "prose-p:my-3 prose-p:leading-7",
        "prose-ul:my-3 prose-ul:space-y-1.5 prose-ul:pl-5",
        "prose-ol:my-3 prose-ol:space-y-1.5 prose-ol:pl-5",
        "prose-li:leading-7 prose-li:marker:text-primary/70",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-code:rounded-md prose-code:bg-foreground/6 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:font-medium prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:my-4 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-border/70 prose-pre:bg-background/85 prose-pre:px-4 prose-pre:py-3 prose-pre:text-[13px] prose-pre:leading-6 prose-pre:shadow-sm",
        "prose-blockquote:my-4 prose-blockquote:rounded-r-lg prose-blockquote:border-l-4 prose-blockquote:border-primary/25 prose-blockquote:bg-background/45 prose-blockquote:py-1 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-foreground/85",
        "prose-hr:my-5 prose-hr:border-border/70",
        "prose-table:my-4 prose-table:text-sm",
        "prose-th:border prose-th:border-border/70 prose-th:bg-background/70 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium",
        "prose-td:border prose-td:border-border/60 prose-td:px-3 prose-td:py-2",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          pre: ({ children }) => <pre>{children}</pre>,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
