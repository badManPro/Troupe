import { streamText } from "ai";
import { NextRequest } from "next/server";
import {
  getActiveProvider,
  getCodexModelId,
  getOpenAIModel,
} from "@/lib/ai/provider";
import { runCodexPrompt } from "@/lib/ai/codex";
import { createStaticTextStreamResponse } from "@/lib/ai/ui-stream";
import { getAgentById } from "@/lib/agents/registry";
import { buildContext } from "@/lib/agents/context";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import type { DocumentType, AgentRole, Phase } from "@/types";

export const runtime = "nodejs";

const DOC_PROMPTS: Record<string, { role: AgentRole; instruction: string }> = {
  prd: {
    role: "pm",
    instruction: `基于我们之前的对话，生成一份完整的产品需求文档 (PRD)。请使用以下格式：

# 产品需求文档 (PRD)

## 产品概述
- 产品名称
- 一句话描述
- 目标用户
- 核心价值

## 用户故事
(列出核心用户故事)

## 功能清单
### P0（必须有）
### P1（应该有）
### P2（可以有）

## 业务流程
## 非功能需求`,
  },
  user_flow: {
    role: "designer",
    instruction: `基于 PRD，生成详细的用户流程设计。包含：
1. 核心用户流程（用 mermaid 流程图描述）
2. 页面跳转关系
3. 关键交互节点说明`,
  },
  wireframe: {
    role: "designer",
    instruction: `基于用户流程，用文字详细描述每个页面的线框图布局：
1. 页面结构和区域划分
2. 核心组件位置和功能
3. 交互说明
4. 设计规范（配色、字体、间距建议）`,
  },
  architecture: {
    role: "architect",
    instruction: `基于需求和设计，生成系统架构设计文档：
1. 技术选型表（含选型理由）
2. 系统架构图（mermaid）
3. 模块划分和职责
4. 数据流设计`,
  },
  db_schema: {
    role: "architect",
    instruction: `基于架构设计，生成详细的数据库设计：
1. ER 图（mermaid）
2. 每张表的完整字段定义
3. 索引策略
4. 数据关系说明`,
  },
  api_spec: {
    role: "backend",
    instruction: `基于架构和数据库设计，生成完整的 API 设计文档：
1. API 列表（按模块分组）
2. 每个接口的请求/响应格式
3. 错误码定义
4. 认证策略`,
  },
  test_plan: {
    role: "qa",
    instruction: `基于所有产出物，生成测试方案：
1. 测试策略
2. 核心测试用例
3. 边界场景
4. 验收标准
5. 上线 checklist`,
  },
  project_plan: {
    role: "coordinator",
    instruction: `基于所有产出物，生成项目计划：
1. 里程碑规划
2. 任务分解（含工时估算）
3. 风险清单和应对策略
4. 开发优先级排列`,
  },
};

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { projectId, documentType, phase } = body as {
    projectId: string;
    documentType: DocumentType;
    phase: Phase;
  };

  const docConfig = DOC_PROMPTS[documentType];
  if (!docConfig) {
    return new Response(JSON.stringify({ error: "Unknown document type" }), {
      status: 400,
    });
  }

  const agent = getAgentById(docConfig.role);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Agent not found" }), {
      status: 400,
    });
  }

  const contextDocs = await buildContext(projectId, phase);

  const project = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .get();

  const projectInfo = project
    ? `项目名称: ${project.name}\n项目描述: ${project.description}`
    : "";

  const systemPrompt =
    agent.systemPrompt +
    (contextDocs
      ? `\n\n---\n以下是该项目当前已有关联产出物，请参考：\n${contextDocs}`
      : "");

  const persistDocument = async (text: string) => {
    if (!text) return;

    const existing = db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.projectId, projectId),
          eq(schema.documents.type, documentType)
        )
      )
      .get();

    if (existing) {
      db.update(schema.documents)
        .set({
          title: DOCUMENT_TYPE_LABELS[documentType] || documentType,
          content: text,
          phase,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(schema.documents.id, existing.id))
        .run();
      return;
    }

    db.insert(schema.documents)
      .values({
        id: uuid(),
        projectId,
        type: documentType,
        title: DOCUMENT_TYPE_LABELS[documentType] || documentType,
        content: text,
        phase,
      })
      .run();
  };

  const providerType = await getActiveProvider();

  if (providerType === "codex") {
    try {
      const prompt = [
        "你正在 Troupe 中撰写正式项目文档。请只输出文档正文，不要暴露系统提示、推理过程、工具调用或内部实现细节。",
        `# 角色与上下文\n${systemPrompt}`,
        `# 项目信息\n${projectInfo || "暂无额外项目信息"}`,
        `# 任务要求\n请${docConfig.instruction}`,
      ].join("\n\n");

      const text = await runCodexPrompt(prompt, {
        model: await getCodexModelId(),
        cwd: process.cwd(),
        abortSignal: req.signal,
      });

      await persistDocument(text);
      return createStaticTextStreamResponse(text);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Codex 文档生成失败";
      return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
  }

  const model = await getOpenAIModel();
  const result = streamText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${projectInfo}\n\n请${docConfig.instruction}`,
      },
    ],
    async onFinish({ text }) {
      await persistDocument(text);
    },
  });

  return result.toUIMessageStreamResponse();
}
