"use client";

import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, Compass, ShieldAlert, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRequirementsGuide } from "@/lib/chat/requirements-guide";
import type { AgentRole } from "@/types";

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
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm">
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

export function RequirementsGuideCard({
  hasExistingPrd = false,
  role,
}: {
  hasExistingPrd?: boolean;
  role: AgentRole;
}) {
  const guide = getRequirementsGuide(role, hasExistingPrd);

  return (
    <div className="mx-auto mt-6 max-w-5xl rounded-[28px] border border-primary/15 bg-primary/5 p-4 text-left shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full border-primary/20 bg-background/80">
          需求定义阶段
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          {guide.roleLabel}
        </Badge>
      </div>

      <div className="mt-3 max-w-3xl">
        <h3 className="text-base font-semibold text-foreground">
          这个模块不是继续发散，而是把想法收束成可执行需求。
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {guide.summary}
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <GuideBlock title="这个模块要做什么" icon={Target} items={guide.goals} />
        <GuideBlock title="你们需要商讨什么" icon={Compass} items={guide.topics} />
        <GuideBlock
          title="完成后应该产出什么"
          icon={ClipboardCheck}
          items={guide.deliverables}
        />
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-foreground">
        <div className="mt-0.5 rounded-full bg-amber-100 p-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
            建议
          </div>
          <span className="font-medium text-foreground/90 dark:text-foreground">
            {guide.note}
          </span>
        </div>
      </div>
    </div>
  );
}
