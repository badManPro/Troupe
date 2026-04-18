import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getClaudeModelId } from "@/lib/ai/claude";
import {
  getResolvedClaudeTransport,
  runClaudePrompt,
} from "@/lib/ai/claude-cli";
import { formatClaudeError } from "@/lib/ai/claude-errors";
import {
  getActiveProvider,
  getClaudeModel,
  getCodexModelId,
  getOpenAIModel,
} from "@/lib/ai/provider";
import { runCodexPrompt } from "@/lib/ai/codex";

export const runtime = "nodejs";

const DIAGRAM_SYSTEM_PROMPT = `你是一个将产品/业务描述转换成 Mermaid 流程图的助手。

要求：
- 只输出 Mermaid 代码，不要输出解释、标题、代码围栏或额外文字。
- 固定使用 flowchart LR。
- 只保留主流程、关键分支和必要闭环，最多 10 个节点。
- 节点文案使用简洁中文，避免长句。
- 不得补充原文没有的业务事实。
- 如果存在设置、配置、可选项，优先作为旁路分支而不是主链路。
- 如果正文不是严格的流程，也要提炼成最有助于理解的顺序图。`;

function normalizeMermaid(raw: string) {
  let normalized = raw.trim();

  normalized = normalized
    .replace(/^```mermaid\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (/^mermaid\s+/i.test(normalized)) {
    normalized = normalized.replace(/^mermaid\s+/i, "").trim();
  }

  if (!/^flowchart\s+(LR|TD|TB|RL|BT)\b/i.test(normalized)) {
    throw new Error("模型未返回有效的 Mermaid 流程图代码。");
  }

  return normalized.replace(/^flowchart\s+\w+/i, "flowchart LR");
}

async function generateMermaidDiagram(
  prompt: string,
  abortSignal?: AbortSignal
) {
  const providerType = await getActiveProvider();

  if (providerType === "codex") {
    return runCodexPrompt(
      [DIAGRAM_SYSTEM_PROMPT, prompt, "只输出 Mermaid 代码。"].join("\n\n"),
      {
        model: await getCodexModelId(),
        cwd: process.cwd(),
        abortSignal,
      }
    );
  }

  if (providerType === "claude") {
    const transport = await getResolvedClaudeTransport();
    if (transport === "cli") {
      return runClaudePrompt(prompt, {
        model: await getClaudeModelId(),
        systemPrompt: DIAGRAM_SYSTEM_PROMPT,
        cwd: process.cwd(),
        abortSignal,
      });
    }
  }

  const model =
    providerType === "claude"
      ? await getClaudeModel()
      : await getOpenAIModel();
  const result = await generateText({
    model,
    system: DIAGRAM_SYSTEM_PROMPT,
    prompt,
    abortSignal,
  });

  return result.text;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title?: string;
      content?: string;
    };

    const title = body.title?.trim();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "缺少可转换的章节内容。" },
        { status: 400 }
      );
    }

    const prompt = [
      title ? `章节标题：${title}` : null,
      "章节正文：",
      content,
      "请将这段内容转换成 Mermaid 流程图。",
    ]
      .filter(Boolean)
      .join("\n\n");

    const rawMermaid = await generateMermaidDiagram(prompt, req.signal);

    return NextResponse.json({
      mermaid: normalizeMermaid(rawMermaid),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: formatClaudeError(error),
      },
      { status: 500 }
    );
  }
}
