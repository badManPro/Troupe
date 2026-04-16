"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, Workflow } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MarkdownDiagramSection } from "@/lib/markdown/diagram-preview";
import { MermaidDiagram } from "./mermaid-diagram";

interface DiagramPreviewResponse {
  mermaid: string;
}

interface SectionDiagramPreviewButtonProps {
  section: MarkdownDiagramSection;
}

export function SectionDiagramPreviewButton({
  section,
}: SectionDiagramPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mermaid, setMermaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = async () => {
    if (loading || mermaid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/diagram-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: section.title,
          content: section.content,
        }),
      });

      const data = (await res.json()) as DiagramPreviewResponse & {
        error?: string;
      };

      if (!res.ok || !data.mermaid) {
        throw new Error(data.error || "流程图生成失败");
      }

      setMermaid(data.mermaid);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "流程图生成失败"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !loading && !mermaid && !error) {
      void generatePreview();
    }
  }, [open, loading, mermaid, error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 rounded-full px-2.5 text-[11px] font-medium"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3.5 w-3.5" />
        预览图
      </Button>

      <DialogContent className="max-w-5xl p-0">
        <div className="flex max-h-[80vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-4 w-4 text-primary" />
              {section.title || "流程预览"}
            </DialogTitle>
            <DialogDescription>
              保留原文内容，仅将本章节提炼成更容易扫读的流程图。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-5">
            {loading && (
              <div className="flex min-h-56 items-center justify-center rounded-xl border border-border/70 bg-background/40 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在生成流程图
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && mermaid && <MermaidDiagram chart={mermaid} />}

            {!loading && !error && !mermaid && (
              <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/30 text-sm text-muted-foreground">
                正在准备流程图预览
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
