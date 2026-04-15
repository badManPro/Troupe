import { streamText } from "ai";
import { NextRequest } from "next/server";
import { getModel } from "@/lib/ai/provider";
import { getAgentById } from "@/lib/agents/registry";
import { buildContext } from "@/lib/agents/context";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { v4 as uuid } from "uuid";
import { eq, asc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const { messages, projectId, conversationId, role: agentRole } = body;

  const agent = getAgentById(agentRole);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent role" }), {
      status: 400,
    });
  }

  const contextDocs = await buildContext(projectId, agent);

  const userMessage = messages[messages.length - 1];
  if (userMessage?.role === "user" && conversationId) {
    db.insert(schema.messages)
      .values({
        id: uuid(),
        conversationId,
        role: "user",
        content: userMessage.content,
      })
      .run();
  }

  const model = await getModel();

  const systemPrompt =
    agent.systemPrompt +
    (contextDocs
      ? `\n\n---\n以下是该项目之前阶段的产出物，请参考：\n${contextDocs}`
      : "");

  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
    async onFinish({ text }) {
      if (conversationId && text) {
        db.insert(schema.messages)
          .values({
            id: uuid(),
            conversationId,
            role: "assistant",
            content: text,
          })
          .run();
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
