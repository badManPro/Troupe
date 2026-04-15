"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownViewer } from "./markdown-viewer";

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function DocumentEditor({
  content,
  onChange,
  readOnly = false,
}: DocumentEditorProps) {
  const [tab, setTab] = useState<string>("preview");

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
      <TabsList className="mx-2 mt-1 w-fit">
        <TabsTrigger value="preview" className="text-xs">
          预览
        </TabsTrigger>
        <TabsTrigger value="edit" className="text-xs">
          编辑
        </TabsTrigger>
      </TabsList>
      <TabsContent value="preview" className="flex-1 overflow-auto px-3 pb-3 mt-0">
        {content ? (
          <MarkdownViewer content={content} className="text-xs" />
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            暂无内容
          </div>
        )}
      </TabsContent>
      <TabsContent value="edit" className="flex-1 overflow-hidden px-2 pb-2 mt-0">
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="h-full font-mono text-xs resize-none border-0 focus-visible:ring-0"
          placeholder="Markdown 内容..."
        />
      </TabsContent>
    </Tabs>
  );
}
