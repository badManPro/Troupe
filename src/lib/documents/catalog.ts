import type { DocumentType, Phase } from "@/types";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  prd: "产品需求文档",
  user_flow: "用户流程",
  wireframe: "线框图描述",
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
