import type { AgentRole, DocumentType, Phase } from "@/types";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  prd: "产品需求文档",
  requirements_review: "QA 评审结论",
  user_flow: "用户流程",
  design_spec: "设计方案",
  wireframe: "线框图描述",
  design_mockup: "设计稿",
  architecture: "架构设计",
  api_spec: "API 设计",
  db_schema: "数据库设计",
  test_plan: "测试方案",
  project_plan: "项目计划",
};

export const PHASE_DOCUMENT_TYPES: Record<Phase, DocumentType[]> = {
  brainstorm: [],
  requirements: ["prd"],
  design: ["user_flow", "wireframe"],
  architecture: ["architecture", "db_schema"],
  development: ["api_spec"],
  delivery: ["test_plan", "project_plan"],
};

export const DOCUMENT_TYPE_OWNER_ROLE: Record<DocumentType, AgentRole> = {
  prd: "pm",
  requirements_review: "qa",
  user_flow: "designer",
  design_spec: "designer",
  wireframe: "designer",
  design_mockup: "designer",
  architecture: "architect",
  api_spec: "backend",
  db_schema: "architect",
  test_plan: "qa",
  project_plan: "coordinator",
};
