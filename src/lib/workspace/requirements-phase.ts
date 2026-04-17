import {
  analyzePhaseProgress,
  getPhaseChatGuide,
} from "@/lib/chat/phase-chat-guidance";
import { getPhaseArtifactSnapshot } from "@/lib/workspace/phase-artifacts";
import type { AgentRole, ProjectDocument } from "@/types";
import type { ChatUIMessage, PersistedChatMessage } from "@/types/chat";

export const REQUIREMENTS_PM_CHECKLIST_ITEM_ID = "requirements-pm-complete";

export interface PhaseChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface RequirementsRoleWorkflowState {
  score: number;
  hasMessages: boolean;
}

export interface RequirementsPhaseWorkflow {
  phase: "requirements";
  mode: "standard";
  currentStep: "pm" | "qa";
  pendingRole: AgentRole;
  pmStepCompleted: boolean;
  canStartQa: boolean;
  canApprove: boolean;
  pm: RequirementsRoleWorkflowState;
  qa: RequirementsRoleWorkflowState;
}

const DEFAULT_REQUIREMENTS_CHECKLIST_ITEM: PhaseChecklistItem = {
  id: REQUIREMENTS_PM_CHECKLIST_ITEM_ID,
  label: "PM 收口",
  done: false,
};

function toChatUIMessage(message: PersistedChatMessage): ChatUIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

export function parsePhaseChecklist(raw: string | null | undefined): PhaseChecklistItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const candidate = item as {
          id?: unknown;
          label?: unknown;
          done?: unknown;
        };

        if (
          typeof candidate.id !== "string" ||
          typeof candidate.label !== "string" ||
          typeof candidate.done !== "boolean"
        ) {
          return null;
        }

        return {
          id: candidate.id,
          label: candidate.label,
          done: candidate.done,
        };
      })
      .filter((item): item is PhaseChecklistItem => item !== null);
  } catch {
    return [];
  }
}

export function getRequirementsPhaseChecklist(
  raw: string | null | undefined
): PhaseChecklistItem[] {
  const parsed = parsePhaseChecklist(raw);
  const existingPmItem = parsed.find(
    (item) => item.id === REQUIREMENTS_PM_CHECKLIST_ITEM_ID
  );
  const rest = parsed.filter((item) => item.id !== REQUIREMENTS_PM_CHECKLIST_ITEM_ID);

  return [
    existingPmItem ?? DEFAULT_REQUIREMENTS_CHECKLIST_ITEM,
    ...rest,
  ];
}

export function serializeRequirementsPmCompleted(
  raw: string | null | undefined
): string {
  const nextChecklist = getRequirementsPhaseChecklist(raw).map((item) =>
    item.id === REQUIREMENTS_PM_CHECKLIST_ITEM_ID
      ? { ...item, done: true }
      : item
  );

  return JSON.stringify(nextChecklist);
}

export function isRequirementsPmStepCompleted(raw: string | null | undefined) {
  return getRequirementsPhaseChecklist(raw).some(
    (item) => item.id === REQUIREMENTS_PM_CHECKLIST_ITEM_ID && item.done
  );
}

export function buildRequirementsPhaseWorkflow(params: {
  checklist: string | null | undefined;
  documents: ProjectDocument[];
  pmMessages: PersistedChatMessage[];
  qaMessages: PersistedChatMessage[];
}): RequirementsPhaseWorkflow {
  const { checklist, documents, pmMessages, qaMessages } = params;
  const hasExistingPrd = documents.some((document) => document.type === "prd");
  const phaseArtifacts = getPhaseArtifactSnapshot("requirements", documents);

  const pmGuide = getPhaseChatGuide("requirements", "pm", { hasExistingPrd });
  const qaGuide = getPhaseChatGuide("requirements", "qa", { hasExistingPrd });

  const pmAnalysis = analyzePhaseProgress(
    "requirements",
    "pm",
    pmGuide,
    pmMessages.map(toChatUIMessage),
    documents
  );
  const qaAnalysis = analyzePhaseProgress(
    "requirements",
    "qa",
    qaGuide,
    qaMessages.map(toChatUIMessage),
    documents
  );

  const pmStepCompleted = isRequirementsPmStepCompleted(checklist);
  const canStartQa = pmAnalysis.readyToStop && phaseArtifacts.hasAllRequiredDocuments;
  const canApprove =
    pmStepCompleted &&
    qaAnalysis.readyToStop &&
    phaseArtifacts.hasAllRequiredDocuments;

  return {
    phase: "requirements",
    mode: "standard",
    currentStep: pmStepCompleted ? "qa" : "pm",
    pendingRole: pmStepCompleted ? "qa" : "pm",
    pmStepCompleted,
    canStartQa,
    canApprove,
    pm: {
      score: pmAnalysis.score,
      hasMessages: pmMessages.length > 0,
    },
    qa: {
      score: qaAnalysis.score,
      hasMessages: qaMessages.length > 0,
    },
  };
}
