import { analyzeBrainstormProgress } from "@/lib/chat/brainstorm-progress";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OWNER_ROLE,
} from "@/lib/documents/catalog";
import { getPhaseArtifactSnapshot } from "@/lib/workspace/phase-artifacts";
import type {
  AgentRole,
  ConversationSummary,
  DocumentType,
  Phase,
  ProjectDocument,
} from "@/types";
import type { ChatUIMessage } from "@/types/chat";

export interface QuickStartAction {
  id: string;
  label: string;
  prompt: string;
  matchPhrases?: string[];
}

export interface ConversationSuggestion {
  id: string;
  label: string;
  prompt: string;
  role: AgentRole;
  description?: string;
  documentType?: DocumentType;
}

export interface PhaseProgressCriterion {
  id: string;
  label: string;
  state: "missing" | "partial" | "done";
  reason: string;
}

interface ChecklistCriterionDefinition {
  id: string;
  label: string;
  weight: number;
  matchPhrases: string[];
  documentTypes?: DocumentType[];
  doneReason: string;
  partialReason: string;
  missingReason: string;
}

export interface PhaseChatGuideConfig {
  roleLabel: string;
  summary: string;
  goals: string[];
  topics: string[];
  deliverables: string[];
  note: string;
  actions: QuickStartAction[];
  checklist: ChecklistCriterionDefinition[];
  materialDocumentTypes: DocumentType[];
}

export interface PhaseProgressAnalysis {
  kind: "brainstorm" | "checklist";
  score: number;
  readyThreshold: number;
  idealScore: number;
  readiness: "needs_more" | "good_enough" | "ready_to_wrap";
  readyToStop: boolean;
  summary: string;
  nextAction: string;
  estimatedTurns: string;
  criteria: PhaseProgressCriterion[];
  generatedDocuments: DocumentType[];
  requiredDocuments: DocumentType[];
  materialStatusLabel: string;
}

interface PhaseChatGuideOptions {
  hasExistingPrd: boolean;
}

const CHECKLIST_READY_THRESHOLD = 76;
const CHECKLIST_IDEAL_SCORE = 100;
const PARTIAL_SCORE_RATIO = 0.55;

