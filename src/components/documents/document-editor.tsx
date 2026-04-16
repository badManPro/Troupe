"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownViewer } from "./markdown-viewer";
import { cn } from "@/lib/utils";

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  tab?: string;
  defaultTab?: string;
  onTabChange?: (tab: string) => void;
  density?: "default" | "compact";
  className?: string;
  previewClassName?: string;
  textareaClassName?: string;
  tabsListClassName?: string;
}

export function DocumentEditor({
  content,
  onChange,
  readOnly = false,
  tab,
  defaultTab = "preview",
  onTabChange,
  density = "default",
  className,
  previewClassName,
  textareaClassName,
  tabsListClassName,
}: DocumentEditorProps) {
  const [internalTab, setInternalTab] = useState<string>(defaultTab);

  useEffect(() => {
    if (tab === undefined) {
      setInternalTab(defaultTab);
    }
  }, [defaultTab, tab]);

  const currentTab = tab ?? internalTab;

  const handleTabChange = (nextTab: string) => {
    if (tab === undefined) {
      setInternalTab(nextTab);
    }
    onTabChange?.(nextTab);
  };

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleTabChange}
      className={cn("flex h-full flex-col", className)}
    >
      <TabsList
        className={cn(
          "mx-2 mt-1 w-fit",
          density === "compact" && "h-8 rounded-xl p-0.5",
          tabsListClassName
        )}
      >
        <TabsTrigger value="preview" className="text-xs">
          预览
        </TabsTrigger>
        <TabsTrigger value="edit" className="text-xs">
          编辑
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="preview"
        className={cn(
          "mt-0 flex-1 overflow-auto px-3 pb-3",
          density === "compact" && "px-2.5 pb-2.5",
          previewClassName
        )}
      >
        {content ? (
          <MarkdownViewer
            content={content}
            density={density}
            className={density === "compact" ? "text-[13px]" : undefined}
          />
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            暂无内容
          </div>
        )}
      </TabsContent>
      <TabsContent
        value="edit"
        className={cn(
          "mt-0 flex-1 overflow-hidden px-2 pb-2",
          density === "compact" && "px-1.5 pb-1.5",
          textareaClassName
        )}
      >
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={cn(
            "h-full resize-none border-0 font-mono text-xs focus-visible:ring-0",
            density === "compact" && "rounded-xl bg-background/80 p-3",
            textareaClassName
          )}
          placeholder="Markdown 内容..."
        />
      </TabsContent>
    </Tabs>
  );
}
