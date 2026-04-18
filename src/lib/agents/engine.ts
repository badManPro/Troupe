import type { Phase, PhaseGateStatus } from "@/types";
import { PHASE_ORDER, getPhaseIndex, PHASES } from "@/types";

export interface PhaseGateCheck {
  phase: Phase;
  status: PhaseGateStatus;
  checklist: { label: string; done: boolean }[];
}

export function canAdvancePhase(gate: PhaseGateCheck): boolean {
  return gate.checklist.every((item) => item.done);
}

export function getPhaseProgress(gates: PhaseGateCheck[]): number {
  const approved = gates.filter((g) => g.status === "approved").length;
  return Math.round((approved / PHASE_ORDER.length) * 100);
}

export function getCurrentPhaseInfo(phase: Phase) {
  return PHASES.find((p) => p.id === phase);
}

export function isPhaseAccessible(
  currentPhase: Phase,
  targetPhase: Phase,
  gates: PhaseGateCheck[]
): boolean {
  const targetIndex = getPhaseIndex(targetPhase);
  const currentIndex = getPhaseIndex(currentPhase);

  if (targetIndex <= currentIndex) return true;

  for (let i = currentIndex; i < targetIndex; i++) {
    const gate = gates.find((g) => g.phase === PHASE_ORDER[i]);
    if (!gate || gate.status !== "approved") return false;
  }
  return true;
}
