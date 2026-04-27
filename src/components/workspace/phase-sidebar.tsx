"use client";

import { cn } from "@/lib/utils";
import { PHASES, type Phase, getPhaseIndex } from "@/types";
import { tagColors } from "@/lib/tag-colors";
import {
  Lightbulb,
  FileText,
  Palette,
  Boxes,
  Code2,
  Rocket,
  Check,
  Lock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const phaseIcons: Record<Phase, React.ReactNode> = {
  brainstorm: <Lightbulb className="w-4 h-4" />,
  requirements: <FileText className="w-4 h-4" />,
  design: <Palette className="w-4 h-4" />,
  architecture: <Boxes className="w-4 h-4" />,
  development: <Code2 className="w-4 h-4" />,
  delivery: <Rocket className="w-4 h-4" />,
};

interface PhaseSidebarProps {
  currentPhase: Phase;
  projectPhase: Phase;
  approvedPhases: Phase[];
  onPhaseSelect: (phase: Phase) => void;
}

export function PhaseSidebar({
  currentPhase,
  projectPhase,
  approvedPhases,
  onPhaseSelect,
}: PhaseSidebarProps) {
  const projectPhaseIndex = getPhaseIndex(projectPhase);
  const completedCount = approvedPhases.length;

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="surface-glass hidden h-full min-h-0 w-[15rem] shrink-0 flex-col overflow-hidden rounded-l-[1.35rem] border-r-0 lg:flex">
        <div className="border-b border-border/55 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-sidebar-foreground">
                开发流程
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {completedCount}/{PHASES.length} 阶段已完成
              </p>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              Phase
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted/80">
            <div
              className="h-full rounded-full bg-primary shadow-[0_0_18px_hsl(255_92%_76%/0.45)] transition-all"
              style={{ width: `${(completedCount / PHASES.length) * 100}%` }}
            />
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-3">
          {PHASES.map((phase, idx) => {
            const isApproved = approvedPhases.includes(phase.id);
            const isCurrent = currentPhase === phase.id;
            const isProjectPhase = projectPhase === phase.id;
            const isAccessible = idx <= projectPhaseIndex || isApproved;
            const isLocked = !isAccessible;

            return (
              <Tooltip key={phase.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !isLocked && onPhaseSelect(phase.id)}
                    disabled={isLocked}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left text-sm transition-all",
                      isCurrent
                        ? "border-primary/35 bg-primary/12 text-sidebar-accent-foreground shadow-[0_0_0_1px_hsl(255_92%_76%/0.12),0_18px_48px_hsl(255_92%_76%/0.13)]"
                        : isLocked
                          ? "cursor-not-allowed border-border/35 bg-muted/20 text-muted-foreground/55"
                          : "cursor-pointer border-border/55 bg-background/45 text-sidebar-foreground hover:border-primary/20 hover:bg-sidebar-accent/45"
                    )}
                  >
                    {isCurrent && (
                      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary shadow-[0_0_18px_hsl(255_92%_76%/0.65)]" />
                    )}
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs transition-transform group-hover:scale-105",
                        isApproved
                          ? `${tagColors.greenSurface} shadow-[0_12px_28px_hsl(158_74%_67%/0.14)]`
                          : isProjectPhase
                            ? "bg-primary/15 text-primary shadow-[0_12px_30px_hsl(255_92%_76%/0.18)]"
                            : isLocked
                              ? "bg-muted text-muted-foreground/50"
                              : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isApproved ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : isLocked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        phaseIcons[phase.id]
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {idx + 1}
                        </span>
                        <span className="truncate font-medium">{phase.name}</span>
                      </div>
                      {isProjectPhase && !isApproved && (
                        <div className="mt-1 text-[11px] font-normal text-primary">
                          当前阶段
                        </div>
                      )}
                      {isApproved && (
                        <div className="mt-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-300">
                          已完成
                        </div>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{phase.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
