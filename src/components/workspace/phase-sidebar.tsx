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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full min-h-0 w-56 shrink-0 flex-col overflow-hidden border-r bg-sidebar">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-sidebar-foreground">
            开发流程
          </h3>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
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
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                      isCurrent
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : isLocked
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs",
                        isApproved
                          ? tagColors.greenSurface
                          : isProjectPhase
                            ? "bg-primary/15 text-primary"
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
                      <div className="truncate">{phase.name}</div>
                      {isProjectPhase && !isApproved && (
                        <div className="text-[11px] text-primary font-normal">
                          当前阶段
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
      </div>
    </TooltipProvider>
  );
}
