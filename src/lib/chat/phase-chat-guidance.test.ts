import assert from "node:assert/strict";
import test from "node:test";

test("getConversationSuggestions hides design quick starts that already exist in other tabs", async () => {
  const { getConversationSuggestions, getPhaseChatGuide } = await import(
    new URL("./phase-chat-guidance.ts", import.meta.url).href
  );

  const guide = getPhaseChatGuide("design", "designer", {
    hasExistingPrd: true,
  });

  const documents = [
    {
      id: "doc-user-flow",
      projectId: "project-1",
      type: "user_flow",
      title: "用户流程",
      content: "# 用户流程",
      version: 1,
      phase: "design",
      createdAt: "2026-04-18T18:00:00+08:00",
      updatedAt: "2026-04-18T18:00:00+08:00",
    },
    {
      id: "doc-wireframe",
      projectId: "project-1",
      type: "wireframe",
      title: "线框图描述",
      content: "# 线框图描述",
      version: 1,
      phase: "design",
      createdAt: "2026-04-18T18:01:00+08:00",
      updatedAt: "2026-04-18T18:01:00+08:00",
    },
  ];

  const phaseConversations = [
    {
      id: "conversation-1",
      projectId: "project-1",
      role: "designer",
      phase: "design",
      createdAt: "2026-04-18T18:05:00+08:00",
      label: "梳理用户流程",
      messageCount: 4,
      lastMessageAt: "2026-04-18T18:06:00+08:00",
      isEmpty: false,
      starterPrompt:
        "请先根据当前需求帮我梳理完整的用户流程，指出关键节点、分支和需要重点设计的页面。",
    },
    {
      id: "conversation-2",
      projectId: "project-1",
      role: "designer",
      phase: "design",
      createdAt: "2026-04-18T18:07:00+08:00",
      label: "页面结构",
      messageCount: 3,
      lastMessageAt: "2026-04-18T18:08:00+08:00",
      isEmpty: false,
      starterPrompt:
        "请从设计阶段的角度先拆页面清单、信息架构和导航层级，告诉我每个页面要承载什么内容。",
    },
  ];

  const suggestions = (
    getConversationSuggestions as (...args: unknown[]) => Array<{ id: string; label: string }>
  )("design", "designer", guide, [], documents, phaseConversations);

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.id),
    ["action-design-visual-style"]
  );
});
