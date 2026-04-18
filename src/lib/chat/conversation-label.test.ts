import assert from "node:assert/strict";
import test from "node:test";
import type { ConversationSummary } from "@/types";

function createConversation(
  overrides: Partial<ConversationSummary> = {}
): ConversationSummary {
  return {
    id: "conversation-1",
    projectId: "project-1",
    role: "designer",
    phase: "design",
    createdAt: "2026-04-18T18:00:00+08:00",
    title: null,
    label: "新对话",
    messageCount: 0,
    lastMessageAt: null,
    isEmpty: true,
    starterPrompt: null,
    ...overrides,
  };
}

test("applyConversationPromptTracking keeps explicit suggestion title for tabs", async () => {
  const { applyConversationPromptTracking } = await import(
    new URL("./conversation-label.ts", import.meta.url).href
  );

  const updated = applyConversationPromptTracking(
    [createConversation()],
    "conversation-1",
    "这轮请继续维护同一份设计阶段正式产出文档，而不是新开一套彼此独立的设计结论。",
    "用户流程"
  );

  assert.equal(updated[0]?.title, "用户流程");
  assert.equal(updated[0]?.label, "用户流程");
  assert.equal(updated[0]?.starterPrompt, "这轮请继续维护同一份设计阶段正式产出文档，而不是新开一套彼此独立的设计结论。");
});

test("applyConversationPromptTracking keeps existing explicit title on later prompts", async () => {
  const { applyConversationPromptTracking } = await import(
    new URL("./conversation-label.ts", import.meta.url).href
  );

  const updated = applyConversationPromptTracking(
    [
      createConversation({
        title: "页面结构",
        label: "页面结构",
        isEmpty: false,
        messageCount: 2,
        starterPrompt: "请先拆页面和信息架构",
      }),
    ],
    "conversation-1",
    "继续补一下组件层级和布局分区。",
    null
  );

  assert.equal(updated[0]?.title, "页面结构");
  assert.equal(updated[0]?.label, "页面结构");
  assert.equal(updated[0]?.messageCount, 2);
});

test("formatConversationTabLabel falls back to a short prompt summary", async () => {
  const { formatConversationTabLabel } = await import(
    new URL("./conversation-label.ts", import.meta.url).href
  );

  assert.equal(
    formatConversationTabLabel(
      null,
      "请基于当前需求和用户流程，输出一版页面结构与线框说明，覆盖页面清单、布局分区、核心组件和关键交互。"
    ),
    "请基于当前需求和用户流..."
  );
});
