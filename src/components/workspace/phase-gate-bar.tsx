"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import type { Phase } from "@/types";
import { PHASES, getPhaseIndex, getNextPhase } from "@/types";

interface PhaseGateBarProps {
  currentPhase: Phase;
  projectPhase: Phase;
  onAdvancePhase: () => void;
  onApprovePhase: () => void;
  isApproved: boolean;
}

export function PhaseGateBar({
  currentPhase,
  projectPhase,
  onAdvancePhase,
  onApprovePhase,
  isApproved,
}: PhaseGateBarProps) {
  const nextPhase = getNextPhase(projectPhase);
  const isCurrentProjectPhase = currentPhase === projectPhase;
  const phaseInfo = PHASES.find((p) => p.id === currentPhase);

  if (!isCurrentProjectPhase) return null;

  return (
    <div className="px-4 py-2.5 border-t bg-card/80 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        {isApproved ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {phaseInfo?.name} 已完成
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            确认当前阶段产出物没问题后，点击完成进入下一阶段
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isApproved && (
          <Button size="sm" variant="outline" onClick={onApprovePhase}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            确认完成
          </Button>
        )}
        {isApproved && nextPhase && (
          <Button size="sm" onClick={onAdvancePhase}>
            进入{PHASES.find((p) => p.id === nextPhase)?.name}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
