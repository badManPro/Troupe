import type { Phase } from "@/types";
import type { ChatUIMessage } from "@/types/chat";

export type BrainstormCriterionState = "missing" | "partial" | "done";
export type BrainstormReadiness =
  | "needs_more"
  | "good_enough"
  | "ready_to_wrap";

export interface BrainstormCriterion {
  id: string;
  label: string;
  state: BrainstormCriterionState;
  reason: string;
}

export interface BrainstormProgressAnalysis {
  score: number;
  readyThreshold: number;
  idealScore: number;
  readiness: BrainstormReadiness;
  readyToStop: boolean;
  summary: string;
  nextAction: string;
  estimatedTurns: string;
  criteria: BrainstormCriterion[];
}

interface BrainstormCriterionDefinition {
  id: string;
  label: string;
  weight: number;
  userSignals: RegExp[];
  discussionSignals: RegExp[];
  strongSignals?: RegExp[];
  doneReason: string;
  partialReason: string;
  missingReason: string;
}

const READY_THRESHOLD = 72;
const IDEAL_SCORE = 100;
const PARTIAL_WEIGHT_RATIO = 0.55;

const BRAINSTORM_CRITERIA: BrainstormCriterionDefinition[] = [
  {
    id: "target-user",
    label: "目标用户",
    weight: 14,
    userSignals: [
      /目标用户/,
      /用户画像/,
      /成年人/,
      /学生/,
      /职场/,
      /初学者/,
      /新手/,
    ],
    discussionSignals: [
      /目标用户/,
      /用户画像/,
      /第一批用户/,
      /适合.*人群/,
      /自学技能的成年人/,
      /谁会用/,
    ],
    strongSignals: [/目标用户[:：]/, /自学技能的成年人/, /用户画像/],
    doneReason: "第一批用户已经比较明确。",
    partialReason: "用户范围被提到，但还可以再收窄。",
    missingReason: "还没说清楚第一批用户是谁。",
  },
  {
    id: "pain-point",
    label: "痛点问题",
    weight: 14,
    userSignals: [
      /痛点/,
      /困扰/,
      /内耗/,
      /拖延/,
      /决策成本/,
      /坚持不下去/,
      /不知道怎么开始/,
      /难以坚持/,
    ],
    discussionSignals: [
      /痛点/,
      /解决什么问题/,
      /降低内耗/,
      /更低决策成本/,
      /拖延/,
      /不知道学什么/,
      /难以坚持/,
    ],
    strongSignals: [/核心痛点/, /解决什么问题/, /降低内耗/, /更低决策成本/],
    doneReason: "要解决的核心问题已经比较清楚。",
    partialReason: "问题方向有了，但还没完全收束。",
    missingReason: "还缺少为什么用户现在会需要它的解释。",
  },
  {
    id: "core-flow",
    label: "核心链路",
    weight: 16,
    userSignals: [
      /流程/,
      /首页/,
      /页面/,
      /模型配置/,
      /用户画像/,
      /路线/,
      /今日课程/,
      /dashboard/i,
    ],
    discussionSignals: [
      /核心页面流转/,
      /业务流程/,
      /核心链路/,
      /模型配置/,
      /用户画像/,
      /长期路线/,
      /今日课程/,
      /dashboard/i,
    ],
    strongSignals: [
      /核心页面流转/,
      /业务流程/,
      /模型配置[\s\S]*用户画像[\s\S]*长期路线/,
    ],
    doneReason: "主要使用流程已经能讲顺。",
    partialReason: "关键页面被提到了，但链路还不够完整。",
    missingReason: "用户从开始到完成任务的路径还不够清晰。",
  },
  {
    id: "value-proposition",
    label: "价值主张",
    weight: 12,
    userSignals: [
      /一句话/,
      /核心价值/,
      /价值主张/,
      /低决策成本/,
      /更有目标感/,
      /陪伴/,
      /趣味性/,
    ],
    discussionSignals: [
      /一句话/,
      /核心价值/,
      /价值主张/,
      /帮助用户/,
      /陪伴感/,
      /低决策成本/,
      /更有目标感/,
    ],
    strongSignals: [/一句话描述/, /核心价值/, /价值主张/],
    doneReason: "为什么值得做，已经可以一句话说清。",
    partialReason: "价值方向有了，但表达还不够稳定。",
    missingReason: "还缺少一句能概括产品价值的话。",
  },
  {
    id: "mvp-scope",
    label: "MVP 范围",
    weight: 16,
    userSignals: [
      /mvp/i,
      /首版/,
      /第一版/,
      /v1/i,
      /p0/i,
      /必须有/,
      /不能跳过/,
    ],
    discussionSignals: [
      /mvp/i,
      /首版/,
      /第一版/,
      /v1/i,
      /p0/i,
      /必须有/,
      /优先级/,
      /最多\s*3\s*个进行中目标/,
      /不能跳过/,
    ],
    strongSignals: [/P0/, /MVP/, /首版/, /第一版建议/],
    doneReason: "首版边界已经开始收口。",
    partialReason: "提到了优先级，但还有继续压缩的空间。",
    missingReason: "还没说明哪些是首版必须做、哪些以后再做。",
  },
  {
    id: "differentiation",
    label: "差异化",
    weight: 12,
    userSignals: [/竞品/, /差异化/, /桌宠/, /mbti/i, /互动性/, /可玩性/],
    discussionSignals: [
      /竞品/,
      /差异化/,
      /桌宠/,
      /MBTI/,
      /互动性/,
      /可玩性/,
      /不是.*学习计划/,
    ],
    strongSignals: [/差异化/, /竞品/, /桌宠/, /MBTI/],
    doneReason: "产品区别于普通方案的点已经比较鲜明。",
    partialReason: "有亮点，但还没完全讲成清晰对比。",
    missingReason: "还缺少与替代方案的区别说明。",
  },
  {
    id: "structured-output",
    label: "结构化沉淀",
    weight: 16,
    userSignals: [/prd/i, /低保真/, /页面说明/, /功能清单/, /业务流程/],
    discussionSignals: [
      /#\s*产品需求文档/,
      /\bPRD\b/i,
      /低保真页面说明/,
      /功能清单/,
      /业务流程/,
      /核心页面流转/,
      /信息架构/,
    ],
    strongSignals: [/#\s*产品需求文档/, /低保真页面说明/, /核心页面流转/],
    doneReason: "已经开始沉淀成可复用的结构化内容。",
    partialReason: "有结构化苗头，但还没形成稳定产物。",
    missingReason: "还停留在零散想法，尚未形成文档框架。",
  },
];

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMessageText(message: ChatUIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ");
}

function getConversationSlices(messages: ChatUIMessage[]) {
  const allMessages = messages
    .map(getMessageText)
    .map(stripMarkdown)
    .filter(Boolean);

  const userMessages = messages
    .filter((message) => message.role === "user")
    .map(getMessageText)
    .map(stripMarkdown)
    .filter(Boolean);

  const assistantMessages = messages
    .filter((message) => message.role === "assistant")
    .map(getMessageText)
    .map(stripMarkdown)
    .filter(Boolean);

  return {
    allText: allMessages.join("\n"),
    userText: userMessages.join("\n"),
    assistantText: assistantMessages.join("\n"),
  };
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => (pattern.test(text) ? count + 1 : count), 0);
}

