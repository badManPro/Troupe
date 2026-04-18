import assert from "node:assert/strict";
import test from "node:test";

const { extractQuestionnaireFromMessage } = await import(
  new URL("./questionnaire.ts", import.meta.url).href
);

test("extractQuestionnaireFromMessage parses bold numbered questions", () => {
  const message = `你描述的这个产品有一个非常清晰的核心洞察。

## 我看到几个需要对齐的关键问题

**1. 平台是什么？**

你提到了"桌宠"，这通常意味着桌面应用（macOS/Windows）。

**2. AI 上网调研资料这件事，期望做到什么程度？**

"AI 去网上调查分析，决定用什么教程/资料"。

**3. 桌宠的 MBTI 形象是什么形态？**

是像 Live2D 那样的 2D 角色动画，还是像素风/图标风？

**4. 用户的目标范围有边界吗？**

是专注"技能学习"，还是任何类型的目标都支持？

**5. 你自己是第一个用户吗？**

这个产品是先给自己用，还是一开始就面向更广用户？`;

  const questionnaire = extractQuestionnaireFromMessage(message);

  assert.ok(questionnaire);
  assert.equal(questionnaire.title, "回答这 5 个问题");
  assert.deepEqual(
    questionnaire.questions.map((question: { prompt: string }) => question.prompt),
    [
      "平台是什么？",
      "AI 上网调研资料这件事，期望做到什么程度？",
      "桌宠的 MBTI 形象是什么形态？",
      "用户的目标范围有边界吗？",
      "你自己是第一个用户吗？",
    ]
  );
});
