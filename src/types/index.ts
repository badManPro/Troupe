export type Phase =
  | "brainstorm"
  | "requirements"
  | "design"
  | "architecture"
  | "development"
  | "delivery";

export type AgentRole =
  | "pm"
  | "designer"
  | "architect"
  | "frontend"
  | "backend"
  | "qa"
  | "coordinator";

export type DocumentType =
  | "prd"
  | "user_flow"
  | "wireframe"
  | "architecture"
  | "api_spec"
  | "db_schema"
  | "test_plan"
  | "project_plan";

export type PhaseGateStatus = "in_progress" | "pending_review" | "approved";

export type MessageRole = "user" | "assistant";

export interface PhaseInfo {
  id: Phase;
  name: string;
  description: string;
  roles: AgentRole[];
  requiredDocuments: DocumentType[];
}

export interface AgentConfig {
  id: AgentRole;
  name: string;
  avatar: string;
  phases: Phase[];
  systemPrompt: string;
  tools: string[];
  outputTemplates: DocumentType[];
  model: string;
}

export const PHASES: PhaseInfo[] = [
  {
    id: "brainstorm",
    name: "头脑风暴",
    description: "描述你的想法，产品经理帮你梳理核心价值",
    roles: ["pm"],
    requiredDocuments: [],
  },
  {
    id: "requirements",
    name: "需求定义",
    description: "将想法转化为结构化的产品需求文档",
    roles: ["pm", "qa"],
    requiredDocuments: ["prd"],
  },
  {
    id: "design",
    name: "设计阶段",
    description: "设计用户流程、交互规范和视觉风格",
    roles: ["designer"],
    requiredDocuments: ["user_flow", "wireframe"],
  },
  {
    id: "architecture",
    name: "架构设计",
    description: "确定技术选型、系统架构和数据模型",
    roles: ["architect"],
    requiredDocuments: ["architecture", "db_schema"],
  },
  {
    id: "development",
    name: "开发规划",
    description: "制定前后端开发实施方案",
    roles: ["frontend", "backend"],
    requiredDocuments: ["api_spec"],
  },
  {
    id: "delivery",
    name: "交付准备",
    description: "汇总产出物，生成项目计划和任务清单",
    roles: ["coordinator", "qa"],
    requiredDocuments: ["test_plan", "project_plan"],
  },
];

export const PHASE_ORDER: Phase[] = [
  "brainstorm",
  "requirements",
  "design",
  "architecture",
  "development",
  "delivery",
];

export function getPhaseIndex(phase: Phase): number {
  return PHASE_ORDER.indexOf(phase);
}

export function getNextPhase(phase: Phase): Phase | null {
  const idx = getPhaseIndex(phase);
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

export function getPrevPhase(phase: Phase): Phase | null {
  const idx = getPhaseIndex(phase);
  return idx > 0 ? PHASE_ORDER[idx - 1] : null;
}
