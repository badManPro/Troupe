"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const diagramId = useId();

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      setSvg("");
      setError(null);

      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
        });

        const { svg: renderedSvg } = await mermaid.render(diagramId, chart);

        if (!cancelled) {
          setSvg(renderedSvg);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error ? renderError.message : "流程图渲染失败"
          );
        }
      }
    }

    void renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId, resolvedTheme]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        <div>{error}</div>
        <pre className="mt-3 overflow-auto rounded-lg bg-background/70 p-3 text-xs text-foreground">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-xl border border-border/70 bg-background/40 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        正在渲染流程图
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-auto rounded-xl border border-border/70 bg-background/60 p-4 shadow-sm [&_svg]:h-auto [&_svg]:max-w-full",
        className
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
