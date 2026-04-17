"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Compass,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import type {
  PhaseChatGuideConfig,
  PhaseProgressAnalysis,
} from "@/lib/chat/phase-chat-guidance";
import { PHASES, type Phase } from "@/types";

const READINESS_COPY: Record<
  PhaseProgressAnalysis["readiness"],
  { label: string; tone: string; icon: typeof Sparkles }
> = {
  needs_more: {
    label: "继续推进",
    tone:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    icon: Sparkles,
  },
  good_enough: {
    label: "接近收口",
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

function GuideBlock({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/75 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 shadow-sm">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

interface PhaseContextCardProps {
  phase: Phase;
  guide: PhaseChatGuideConfig;
  progress: PhaseProgressAnalysis;
  hasMessages: boolean;
  storageKey: string;
}

export function PhaseContextCard({
  phase,
  guide,
  progress,
  hasMessages,
  storageKey,
}: PhaseContextCardProps) {
  const [collapsed, setCollapsed] = useState(hasMessages);
  const readiness = READINESS_COPY[progress.readiness];
  const ReadinessIcon = readiness.icon;
  const phaseName = useMemo(
    () => PHASES.find((item) => item.id === phase)?.name ?? phase,
    [phase]
  );
  const doneCount = progress.criteria.filter((criterion) => criterion.state === "done").length;
  const materialLabel =
    progress.requiredDocuments.length > 0
      ? `${progress.generatedDocuments.length}/${progress.requiredDocuments.length} 份文档已落地`
      : "以对话沉淀为主";

  useEffect(() => {
    setCollapsed(hasMessages);
  }, [hasMessages, storageKey]);

  return (
    <div className="border-b bg-card/45 px-4 py-3">
      <div className="rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm">
        {collapsed ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="rounded-full">
              {phaseName}
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              {guide.roleLabel}
            </Badge>
            <Badge
              variant="outline"
              className={cn("rounded-full text-[11px]", readiness.tone)}
            >
              <ReadinessIcon className="mr-1 h-3.5 w-3.5" />
              {readiness.label}
            </Badge>

            <div className="min-w-0 flex flex-1 items-center gap-2">
              <span className="shrink-0 font-medium text-foreground">
                进度 {progress.score}%
              </span>
              <span className="truncate text-muted-foreground">{progress.nextAction}</span>
            </div>

            <span className="shrink-0 text-muted-foreground">{materialLabel}</span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-xl px-2 text-xs"
              onClick={() => setCollapsed(false)}
              aria-expanded={false}
              aria-label="展开当前轮导航"
            >
              展开
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {phaseName}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {guide.roleLabel}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("rounded-full text-[11px]", readiness.tone)}
                  >
                    <ReadinessIcon className="mr-1 h-3.5 w-3.5" />
                    {readiness.label}
                  </Badge>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">
                  {guide.summary}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl px-2.5 text-xs"
                onClick={() => setCollapsed(true)}
                aria-expanded
                aria-label="收起当前轮导航"
              >
                收起
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <MetricItem label="当前进度" value={`${progress.score}%`} />
              <MetricItem label="已推进项" value={`${doneCount}/${progress.criteria.length}`} />
              <MetricItem label="关键材料" value={materialLabel} />
              <MetricItem label="建议节奏" value={progress.estimatedTurns} />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <GuideBlock title="这个模块要做什么" icon={Target} items={guide.goals} />
              <GuideBlock title="这一轮要讨论什么" icon={Compass} items={guide.topics} />
              <GuideBlock
                title="当前应沉淀什么材料"
                icon={ClipboardCheck}
                items={guide.deliverables}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-foreground">当前轮进度</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {progress.summary}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  可停线 {progress.readyThreshold}% / 理想线 {progress.idealScore}%
                </div>
              </div>

              <div className="relative mt-4 pt-5">
                <div
                  className="absolute top-0 -translate-x-1/2 text-[10px] text-muted-foreground"
                  style={{ left: `${progress.readyThreshold}%` }}
                >
                  可停线
                </div>
                <div
                  className="absolute bottom-0 top-5 w-px bg-border/90"
                  style={{ left: `${progress.readyThreshold}%` }}
                />
                <Progress value={progress.score} className="h-2.5 bg-muted/80" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {progress.criteria.map((criterion) => (
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
                        "border-border/80 bg-background/70 text-muted-foreground"
                    )}
                    title={criterion.reason}
                  >
                    {criterion.label}
                  </Badge>
                ))}
              </div>

              {progress.requiredDocuments.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    文档落地情况
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {progress.requiredDocuments.map((type) => {
                      const ready = progress.generatedDocuments.includes(type);

                      return (
                        <Badge
                          key={type}
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px]",
                            ready
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "border-border/80 bg-background/70 text-muted-foreground"
                          )}
                        >
                          {ready ? "已产出" : "待产出"} {DOCUMENT_TYPE_LABELS[type]}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs leading-relaxed text-foreground/80">
                {progress.nextAction}
              </p>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-foreground">
              <div className="mt-0.5 rounded-full bg-amber-100 p-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                  提醒
                </div>
                <span className="font-medium text-foreground/90 dark:text-foreground">
                  {guide.note}
                </span>
                <p className="mt-1 text-xs text-foreground/70">{progress.materialStatusLabel}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
