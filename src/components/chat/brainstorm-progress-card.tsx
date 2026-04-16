"use client";

import { memo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { BrainstormProgressAnalysis } from "@/lib/chat/brainstorm-progress";

interface BrainstormProgressCardProps {
  analysis: BrainstormProgressAnalysis;
}

const READINESS_COPY: Record<
  BrainstormProgressAnalysis["readiness"],
  { label: string; tone: string; icon: typeof Sparkles }
> = {
  needs_more: {
    label: "继续梳理",
    tone:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    icon: CircleDashed,
  },
  good_enough: {
    label: "可以先停",
    tone:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    icon: Target,
  },
  ready_to_wrap: {
    label: "可以收口",
    tone:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: CheckCircle2,
  },
};

export const BrainstormProgressCard = memo(function BrainstormProgressCard({
  analysis,
}: BrainstormProgressCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  const readiness = READINESS_COPY[analysis.readiness];
  const ReadinessIcon = readiness.icon;

  return (
    <div className="border-b bg-card/45 px-4 py-3">
      <div className="rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm">
        {collapsed ? (
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className={cn(
                "hidden h-6 shrink-0 rounded-full px-2.5 text-[11px] sm:inline-flex",
                readiness.tone
              )}
            >
              <ReadinessIcon className="mr-1 h-3.5 w-3.5" />
              {readiness.label}
            </Badge>

            <div className="min-w-0 flex flex-1 items-center gap-2">
              <span className="shrink-0 font-medium text-foreground">
                收敛度 {analysis.score}%
              </span>
              <div className="hidden min-w-24 flex-1 items-center gap-2 md:flex">
                <div className="relative flex-1">
                  <div
                    className="absolute inset-y-0 w-px bg-border/90"
                    style={{ left: `${analysis.readyThreshold}%` }}
                  />
                  <Progress value={analysis.score} className="h-1.5 bg-muted/80" />
                </div>
                <span className="shrink-0 text-muted-foreground">
                  可停 {analysis.readyThreshold}%
                </span>
              </div>
              <span className="truncate text-muted-foreground">
                {analysis.estimatedTurns}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 rounded-xl px-2 text-xs"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label="展开头脑风暴收敛度"
            >
              展开
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-foreground">
                    头脑风暴收敛度
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("h-6 rounded-full px-2.5 text-[11px]", readiness.tone)}
                  >
                    <ReadinessIcon className="mr-1 h-3.5 w-3.5" />
                    {readiness.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {analysis.estimatedTurns}
                  </span>
                </div>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {analysis.summary}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 rounded-xl px-2.5 text-xs"
                onClick={() => setCollapsed((value) => !value)}
                aria-expanded={!collapsed}
                aria-label="收起头脑风暴收敛度"
              >
                收起
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="relative mt-4 pt-5">
              <div
                className="absolute top-0 -translate-x-1/2 text-[10px] text-muted-foreground"
                style={{ left: `${analysis.readyThreshold}%` }}
              >
                可停线
              </div>
              <div
                className="absolute bottom-0 top-5 w-px bg-border/90"
                style={{ left: `${analysis.readyThreshold}%` }}
              />
              <Progress value={analysis.score} className="h-2.5 bg-muted/80" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-left lg:max-w-[18rem]">
              <MetricItem label="当前进度" value={`${analysis.score}%`} />
              <MetricItem label="可停线" value={`${analysis.readyThreshold}%`} />
              <MetricItem label="理想线" value={`${analysis.idealScore}%`} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.criteria.map((criterion) => (
                <Badge
                  key={criterion.id}
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px]",
                    criterion.state === "done" &&
                      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
                    criterion.state === "partial" &&
                      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
                    criterion.state === "missing" &&
                      "border-border/80 bg-muted/40 text-muted-foreground"
                  )}
                  title={criterion.reason}
                >
                  {criterion.label}
                </Badge>
              ))}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-foreground/80">
              {analysis.nextAction}
            </p>
          </>
        )}
      </div>
    </div>
  );
});

function MetricItem({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/35",
        compact ? "px-2.5 py-1.5" : "px-3 py-2"
      )}
    >
      <div className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>
        {label}
      </div>
      <div className={cn("font-semibold text-foreground", compact ? "mt-0.5 text-xs" : "mt-1 text-sm")}>
        {value}
      </div>
    </div>
  );
}