function resolveCriterionState(
  criterion: BrainstormCriterionDefinition,
  userText: string,
  discussionText: string
) {
  const userHits = countMatches(userText, criterion.userSignals);
  const discussionHits = countMatches(discussionText, criterion.discussionSignals);
  const strongHit = countMatches(discussionText, criterion.strongSignals ?? []) > 0;

  if (strongHit || discussionHits >= 2 || (userHits > 0 && discussionHits > 0)) {
    return "done" as const;
  }

  if (userHits > 0 || discussionHits > 0) {
    return "partial" as const;
  }

  return "missing" as const;
}

function buildSummary(
  readiness: BrainstormReadiness,
  score: number,
  coveredCount: number,
  totalCount: number
) {
  if (readiness === "ready_to_wrap") {
    return `已经覆盖 ${coveredCount}/${totalCount} 个关键问题，当前脑暴足够收口，可以结束这一轮并进入下一阶段。`;
  }

  if (readiness === "good_enough") {
    return `已经覆盖 ${coveredCount}/${totalCount} 个关键问题，当前收敛度 ${score}% ，现在可以先停；如果想更稳，再补 1 到 2 项即可。`;
  }

  return `当前只覆盖了 ${coveredCount}/${totalCount} 个关键问题，继续补齐核心信息后，用户才更容易判断“现在可以停”。`;
}

