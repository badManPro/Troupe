import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OWNER_ROLE,
  PHASE_DOCUMENT_TYPES,
} from "@/lib/documents/catalog";
import type {
  AgentRole,
  DocumentType,
  Phase,
} from "@/types";

export type PhaseDocumentState = "missing" | "inherited" | "current";

export interface PhaseDocumentStatus {
  type: DocumentType;
  label: string;
  ownerRole: AgentRole | null;
  state: PhaseDocumentState;
  document: ProjectDocumentLike | null;
  hint: string;
}

export interface PhaseArtifactSnapshot {
  phase: Phase;
  requiredDocuments: PhaseDocumentStatus[];
  totalRequiredDocuments: number;
  currentDocumentCount: number;
  inheritedDocumentCount: number;
  missingDocumentCount: number;
  hasAllRequiredDocuments: boolean;
  missingDocumentTypes: DocumentType[];
}

export interface ProjectDocumentLike {
  id: string;
  type: DocumentType;
  title: string;
  content: string;
  version: number;
  phase: Phase;
  updatedAt: string | Date;
}

function toTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getLatestDocumentOfType<T extends ProjectDocumentLike>(
  documents: T[],
  type: DocumentType
) {
  return documents
    .filter((document) => document.type === type)
    .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt))[0] ?? null;
}

export function getPhaseArtifactSnapshot(
  phase: Phase,
  documents: ProjectDocumentLike[]
): PhaseArtifactSnapshot {
  const requiredDocuments = (PHASE_DOCUMENT_TYPES[phase] ?? []).map((type) => {
    const document = getLatestDocumentOfType(documents, type);
    const state: PhaseDocumentState = !document
      ? "missing"
      : document.phase === phase
        ? "current"
        : "inherited";

    const hint =
      state === "current"
        ? "当前阶段已确认"
        : state === "inherited"
          ? `沿用 ${document?.phase ?? "上一阶段"} 草稿`
          : "本阶段待产出";

    return {
      type,
      label: DOCUMENT_TYPE_LABELS[type],
      ownerRole: DOCUMENT_TYPE_OWNER_ROLE[type] ?? null,
      state,
      document,
      hint,
    };
  });

  const currentDocumentCount = requiredDocuments.filter(
    (document) => document.state === "current"
  ).length;
  const inheritedDocumentCount = requiredDocuments.filter(
    (document) => document.state === "inherited"
  ).length;
  const missingDocumentTypes = requiredDocuments
    .filter((document) => document.state !== "current")
    .map((document) => document.type);

  return {
    phase,
    requiredDocuments,
    totalRequiredDocuments: requiredDocuments.length,
    currentDocumentCount,
    inheritedDocumentCount,
    missingDocumentCount: requiredDocuments.length - currentDocumentCount - inheritedDocumentCount,
    hasAllRequiredDocuments:
      requiredDocuments.length === 0 || currentDocumentCount === requiredDocuments.length,
    missingDocumentTypes,
  };
}

export function getPhaseRelevantDocuments<T extends ProjectDocumentLike>(
  phase: Phase,
  documents: T[]
) {
  const requiredDocumentTypes = new Set(PHASE_DOCUMENT_TYPES[phase] ?? []);

  return documents
    .filter(
      (document) =>
        document.phase === phase || requiredDocumentTypes.has(document.type)
    )
    .sort((left, right) => {
      const leftPriority =
        left.phase === phase ? 0 : requiredDocumentTypes.has(left.type) ? 1 : 2;
      const rightPriority =
        right.phase === phase ? 0 : requiredDocumentTypes.has(right.type) ? 1 : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
    });
}
