import type { AgentRole } from "@/types";
import type { ChatUIMessage } from "@/types/chat";

export interface QuickStartAction {
  id: string;
  label: string;
  prompt: string;
  matchPhrases?: string[];
}

export interface RequirementsGuideConfig {
  roleLabel: string;
  summary: string;
  goals: string[];
  topics: string[];
  deliverables: string[];
  note: string;
  actions: QuickStartAction[];
}

function getMessageText(message: ChatUIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ");
}

function normalizeGuideText(value: string) {
  return value
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAssistantReplyAfter(messages: ChatUIMessage[], index: number) {
  return messages
    .slice(index + 1)
    .some(
      (candidate) =>
        candidate.role === "assistant" && normalizeGuideText(getMessageText(candidate)).length > 0
    );
}

function matchesQuickStartAction(messageText: string, action: QuickStartAction) {
  const normalizedMessage = normalizeGuideText(messageText);
  if (!normalizedMessage) return false;

  return [action.label, action.prompt, ...(action.matchPhrases ?? [])]
    .map(normalizeGuideText)
    .filter(Boolean)
    .some((candidate) => normalizedMessage.includes(candidate));
}

function getPmGuide(hasExistingPrd: boolean): RequirementsGuideConfig {
  if (hasExistingPrd) {
    return {
      roleLabel: "产品经理视角",
      summary:
        "把上一阶段已经形成的 PRD 初稿继续收束成评审版，不是重写一份，而是把关键决策补齐、边界确认并冻结下来。",
      goals: [
        "确认现有 PRD 里哪些结论已经稳定，哪些还需要补充或修订。",
        "把核心使用场景和主流程讲顺，消除仍然模糊的产品决策。",
        "压缩首版范围，明确 MVP 边界和功能优先级。",
      ],
      topics: [
        "现有 PRD 哪些部分还不完整，哪些表述需要收紧。",
        "目标用户、触发场景和核心链路是否已经足够明确。",
        "哪些功能是 P0 必须有，哪些可以延后到 P1 / P2。",
        "是否存在依赖、约束、假设和暂不做的范围。",
      ],
      deliverables: [
        "一版修订后的 PRD / 冻结版需求说明。",
        "补齐后的核心用户故事和主流程说明。",
        "确认过的 P0 / P1 / P2 清单与 MVP 范围。",
      ],
      note: "建议先把现有 PRD 收口成评审版，再切到 QA 补验收标准和风险点。",
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
    };
  }

  return {
    roleLabel: "产品经理视角",
    summary:
      "把头脑风暴里的模糊想法收束成一份能评审、能继续设计、能指导开发的需求说明。",
    goals: [
      "说清楚产品服务谁，优先解决什么问题。",
      "把核心使用场景和主流程讲顺，不再停留在想法层。",
      "压缩首版范围，明确 MVP 边界和功能优先级。",
    ],
    topics: [
      "目标用户、使用场景、触发时机分别是什么。",
      "用户从进入产品到完成任务，关键链路怎么走。",
      "哪些功能是 P0 必须有，哪些可以延后到 P1 / P2。",
      "是否存在依赖、约束、假设和暂不做的范围。",
    ],
    deliverables: [
      "一版结构化 PRD 初稿。",
      "核心用户故事和主流程说明。",
      "P0 / P1 / P2 功能清单与 MVP 范围。",
    ],
    note: "建议先和产品经理收敛范围，再切到 QA 补验收标准和风险点。",
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
  };
}

const QA_GUIDE: RequirementsGuideConfig = {
  roleLabel: "QA 评审视角",
  summary:
    "从测试和交付风险的角度检查需求是否完整，提前补齐边界场景、验收标准和模糊点。",
  goals: [
    "找出需求里容易遗漏的异常流程和边界情况。",
    "把“做完算完成”的标准定义清楚，避免后续反复返工。",
    "提前暴露上线和实现风险，降低设计开发阶段的不确定性。",
  ],
  topics: [
    "正常流程之外，失败、空状态、重复操作和权限问题怎么处理。",
    "每个核心功能的验收标准是什么，什么情况下算通过。",
    "是否有性能、数据一致性、兼容性或安全方面的隐含要求。",
    "当前 PRD 里还有哪些表述模糊、容易产生歧义。",
  ],
  deliverables: [
    "需求缺口和歧义清单。",
    "关键边界场景与异常流程补充。",
    "验收标准和主要风险点列表。",
  ],
  note: "如果主流程和功能优先级还没定住，先切回产品经理把 PRD 主体收住再来评审。",
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
};

export function getRequirementsGuide(
  role: AgentRole,
  hasExistingPrd: boolean
): RequirementsGuideConfig {
  return role === "qa" ? QA_GUIDE : getPmGuide(hasExistingPrd);
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