function buildNextAction(
  readiness: BrainstormReadiness,
  criteria: BrainstormCriterion[]
) {
  const missing = criteria
    .filter((criterion) => criterion.state === "missing")
    .map((criterion) => criterion.label);
  const partial = criteria
    .filter((criterion) => criterion.state === "partial")
    .map((criterion) => criterion.label);

  if (readiness === "ready_to_wrap") {
    return "建议直接确认当前结论，生成 PRD 或推进到需求定义阶段。";
  }

  if (readiness === "good_enough") {
    const followUps = [...missing, ...partial].slice(0, 2);
    return followUps.length > 0
      ? `现在已经可以先停；如果还想提高完成度，优先补 ${followUps.join("、")}。`
      : "现在已经可以先停，继续补充只是在打磨细节。";
  }

  const focus = [...missing, ...partial].slice(0, 3);
  return focus.length > 0
    ? `建议再聊 1 到 2 轮，优先补齐 ${focus.join("、")}。`
    : "建议再聊 1 到 2 轮，把关键问题补齐。";
}

function estimateTurns(criteria: BrainstormCriterion[], readyToStop: boolean) {
  if (readyToStop) {
    return "现在可以停";
  }

  const unfinished = criteria.filter((criterion) => criterion.state !== "done").length;
  if (unfinished <= 2) return "预计再聊 1 轮";
  if (unfinished <= 4) return "预计再聊 2 轮";
  return "预计再聊 3 轮";
}

export function shouldShowBrainstormProgress(
  phase: Phase,
  role: string | undefined
) {
  return phase === "brainstorm" && role === "pm";
}

export function analyzeBrainstormProgress(
  messages: ChatUIMessage[]
): BrainstormProgressAnalysis {
  const { allText, userText, assistantText } = getConversationSlices(messages);
  const discussionText = [allText, assistantText].filter(Boolean).join("\n");

  const criteria = BRAINSTORM_CRITERIA.map((criterion) => {
    const state = resolveCriterionState(criterion, userText, discussionText);
    return {
      id: criterion.id,
      label: criterion.label,
      state,
      reason:
        state === "done"
          ? criterion.doneReason
          : state === "partial"
            ? criterion.partialReason
            : criterion.missingReason,
      weight: criterion.weight,
    };
  });

  const rawScore = criteria.reduce((total, criterion) => {
    if (criterion.state === "done") return total + criterion.weight;
    if (criterion.state === "partial") {
      return total + criterion.weight * PARTIAL_WEIGHT_RATIO;
    }
    return total;
  }, 0);

  const score = Math.max(0, Math.min(IDEAL_SCORE, Math.round(rawScore)));
  const coveredCount = criteria.filter((criterion) => criterion.state === "done").length;
  const readyToWrap =
    score >= 90 ||
    criteria.every((criterion) => criterion.state !== "missing");
  const readyToStop = score >= READY_THRESHOLD;
  const readiness: BrainstormReadiness = readyToWrap
    ? "ready_to_wrap"
    : readyToStop
      ? "good_enough"
      : "needs_more";

  return {
    score,
    readyThreshold: READY_THRESHOLD,
    idealScore: IDEAL_SCORE,
    readiness,
    readyToStop,
    summary: buildSummary(readiness, score, coveredCount, criteria.length),
    nextAction: buildNextAction(readiness, criteria),
    estimatedTurns: estimateTurns(criteria, readyToStop),
    criteria: criteria.map(({ weight: _weight, ...criterion }) => criterion),
  };
}
