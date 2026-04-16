"use client";

import { memo } from "react";
import { CheckCircle2, CircleDashed, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const readiness = READINESS_COPY[analysis.readiness];
  const ReadinessIcon = readiness.icon;

  return (
    <div className="border-b bg-card/45 px-4 py-3">
      <div className="rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
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

            <div>
              <div className="text-sm font-semibold text-foreground">
                头脑风暴收敛度
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {analysis.summary}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-left lg:min-w-[18rem]">
            <MetricItem label="当前进度" value={`${analysis.score}%`} />
            <MetricItem label="可停线" value={`${analysis.readyThreshold}%`} />
            <MetricItem label="理想线" value={`${analysis.idealScore}%`} />
          </div>
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
      </div>
    </div>
  );
});

function MetricItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/35 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