function getMessageText(message: ChatUIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAnySignal(source: string, signals: string[]) {
  if (!source) {
    return false;
  }

  return signals.map(normalizeText).filter(Boolean).some((signal) => source.includes(signal));
}

function hasAssistantReplyAfter(messages: ChatUIMessage[], index: number) {
  return messages
    .slice(index + 1)
    .some(
      (candidate) =>
        candidate.role === "assistant" && normalizeText(getMessageText(candidate)).length > 0
    );
}

function matchesQuickStartAction(messageText: string, action: QuickStartAction) {
  const normalizedMessage = normalizeText(messageText);
  if (!normalizedMessage) return false;

  return [action.label, action.prompt, ...(action.matchPhrases ?? [])]
    .map(normalizeText)
    .filter(Boolean)
    .some((candidate) => normalizedMessage.includes(candidate));
}

function matchesDocumentPrompt(messageText: string, prompt: string) {
  const normalizedMessage = normalizeText(messageText);
  const normalizedPrompt = normalizeText(prompt);

  return Boolean(
    normalizedMessage && normalizedPrompt && normalizedMessage.includes(normalizedPrompt)
  );
}

function buildDesignDocumentMaintenancePrompt(focus: string) {
  return [
    "这轮请继续维护同一份设计阶段正式产出文档，而不是新开一套彼此独立的设计结论。",
    "请基于当前需求、已有设计文档和历史讨论，输出一份完整的 `# UI/UX 设计方案`。",
    `本轮重点：${focus}`,
    "输出时至少保留这几个章节：`## 设计理念`、`## 用户流程图`、`## 页面清单`、`## 设计规范`。",
    "如果某个章节这轮没有新增内容，也请沿用当前已确认结论，整理成完整文档。",
    "除非我明确要求开始出图或调用 Pencil / Pen，否则这一轮只更新文档，不要直接进入最终设计稿绘制。",
  ].join("\n\n");
}

function buildSuggestionPrompt(
  phase: Phase,
  suggestion:
    | { kind: "document"; type: DocumentType; originalPrompt: string }
    | { kind: "action"; id: string; originalPrompt: string }
) {
  if (phase !== "design") {
    return suggestion.originalPrompt;
  }

  if (suggestion.kind === "document") {
    switch (suggestion.type) {
      case "user_flow":
        return [
          buildDesignDocumentMaintenancePrompt(
            "重点完善核心用户流程、关键分支、页面跳转关系和需要重点设计的页面。"
          ),
          `原始需求：${suggestion.originalPrompt}`,
        ].join("\n\n");
      case "wireframe":
        return [
          buildDesignDocumentMaintenancePrompt(
            "重点完善页面清单、信息架构、布局分区、关键组件层级，以及交互与视觉规范。"
          ),
          `原始需求：${suggestion.originalPrompt}`,
        ].join("\n\n");
      default:
        return suggestion.originalPrompt;
    }
  }

  switch (suggestion.id) {
    case "design-user-flow":
      return [
        buildDesignDocumentMaintenancePrompt(
          "重点完善用户流程、关键节点、分支路径和页面跳转关系。"
        ),
        `原始需求：${suggestion.originalPrompt}`,
      ].join("\n\n");
    case "design-page-structure":
      return [
        buildDesignDocumentMaintenancePrompt(
          "重点完善页面清单、导航层级、信息架构和页面承载内容。"
        ),
        `原始需求：${suggestion.originalPrompt}`,
      ].join("\n\n");
    case "design-visual-style":
      return [
        buildDesignDocumentMaintenancePrompt(
          "重点完善视觉风格、组件气质、关键交互动效和设计系统规则。"
        ),
        `原始需求：${suggestion.originalPrompt}`,
      ].join("\n\n");
    default:
      return suggestion.originalPrompt;
  }
}

function buildChecklistMaterialStatusLabel(
  requiredDocuments: DocumentType[],
  generatedDocuments: DocumentType[],
  inheritedDocuments: DocumentType[]
) {
  if (requiredDocuments.length === 0) {
    return "当前轮以对话沉淀为主，暂不强制生成文档。";
  }

  if (generatedDocuments.length === 0 && inheritedDocuments.length === 0) {
    return `关键材料还未落成，建议先产出 ${requiredDocuments
      .map((type) => DOCUMENT_TYPE_LABELS[type])
      .join(" / ")}。`;
  }

  if (generatedDocuments.length === 0 && inheritedDocuments.length > 0) {
    return `当前还沿用上一阶段草稿，建议先在本阶段更新 ${requiredDocuments
      .map((type) => DOCUMENT_TYPE_LABELS[type])
      .join(" / ")}。`;
  }

  if (generatedDocuments.length === requiredDocuments.length) {
    return "关键材料已有草稿，可以继续补细节或准备收口。";
  }

  return `关键材料已完成 ${generatedDocuments.length}/${requiredDocuments.length}，还差 ${requiredDocuments
    .filter((type) => !generatedDocuments.includes(type))
    .map((type) => DOCUMENT_TYPE_LABELS[type])
    .join(" / ")}。`;
}

function buildChecklistProgressSummary(
  criteria: PhaseProgressCriterion[],
  score: number,
  generatedDocuments: DocumentType[],
  requiredDocuments: DocumentType[],
  inheritedDocuments: DocumentType[]
) {
  const doneCount = criteria.filter((criterion) => criterion.state === "done").length;
  const partialCount = criteria.filter((criterion) => criterion.state === "partial").length;
  const missingCount = criteria.length - doneCount - partialCount;

  if (doneCount === 0 && partialCount === 0) {
    return "这个模块还没真正开始，建议先选一个建议动作把关键问题打开。";
  }

  if (missingCount === 0 && partialCount === 0) {
    if (
      requiredDocuments.length > 0 &&
      generatedDocuments.length < requiredDocuments.length
    ) {
      if (inheritedDocuments.length > 0) {
        return "讨论项已经基本收住，但当前阶段还在沿用旧稿，先把本阶段文档更新并确认。";
      }

      return "讨论项已经基本收住，但关键材料还没全部沉淀，先把文档草稿补齐。";
    }

    return "关键问题已经覆盖得比较完整，本轮可以准备收口或切到下一角色。";
  }

  if (score >= CHECKLIST_READY_THRESHOLD) {
    return "主线已经比较清楚，还差少量边角和材料沉淀，可以边补边收口。";
  }

  if (doneCount >= Math.ceil(criteria.length / 2)) {
    return "主体方向已经建立起来了，但还有几项关键内容需要继续追实。";
  }

  return "目前只推进了前半段，先把核心决策讲顺，再进入正式产出。";
}

function buildChecklistNextAction(
  criteria: PhaseProgressCriterion[],
  requiredDocuments: DocumentType[],
  generatedDocuments: DocumentType[]
) {
  const missingDocument = requiredDocuments.find(
    (type) => !generatedDocuments.includes(type)
  );
  if (missingDocument) {
    return `先把「${DOCUMENT_TYPE_LABELS[missingDocument]}」落成当前阶段正式产出，再判断是否可完成。`;
  }

  const missingCriterion = criteria.find((criterion) => criterion.state === "missing");
  if (missingCriterion) {
    return `优先补齐「${missingCriterion.label}」，这是当前最缺的一环。`;
  }

  const partialCriterion = criteria.find((criterion) => criterion.state === "partial");
  if (partialCriterion) {
    return `继续把「${partialCriterion.label}」从方向讨论收束成明确结论。`;
  }

  return "关键项已齐，可以整理正式产出或切换到下一步。";
}

function buildChecklistEstimatedTurns(criteria: PhaseProgressCriterion[]) {
  const remainingCount = criteria.filter((criterion) => criterion.state !== "done").length;

  if (remainingCount === 0) {
    return "已具备收口条件";
  }

  if (remainingCount === 1) {
    return "预计再补 1 轮就能收口";
  }

  if (remainingCount <= 3) {
    return `预计再补 ${remainingCount} 轮左右`;
  }

  return "建议继续拆小问题，分 3 到 5 轮推进";
}

function getChecklistReadiness(
  score: number,
  criteria: PhaseProgressCriterion[],
  requiredDocuments: DocumentType[],
  generatedDocuments: DocumentType[]
) {
  const missingCount = criteria.filter((criterion) => criterion.state === "missing").length;

  if (
    score >= 88 &&
    missingCount === 0 &&
    generatedDocuments.length === requiredDocuments.length
  ) {
    return "ready_to_wrap" as const;
  }

  if (score >= CHECKLIST_READY_THRESHOLD) {
    return "good_enough" as const;
  }

  return "needs_more" as const;
}

function analyzeChecklistProgress(
  phase: Phase,
  guide: PhaseChatGuideConfig,
  messages: ChatUIMessage[],
  documents: ProjectDocument[]
): PhaseProgressAnalysis {
  const normalizedAllMessages = normalizeText(messages.map(getMessageText).join(" "));
  const normalizedAssistantMessages = normalizeText(
    messages
      .filter((message) => message.role === "assistant")
      .map(getMessageText)
      .join(" ")
  );
  const normalizedUserMessages = normalizeText(
    messages
      .filter((message) => message.role === "user")
      .map(getMessageText)
      .join(" ")
  );
  const phaseArtifacts = getPhaseArtifactSnapshot(phase, documents);
  const availableDocumentSet = new Set(documents.map((document) => document.type));
  const requiredDocuments = phaseArtifacts.requiredDocuments.map((document) => document.type);
  const generatedDocuments = phaseArtifacts.requiredDocuments
    .filter((document) => document.state === "current")
    .map((document) => document.type);
  const inheritedDocuments = phaseArtifacts.requiredDocuments
    .filter((document) => document.state === "inherited")
    .map((document) => document.type);

  const criteria = guide.checklist.map((definition) => {
    const hasDocument = (definition.documentTypes ?? []).some((type) =>
      availableDocumentSet.has(type)
    );
    const matchedInAssistant = includesAnySignal(
      normalizedAssistantMessages,
      definition.matchPhrases
    );
    const matchedAnywhere = includesAnySignal(
      normalizedAllMessages,
      definition.matchPhrases
    );
    const matchedInUser = includesAnySignal(normalizedUserMessages, definition.matchPhrases);

    const state: PhaseProgressCriterion["state"] =
      hasDocument || matchedInAssistant
        ? "done"
        : matchedAnywhere || matchedInUser
          ? "partial"
          : "missing";

    return {
      id: definition.id,
      label: definition.label,
      state,
      reason:
        state === "done"
          ? definition.doneReason
          : state === "partial"
            ? definition.partialReason
            : definition.missingReason,
      weight: definition.weight,
    };
  });

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const achievedWeight = criteria.reduce((sum, criterion) => {
    if (criterion.state === "done") {
      return sum + criterion.weight;
    }

    if (criterion.state === "partial") {
      return sum + criterion.weight * PARTIAL_SCORE_RATIO;
    }

    return sum;
  }, 0);
  const score = totalWeight === 0 ? 0 : Math.round((achievedWeight / totalWeight) * 100);
  const flattenedCriteria = criteria.map(({ weight: _weight, ...criterion }) => criterion);
  const readiness = getChecklistReadiness(
    score,
    flattenedCriteria,
    requiredDocuments,
    generatedDocuments
  );
  const readyToStop = readiness === "ready_to_wrap";

  return {
    kind: "checklist",
    score,
    readyThreshold: CHECKLIST_READY_THRESHOLD,
    idealScore: CHECKLIST_IDEAL_SCORE,
    readiness,
    readyToStop,
    summary: buildChecklistProgressSummary(
      flattenedCriteria,
      score,
      generatedDocuments,
      requiredDocuments,
      inheritedDocuments
    ),
    nextAction: buildChecklistNextAction(
      flattenedCriteria,
      requiredDocuments,
      generatedDocuments
    ),
    estimatedTurns: buildChecklistEstimatedTurns(flattenedCriteria),
    criteria: flattenedCriteria,
    generatedDocuments,
    requiredDocuments,
    materialStatusLabel: buildChecklistMaterialStatusLabel(
      requiredDocuments,
      generatedDocuments,
      inheritedDocuments
    ),
  };
}

function getBrainstormGuide(): PhaseChatGuideConfig {
  return {
    roleLabel: "产品经理视角",
    summary:
      "这一轮先别急着写文档，重点是把用户、痛点、核心链路和差异化聊清楚，形成可进入需求定义阶段的共识。",
    goals: [
      "把模糊想法压缩成一句能说清的产品方向。",
      "确认目标用户、核心问题和为什么现在值得做。",
      "先收一版 MVP 方向，避免无限发散。",
    ],
    topics: [
      "第一批用户是谁，他们最想解决什么问题。",
      "用户会在什么场景下触发需求，核心链路怎么走。",
      "和替代方案相比，产品的新意和差异化在哪里。",
    ],
    deliverables: [
      "一句话价值主张。",
      "目标用户、痛点和核心场景的共识。",
      "可进入需求定义阶段的 MVP 雏形。",
    ],
    note: "头脑风暴阶段先把关键问题聊清楚，不急着生成正式 PRD。",
    actions: [
      {
        id: "brainstorm-target-user",
        label: "先梳理目标用户和痛点",
        prompt:
          "我们先不要展开功能列表。请先帮我梳理这个产品的目标用户、核心痛点和最值得优先解决的问题。",
        matchPhrases: ["梳理目标用户和痛点", "目标用户 核心痛点"],
      },
      {
        id: "brainstorm-core-flow",
        label: "先讲顺核心场景和链路",
        prompt:
          "请从产品经理视角带我梳理这个想法的核心使用场景和主流程，看看用户从进入到完成任务会怎么走。",
        matchPhrases: ["核心场景和链路", "核心使用场景和主流程"],
      },
      {
        id: "brainstorm-mvp",
        label: "先收一版 MVP 雏形",
        prompt:
          "请基于当前想法先帮我收一版 MVP 雏形，告诉我首版最值得保留的核心能力和暂时不要做的内容。",
        matchPhrases: ["收一版 mvp 雏形", "首版最值得保留的核心能力"],
      },
    ],
    checklist: [],
    materialDocumentTypes: [],
  };
}

function getPmRequirementsGuide(hasExistingPrd: boolean): PhaseChatGuideConfig {
  if (hasExistingPrd) {
    return {
      roleLabel: "产品经理视角",
      summary:
        "这轮不是重写 PRD，而是把现有草稿收束成评审版，确认哪些结论已稳定、哪些仍需补齐。",
      goals: [
        "校准现有 PRD，确认哪些内容可以冻结。",
        "把目标用户、主流程和 MVP 边界说得更硬。",
        "压清 P0 / P1 / P2，避免后续设计开发反复返工。",
      ],
      topics: [
        "当前 PRD 哪些地方仍然模糊或互相冲突。",
        "核心场景、用户故事和业务流程是否已经闭合。",
        "首版必须做什么，哪些先明确不做。",
      ],
      deliverables: [
        "一版修订后的 PRD / 冻结版需求说明。",
        "补齐后的核心用户故事和主流程。",
        "确认过的 P0 / P1 / P2 与 MVP 范围。",
      ],
      note: "建议先让 PM 把 PRD 主体收住，再切到 QA 补边界和验收标准。",
      actions: [
        {
          id: "review-existing-prd",
          label: "先审一遍现有 PRD",
          prompt:
            "我们已经有一版 PRD 了。请先从需求定义阶段的视角审一遍这份 PRD，告诉我哪些部分已经够用了，哪些地方还需要补充或收紧。",
          matchPhrases: ["先审一遍现有 prd", "审一遍现有 prd", "审查现有 prd"],
        },
        {
          id: "narrow-existing-prd-mvp",
          label: "基于现有 PRD 收敛 MVP",
          prompt:
            "请基于现有 PRD 帮我收敛 MVP，重新梳理 P0 / P1 / P2，并明确哪些内容首版先不做。",
          matchPhrases: ["基于现有 prd 收敛 mvp", "现有 prd 收敛 mvp"],
        },
        {
          id: "fill-existing-prd-flow",
          label: "补齐用户故事和主流程",
          prompt:
            "请基于现有 PRD 检查目标用户、核心场景、用户故事和主流程，指出还不完整的地方并继续追问我。",
          matchPhrases: ["补齐用户故事和主流程", "检查目标用户 核心场景 用户故事和主流程"],
        },
      ],
      checklist: [
        {
          id: "requirements-existing-gap",
          label: "现有 PRD 缺口",
          weight: 1,
          matchPhrases: ["现有 prd", "需求缺口", "还需要补充", "哪些地方还需要收紧"],
          documentTypes: ["prd"],
          doneReason: "现有 PRD 已经被审过或形成修订版。",
          partialReason: "已经开始讨论 PRD 缺口，但还没完全收束。",
          missingReason: "还没系统检查现有 PRD 哪些地方成立、哪些地方需要改。",
        },
        {
          id: "requirements-user-flow",
          label: "用户故事与主流程",
          weight: 1,
          matchPhrases: ["用户故事", "主流程", "核心场景", "目标用户"],
          doneReason: "用户故事和主流程已经有明确描述。",
          partialReason: "主流程方向被提到，但还可以继续压实。",
          missingReason: "还没把目标用户、主流程和关键场景讲顺。",
        },
        {
          id: "requirements-priority",
          label: "优先级与 MVP",
          weight: 1,
          matchPhrases: ["p0", "p1", "p2", "mvp", "首版不做", "优先级"],
          doneReason: "优先级和首版范围已经比较清楚。",
          partialReason: "已经提到 MVP，但边界还没完全收住。",
          missingReason: "还没明确 P0 / P1 / P2 和首版边界。",
        },
      ],
      materialDocumentTypes: ["prd"],
    };
  }

  return {
    roleLabel: "产品经理视角",
    summary:
      "这一轮要把头脑风暴成果转成可评审的需求说明，重点是收束而不是继续发散。",
    goals: [
      "说清楚产品服务谁、解决什么问题。",
      "把核心场景和主流程讲顺。",
      "压出首版边界和优先级，形成 PRD 初稿。",
    ],
    topics: [
      "目标用户、使用场景和触发时机是什么。",
      "用户从进入产品到完成任务，关键链路怎么走。",
      "哪些功能是 P0 必须有，哪些留到 P1 / P2。",
    ],
    deliverables: [
      "一版结构化 PRD 初稿。",
      "核心用户故事和主流程说明。",
      "P0 / P1 / P2 功能清单与 MVP 范围。",
    ],
    note: "先让 PM 把需求主体收出来，再切到 QA 补验收标准和风险点。",
    actions: [
      {
        id: "draft-prd",
        label: "先整理 PRD 初稿",
        prompt:
          "我们已经进入需求定义阶段。请先告诉我这个阶段要完成什么，然后基于现有想法帮我整理一版 PRD 初稿，并指出还缺哪些关键信息需要我补充。",
        matchPhrases: ["先整理 prd 初稿", "整理一版 prd 初稿"],
      },
      {
        id: "narrow-mvp",
        label: "一起收敛 MVP 范围",
        prompt:
          "请带我一起收敛 MVP，帮我把功能拆成 P0 / P1 / P2，并提醒我哪些内容首版应该先不做。",
        matchPhrases: ["一起收敛 mvp 范围", "收敛 mvp 范围"],
      },
      {
        id: "organize-user-story",
        label: "整理用户故事和主流程",
        prompt:
          "请把当前想法整理成目标用户、核心场景、用户故事和主流程，并用需求定义阶段的方式继续追问我。",
        matchPhrases: ["整理用户故事和主流程", "目标用户 核心场景 用户故事和主流程"],
      },
    ],
    checklist: [
      {
        id: "requirements-prd-structure",
        label: "PRD 初稿结构",
        weight: 1,
        matchPhrases: ["prd", "产品需求文档", "需求初稿"],
        documentTypes: ["prd"],
        doneReason: "PRD 初稿已经开始落文档了。",
        partialReason: "已经进入需求结构化，但草稿还没完全成型。",
        missingReason: "还没开始形成结构化 PRD。",
      },
      {
        id: "requirements-user-flow",
        label: "目标用户与主流程",
        weight: 1,
        matchPhrases: ["目标用户", "核心场景", "用户故事", "主流程"],
        doneReason: "目标用户和主流程已经被讲清楚。",
        partialReason: "已经提到核心场景，但还没完全收束。",
        missingReason: "还没把目标用户、核心场景和主流程讲顺。",
      },
      {
        id: "requirements-priority",
        label: "优先级与 MVP",
        weight: 1,
        matchPhrases: ["p0", "p1", "p2", "mvp", "优先级", "首版"],
        doneReason: "优先级和 MVP 范围已经明确。",
        partialReason: "已经开始讨论首版范围，但还没完全压清。",
        missingReason: "还没明确功能优先级和首版边界。",
      },
    ],
    materialDocumentTypes: ["prd"],
  };
}

const QA_REQUIREMENTS_GUIDE: PhaseChatGuideConfig = {
  roleLabel: "QA 评审视角",
  summary:
    "这一轮从可验证、可交付的角度补齐需求缺口，重点不再是价值发散，而是边界、异常和验收标准。",
  goals: [
    "把边界场景和异常流程提前暴露出来。",
    "定义清楚“做完算完成”的验收标准。",
    "识别当前需求里最可能埋雷的歧义和风险点。",
  ],
  topics: [
    "失败路径、空状态、重复操作、权限变化怎么处理。",
    "每个核心功能的验收标准是什么。",
    "当前需求还存在哪些风险、依赖和开放问题。",
  ],
  deliverables: [
    "需求缺口和歧义清单。",
    "关键边界场景与异常流程补充。",
    "验收标准和主要风险点列表。",
  ],
  note: "如果主流程和首版范围还没定住，先让 PM 把 PRD 主体收住，再回来做 QA 评审。",
  actions: [
    {
      id: "qa-review",
      label: "从 QA 角度审查需求",
      prompt:
        "请从 QA 角度审查当前需求，告诉我这个模块还缺哪些边界场景、异常流程和容易引起歧义的点。",
      matchPhrases: ["从 qa 角度审查需求", "qa 角度审查当前需求"],
    },
    {
      id: "qa-acceptance",
      label: "补验收标准",
      prompt:
        "请基于当前需求帮我补一版验收标准，按核心功能拆分，并指出每条标准对应的关注点。",
      matchPhrases: ["补验收标准", "补一版验收标准"],
    },
    {
      id: "qa-risks",
      label: "列风险和开放问题",
      prompt:
        "请帮我列出当前需求阶段最值得现在确认的风险点和开放问题，按优先级从高到低排一下。",
      matchPhrases: ["列风险和开放问题", "风险点和开放问题"],
    },
  ],
  checklist: [
    {
      id: "qa-boundary-cases",
      label: "边界与异常流程",
      weight: 1,
      matchPhrases: ["边界场景", "异常流程", "失败路径", "空状态", "重复操作"],
      doneReason: "边界场景和异常流程已经被系统补齐。",
      partialReason: "已经开始讨论异常情况，但覆盖还不完整。",
      missingReason: "还没系统梳理失败路径和边界情况。",
    },
    {
      id: "qa-acceptance-criteria",
      label: "验收标准",
      weight: 1,
      matchPhrases: ["验收标准", "acceptance", "通过标准", "预期结果"],
      doneReason: "验收标准已经被明确写出来。",
      partialReason: "已经开始补标准，但还没细到可验证。",
      missingReason: "还没形成可执行的验收标准。",
    },
    {
      id: "qa-risks-open-questions",
      label: "风险与开放问题",
      weight: 1,
      matchPhrases: ["风险", "开放问题", "依赖", "歧义", "兼容性", "安全"],
      doneReason: "主要风险和开放问题已经梳理清楚。",
      partialReason: "已经提到少量风险，但还没做优先级排序。",
      missingReason: "还没把当前需求的主要风险点和开放问题列清楚。",
    },
  ],
  materialDocumentTypes: [],
};

const DESIGNER_GUIDE: PhaseChatGuideConfig = {
  roleLabel: "UI/UX 设计视角",
  summary:
    "这一轮要把需求变成可执行的设计方案，重点是用户流程、页面结构、交互节奏和视觉方向。",
  goals: [
    "把核心用户流程完整串起来。",
    "拆出页面信息架构和关键组件。",
    "定义交互与视觉风格，便于后续开发承接。",
  ],
  topics: [
    "用户在每个关键节点会看到什么、做什么。",
    "页面层级、导航、信息优先级怎么组织。",
    "视觉风格、组件基调和交互反馈如何保持一致。",
  ],
  deliverables: [
    "用户流程图 / 流程说明。",
    "页面清单、布局描述和线框说明。",
    "交互细节与视觉规范建议。",
  ],
  note: "先把流程和结构打稳，再展开视觉细节，不要一上来只谈风格。",
  actions: [
    {
      id: "design-user-flow",
      label: "先梳理用户流程",
      prompt:
        "请先根据当前需求帮我梳理完整的用户流程，指出关键节点、分支和需要重点设计的页面。",
      matchPhrases: ["梳理用户流程", "完整的用户流程"],
    },
    {
      id: "design-page-structure",
      label: "先拆页面和信息架构",
      prompt:
        "请从设计阶段的角度先拆页面清单、信息架构和导航层级，告诉我每个页面要承载什么内容。",
      matchPhrases: ["拆页面和信息架构", "页面清单 信息架构"],
    },
    {
      id: "design-visual-style",
      label: "再定视觉和交互风格",
      prompt:
        "请在当前需求基础上给我一版视觉风格和交互方向建议，包括配色、字体、组件气质和关键交互动效。",
      matchPhrases: ["视觉和交互风格", "视觉风格和交互方向建议"],
    },
  ],
  checklist: [
    {
      id: "design-flow",
      label: "用户流程",
      weight: 1,
      matchPhrases: ["用户流程", "流程图", "关键节点", "分支路径"],
      documentTypes: ["user_flow"],
      doneReason: "用户流程已经形成可复用说明或文档。",
      partialReason: "已经开始梳理流程，但关键分支还没完全展开。",
      missingReason: "还没完整描述核心用户流程。",
    },
    {
      id: "design-ia",
      label: "页面结构与信息架构",
      weight: 1,
      matchPhrases: ["页面清单", "信息架构", "导航", "页面结构", "布局描述"],
      documentTypes: ["wireframe"],
      doneReason: "页面结构和信息架构已经比较清楚。",
      partialReason: "已经开始拆页面，但结构还不够稳定。",
      missingReason: "还没把页面层级、内容组织和导航讲清楚。",
    },
    {
      id: "design-style",
      label: "交互与视觉规范",
      weight: 1,
      matchPhrases: ["交互", "视觉风格", "配色", "字体", "组件风格", "动效"],
      doneReason: "交互和视觉方向已经明确。",
      partialReason: "已经有视觉方向，但还没形成稳定规范。",
      missingReason: "还没定义交互节奏和视觉基调。",
    },
  ],
  materialDocumentTypes: ["user_flow", "wireframe"],
};

const ARCHITECT_GUIDE: PhaseChatGuideConfig = {
  roleLabel: "架构设计视角",
  summary:
    "这一轮要把需求和设计翻译成可实现的技术方案，先定技术栈、模块边界、数据模型，再补部署与 API 原则。",
  goals: [
    "做出适合当前项目体量的技术选型。",
    "定义系统模块、数据流和接口边界。",
    "形成可落地的数据库和部署方案。",
  ],
  topics: [
    "前后端、数据库和第三方服务如何搭配。",
    "系统有哪些核心模块，职责如何拆分。",
    "核心数据模型、表结构和环境部署如何设计。",
  ],
  deliverables: [
    "技术选型说明。",
    "系统架构设计文档。",
    "数据库设计 / 表结构草稿。",
  ],
  note: "先把架构主线和数据模型讲顺，再讨论更细的框架偏好或工具细节。",
  actions: [
    {
      id: "architecture-tech-stack",
      label: "先做技术选型",
      prompt:
        "请先根据当前项目规模和目标，帮我做一版技术选型建议，包括前端、后端、数据库、部署和关键第三方服务。",
      matchPhrases: ["技术选型", "前端 后端 数据库 部署"],
    },
    {
      id: "architecture-system-design",
      label: "先梳理系统架构",
      prompt:
        "请从架构阶段的角度帮我梳理系统模块、职责边界和数据流，给我一版整体架构设计思路。",
      matchPhrases: ["梳理系统架构", "系统模块 职责边界 数据流"],
    },
    {
      id: "architecture-data-model",
      label: "再落数据模型",
      prompt:
        "请继续把核心数据模型、主要表结构、关系和索引思路补出来，方便后续开发直接承接。",
      matchPhrases: ["数据模型", "表结构", "关系", "索引"],
    },
  ],
  checklist: [
    {
      id: "architecture-stack",
      label: "技术选型",
      weight: 1,
      matchPhrases: ["技术选型", "框架", "数据库", "部署", "第三方服务"],
      doneReason: "技术选型已经被明确说明。",
      partialReason: "已经开始讨论栈选择，但理由还不够稳定。",
      missingReason: "还没系统说明技术选型和取舍。",
    },
    {
      id: "architecture-system",
      label: "系统架构",
      weight: 1,
      matchPhrases: ["系统架构", "模块划分", "职责", "数据流", "架构图"],
      documentTypes: ["architecture"],
      doneReason: "系统架构主线已经形成方案或文档。",
      partialReason: "已经开始拆模块，但还缺清晰边界。",
      missingReason: "还没把系统模块、边界和数据流讲顺。",
    },
    {
      id: "architecture-data",
      label: "数据模型",
      weight: 1,
      matchPhrases: ["数据模型", "表结构", "er", "索引", "关系"],
      documentTypes: ["db_schema"],
      doneReason: "核心数据模型已经形成草稿。",
      partialReason: "已经提到部分表和字段，但还没成体系。",
      missingReason: "还没整理数据库设计和核心实体关系。",
    },
  ],
  materialDocumentTypes: ["architecture", "db_schema"],
};

const FRONTEND_GUIDE: PhaseChatGuideConfig = {
  roleLabel: "前端实现视角",
  summary:
    "这一轮要把设计和架构翻成前端可执行方案，重点是页面路由、组件拆分、状态流和开发顺序。",
  goals: [
    "规划前端目录结构和页面路由。",
    "拆清共享组件、页面组件和数据边界。",
    "确定状态管理、接口接入和开发优先级。",
  ],
  topics: [
    "页面路由和导航状态怎么组织。",
    "哪些组件应抽共用，哪些只留在页面内部。",
    "前端数据获取、缓存和状态同步怎么做。",
  ],
  deliverables: [
    "前端实现方案 / 目录结构。",
    "页面路由表与组件拆分方案。",
    "状态管理和开发任务清单。",
  ],
  note: "先把结构和边界定清楚，再进入具体组件实现，不要一上来直接写页面。",
  actions: [
    {
      id: "frontend-structure",
      label: "先定项目结构和路由",
      prompt:
        "请先根据当前需求、设计和架构，帮我规划前端项目结构、页面路由和主要模块边界。",
      matchPhrases: ["项目结构和路由", "前端项目结构 页面路由"],
    },
    {
      id: "frontend-components",
      label: "先拆组件和状态边界",
      prompt:
        "请从前端实现角度帮我拆组件树、共享组件边界和状态管理方式，告诉我哪些应该抽公共层。",
      matchPhrases: ["拆组件和状态边界", "组件树 共享组件 状态管理"],
    },
    {
      id: "frontend-plan",
      label: "再排开发任务顺序",
      prompt:
        "请继续帮我把前端开发任务拆分出来，按优先级给出开发顺序、依赖关系和潜在技术难点。",
      matchPhrases: ["开发任务顺序", "开发任务拆分 优先级"],
    },
  ],
  checklist: [
    {
      id: "frontend-routing",
      label: "项目结构与路由",
      weight: 1,
      matchPhrases: ["项目结构", "目录结构", "路由", "页面路由", "模块划分"],
      doneReason: "项目结构和路由方案已经比较明确。",
      partialReason: "已经开始拆结构，但路由或模块边界还不稳定。",
      missingReason: "还没形成清晰的目录结构和路由规划。",
    },
    {
      id: "frontend-components",
      label: "组件拆分",
      weight: 1,
      matchPhrases: ["组件", "props", "共享组件", "页面组件", "组件树"],
      doneReason: "组件层级和抽象边界已经较清楚。",
      partialReason: "已经开始讨论组件，但复用边界还没确定。",
      missingReason: "还没明确组件树和共享抽象方式。",
    },
    {
      id: "frontend-state-plan",
      label: "状态管理与开发计划",
      weight: 1,
      matchPhrases: ["状态管理", "数据获取", "缓存", "开发任务", "优先级"],
      doneReason: "状态流和开发计划已经能直接承接实现。",
      partialReason: "已经提到部分实现策略，但还没整理完整。",
      missingReason: "还没形成状态管理和开发任务拆分方案。",
    },
  ],
  materialDocumentTypes: [],
};

const BACKEND_GUIDE: PhaseChatGuideConfig = {
  roleLabel: "后端实现视角",
  summary:
    "这一轮要把架构方案落到接口、数据和业务逻辑层，重点是 API 设计、数据库细化和异常处理策略。",
  goals: [
    "定义完整的 API 接口和请求响应约定。",
    "细化数据库结构、约束和索引。",
    "拆清核心业务逻辑和开发任务。",
  ],
  topics: [
    "接口列表、鉴权方式和错误码如何组织。",
    "数据库字段、约束、索引和迁移方案怎么定。",
    "关键业务流程、数据校验和异常处理如何设计。",
  ],
  deliverables: [
    "后端实现方案。",
    "API 设计文档。",
    "数据库详细设计与任务清单。",
  ],
  note: "先把接口和数据边界讲稳，再深入代码组织或框架实现细节。",
  actions: [
    {
      id: "backend-api",
      label: "先列 API 设计",
      prompt:
        "请先根据当前架构和需求整理一版后端 API 设计，包括接口列表、请求响应格式、错误码和鉴权策略。",
      matchPhrases: ["api 设计", "接口列表 请求响应 错误码 鉴权"],
    },
    {
      id: "backend-db",
      label: "再细化数据库设计",
      prompt:
        "请继续帮我把数据库详细设计补出来，包括字段类型、约束、索引和关键关系。",
      matchPhrases: ["数据库设计", "字段类型 约束 索引"],
    },
    {
      id: "backend-logic",
      label: "最后拆业务逻辑和任务",
      prompt:
        "请再从后端实现角度帮我梳理核心业务逻辑、异常处理策略和开发任务清单。",
      matchPhrases: ["业务逻辑和任务", "异常处理策略 开发任务"],
    },
  ],
  checklist: [
    {
      id: "backend-api",
      label: "API 设计",
      weight: 1,
      matchPhrases: ["api", "接口", "请求体", "响应体", "错误码", "鉴权"],
      documentTypes: ["api_spec"],
      doneReason: "API 设计已经形成明确方案或文档。",
      partialReason: "已经开始罗列接口，但还不够成体系。",
      missingReason: "还没形成完整的 API 设计。",
    },
    {
      id: "backend-db",
      label: "数据库详细设计",
      weight: 1,
      matchPhrases: ["数据库", "表结构", "字段", "约束", "索引"],
      documentTypes: ["db_schema"],
      doneReason: "数据库详细设计已经有草稿。",
      partialReason: "已经开始细化表结构，但还缺约束或索引策略。",
      missingReason: "还没把数据库设计细化到可开发层面。",
    },
    {
      id: "backend-logic",
      label: "业务逻辑与任务拆分",
      weight: 1,
      matchPhrases: ["业务逻辑", "数据校验", "异常处理", "开发任务"],
      doneReason: "核心业务逻辑和开发任务已经比较清楚。",
      partialReason: "已经提到部分业务逻辑，但任务拆分还不完整。",
      missingReason: "还没整理业务逻辑和后端开发任务清单。",
    },
  ],
  materialDocumentTypes: ["api_spec", "db_schema"],
};

const COORDINATOR_GUIDE: PhaseChatGuideConfig = {
  roleLabel: "项目协调视角",
  summary:
    "这一轮要把前面所有产出串成可执行项目计划，重点是里程碑、任务依赖、风险和推进节奏。",
  goals: [
    "汇总前序阶段产出，识别缺口或冲突。",
    "制定里程碑和任务分解计划。",
    "提前标注时间、资源和技术风险。",
  ],
  topics: [
    "当前有哪些关键产出已经稳定，哪些还存在依赖。",
    "项目里程碑、任务顺序和工时如何安排。",
    "哪些风险最可能影响交付，需要先留缓冲。",
  ],
  deliverables: [
    "项目总览和产出缺口清单。",
    "里程碑计划与任务拆解。",
    "项目计划文档和主要风险清单。",
  ],
  note: "交付准备阶段不是重新讨论需求，而是把既有产出整合成可执行的推进方案。",
  actions: [
    {
      id: "delivery-summary",
      label: "先汇总现有产出",
      prompt:
        "请先从项目协调角度帮我汇总当前已有产出，指出缺口、冲突和进入开发前还要确认的点。",
      matchPhrases: ["汇总现有产出", "缺口 冲突 还要确认的点"],
    },
    {
      id: "delivery-milestones",
      label: "先排里程碑和任务",
      prompt:
        "请继续帮我制定里程碑、任务拆分、依赖关系和预计工时，给我一版可执行的项目计划。",
      matchPhrases: ["里程碑和任务", "任务拆分 依赖关系 预计工时"],
    },
    {
      id: "delivery-risks",
      label: "再补风险和上线准备",
      prompt:
        "请最后补一版关键风险、缓冲策略和上线准备事项，确保这份项目计划能直接落地执行。",
      matchPhrases: ["风险和上线准备", "关键风险 缓冲策略 上线准备"],
    },
  ],
  checklist: [
    {
      id: "delivery-overview",
      label: "产出汇总与缺口",
      weight: 1,
      matchPhrases: ["项目总览", "汇总", "缺口", "冲突", "一致性"],
      doneReason: "现有产出已被汇总并做过缺口检查。",
      partialReason: "已经开始汇总，但缺口/冲突还没完全标清。",
      missingReason: "还没系统梳理已有产出和待补缺口。",
    },
    {
      id: "delivery-plan",
      label: "里程碑与任务拆分",
      weight: 1,
      matchPhrases: ["里程碑", "任务拆分", "wbs", "依赖", "工时"],
      documentTypes: ["project_plan"],
      doneReason: "项目计划和里程碑已经形成草稿。",
      partialReason: "已经开始排期，但任务依赖还不够明确。",
      missingReason: "还没形成可执行的里程碑和任务计划。",
    },
    {
      id: "delivery-risk",
      label: "风险与上线准备",
      weight: 1,
      matchPhrases: ["风险", "应对策略", "上线准备", "缓冲", "checklist"],
      doneReason: "主要风险和上线准备事项已经被补齐。",
      partialReason: "已经提到部分风险，但缺少完整应对策略。",
      missingReason: "还没整理风险清单和上线准备事项。",
    },
  ],
  materialDocumentTypes: ["project_plan"],
};

const QA_DELIVERY_GUIDE: PhaseChatGuideConfig = {
  roleLabel: "QA 交付视角",
  summary:
    "这一轮要把测试策略、核心用例和上线 checklist 补齐，确保项目进入开发或上线前有明确质量守门线。",
  goals: [
    "定义测试范围、类型和优先级。",
    "整理关键流程测试用例和回归范围。",
    "补齐上线前检查项和质量风险。",
  ],
  topics: [
    "哪些模块必须做单元、集成或 E2E 测试。",
    "关键用户路径的核心测试用例怎么写。",
    "上线前必须确认哪些 checklist 和风险点。",
  ],
  deliverables: [
    "测试策略说明。",
    "核心测试用例与回归范围。",
    "上线 checklist / 测试方案文档。",
  ],
  note: "交付阶段的 QA 重点是守质量门，不再回到需求发散或设计讨论。",
  actions: [
    {
      id: "qa-test-strategy",
      label: "先定测试策略",
      prompt:
        "请先从 QA 的角度帮我制定测试策略，说明测试范围、测试类型、优先级和测试环境建议。",
      matchPhrases: ["测试策略", "测试范围 测试类型 优先级"],
    },
    {
      id: "qa-test-cases",
      label: "再列核心测试用例",
      prompt:
        "请继续帮我梳理关键流程的核心测试用例、边界场景和回归范围，按优先级给我一版清单。",
      matchPhrases: ["核心测试用例", "边界场景 回归范围"],
    },
    {
      id: "qa-launch-checklist",
      label: "最后补上线检查项",
      prompt:
        "请最后整理一版上线前 checklist 和主要质量风险，告诉我哪些是必须在上线前完成的。",
      matchPhrases: ["上线检查项", "上线前 checklist 主要质量风险"],
    },
  ],
  checklist: [
    {
      id: "qa-delivery-strategy",
      label: "测试策略",
      weight: 1,
      matchPhrases: ["测试策略", "测试范围", "测试类型", "测试环境"],
      documentTypes: ["test_plan"],
      doneReason: "测试策略已经形成草稿或文档。",
      partialReason: "已经提到测试方向，但范围和优先级还不够清楚。",
      missingReason: "还没定义测试策略和范围。",
    },
    {
      id: "qa-delivery-cases",
      label: "核心测试用例",
      weight: 1,
      matchPhrases: ["测试用例", "前置条件", "预期结果", "回归范围"],
      doneReason: "关键测试用例和回归范围已经比较完整。",
      partialReason: "已经开始列用例，但覆盖还不够系统。",
      missingReason: "还没整理关键流程的测试用例。",
    },
    {
      id: "qa-delivery-checklist",
      label: "上线 Checklist",
      weight: 1,
      matchPhrases: ["上线 checklist", "上线准备", "风险", "必须完成"],
      doneReason: "上线检查项和质量风险已经被补齐。",
      partialReason: "已经提到上线准备，但 checklist 还不完整。",
      missingReason: "还没形成上线前的质量检查清单。",
    },
  ],
  materialDocumentTypes: ["test_plan"],
};

function getStaticGuide(phase: Phase, role: AgentRole) {
  if (phase === "brainstorm" && role === "pm") {
    return getBrainstormGuide();
  }

  if (phase === "design" && role === "designer") {
    return DESIGNER_GUIDE;
  }

  if (phase === "architecture" && role === "architect") {
    return ARCHITECT_GUIDE;
  }

  if (phase === "development" && role === "frontend") {
    return FRONTEND_GUIDE;
  }

  if (phase === "development" && role === "backend") {
    return BACKEND_GUIDE;
  }

  if (phase === "delivery" && role === "coordinator") {
    return COORDINATOR_GUIDE;
  }

  if (phase === "delivery" && role === "qa") {
    return QA_DELIVERY_GUIDE;
  }

  return null;
}

export function getPhaseChatGuide(
  phase: Phase,
  role: AgentRole,
  options: PhaseChatGuideOptions
): PhaseChatGuideConfig {
  if (phase === "requirements") {
    return role === "qa"
      ? QA_REQUIREMENTS_GUIDE
      : getPmRequirementsGuide(options.hasExistingPrd);
  }

  const guide = getStaticGuide(phase, role);
  if (guide) {
    return guide;
  }

  return {
    roleLabel: "当前角色视角",
    summary: "这一轮需要把当前模块的目标、关键问题和应交付材料继续推进下去。",
    goals: ["确认模块目标。", "继续收敛关键决策。", "形成可复用的阶段产出。"],
    topics: ["当前最关键的问题是什么。", "哪些结论还不够稳定。", "下一步该沉淀什么材料。"],
    deliverables: ["一版可继续承接的阶段结论。"],
    note: "先把关键问题收住，再决定是否进入下一阶段。",
    actions: [],
    checklist: [],
    materialDocumentTypes: [],
  };
}

export function analyzePhaseProgress(
  phase: Phase,
  role: AgentRole,
  guide: PhaseChatGuideConfig,
  messages: ChatUIMessage[],
  documents: ProjectDocument[]
): PhaseProgressAnalysis {
  if (phase === "brainstorm" && role === "pm") {
    const analysis = analyzeBrainstormProgress(messages);

    return {
      kind: "brainstorm",
      score: analysis.score,
      readyThreshold: analysis.readyThreshold,
      idealScore: analysis.idealScore,
      readiness: analysis.readiness,
      readyToStop: analysis.readyToStop,
      summary: analysis.summary,
      nextAction: analysis.nextAction,
      estimatedTurns: analysis.estimatedTurns,
      criteria: analysis.criteria,
      generatedDocuments: [],
      requiredDocuments: [],
      materialStatusLabel: "头脑风暴阶段先收敛共识，暂不要求正式文档。",
    };
  }

  return analyzeChecklistProgress(phase, guide, messages, documents);
}

export function getRemainingQuickStartActions(
  messages: ChatUIMessage[],
  actions: QuickStartAction[]
) {
  const completedActions = new Set(
    actions
      .filter((action) =>
        messages.some(
          (message, index) =>
            message.role === "user" &&
            matchesQuickStartAction(getMessageText(message), action) &&
            hasAssistantReplyAfter(messages, index)
        )
      )
      .map((action) => action.id)
  );

  return actions.filter((action) => !completedActions.has(action.id));
}

function getDocumentConversationPrompt(type: DocumentType) {
  switch (type) {
    case "prd":
      return "请基于当前已经确认的需求结论，直接整理一版可评审的 PRD 正式稿。要求输出结构化文档，并明确产品概述、用户故事、P0/P1/P2、业务流程和非功能需求。";
    case "requirements_review":
      return "请基于当前 PRD 和已有 QA 讨论，输出一版结构化 QA 评审结论，覆盖最优先补齐的缺口、边界场景与异常流程、验收标准草案、当前最高风险和开放问题。";
    case "user_flow":
      return "请基于当前 PRD 和已有结论，输出一版完整用户流程文档，讲清主流程、关键分支、决策点和页面跳转关系。";
    case "wireframe":
      return "请基于当前需求和用户流程，输出一版页面结构与线框说明，覆盖页面清单、布局分区、核心组件和关键交互。";
    case "architecture":
      return "请基于当前需求与设计结论，直接输出系统架构设计文档，说明技术选型、模块边界、数据流和部署方案。";
    case "db_schema":
      return "请基于当前架构与业务结论，输出数据库设计文档，包含核心实体、表结构、关系和索引策略。";
    case "api_spec":
      return "请基于当前架构与产品需求，输出 API 设计文档，覆盖接口清单、请求响应结构、错误码和认证策略。";
    case "test_plan":
      return "请基于当前项目产出，输出测试方案和上线前质量清单，包含测试策略、核心用例、边界场景和验收标准。";
    case "project_plan":
      return "请基于当前阶段全部产出，输出项目计划，包含里程碑、任务拆解、风险清单和优先级。";
    default:
      return "请基于当前已经确认的结论，整理一版结构化正式产出。";
  }
}

export function getConversationSuggestions(
  phase: Phase,
  role: AgentRole,
  guide: PhaseChatGuideConfig,
  messages: ChatUIMessage[],
  documents: ProjectDocument[],
  phaseConversations: ConversationSummary[] = []
): ConversationSuggestion[] {
  const suggestions: ConversationSuggestion[] = [];
  const remainingActions = getRemainingQuickStartActions(messages, guide.actions);
  const phaseArtifacts = getPhaseArtifactSnapshot(phase, documents);
  const phaseConversationStarters = phaseConversations
    .map((conversation) => conversation.starterPrompt ?? "")
    .filter((starterPrompt) => starterPrompt.trim().length > 0);

  for (const document of phaseArtifacts.requiredDocuments) {
    if (document.state === "current") {
      continue;
    }

    const documentPrompt = getDocumentConversationPrompt(document.type);
    const alreadyStarted = phaseConversationStarters.some((starterPrompt) =>
      matchesDocumentPrompt(starterPrompt, documentPrompt)
    );
    if (alreadyStarted) {
      continue;
    }

    suggestions.push({
      id: `document-${document.type}`,
      label:
        document.state === "inherited"
          ? `更新${document.label}`
          : `产出${document.label}`,
      prompt: buildSuggestionPrompt(phase, {
        kind: "document",
        type: document.type,
        originalPrompt: documentPrompt,
      }),
      role: document.ownerRole ?? role,
      description: document.hint,
      documentType: document.type,
    });
  }

  for (const action of remainingActions) {
    const alreadyStarted = phaseConversationStarters.some((starterPrompt) =>
      matchesQuickStartAction(starterPrompt, action)
    );
    if (alreadyStarted) {
      continue;
    }

    suggestions.push({
      id: `action-${action.id}`,
      label: action.label,
      prompt: buildSuggestionPrompt(phase, {
        kind: "action",
        id: action.id,
        originalPrompt: action.prompt,
      }),
      role,
    });
  }

  const deduped = new Map<string, ConversationSuggestion>();
  for (const suggestion of suggestions) {
    if (!deduped.has(suggestion.id)) {
      deduped.set(suggestion.id, suggestion);
    }
  }

  return [...deduped.values()].slice(0, 4);
}
