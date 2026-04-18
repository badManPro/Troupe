import assert from "node:assert/strict";
import test from "node:test";

interface SectionLookup {
  title: string;
  previewEligible: boolean;
}

test("QA review issue lists do not become diagram previews just because headings contain 流程", async () => {
  const { extractMarkdownDiagramSections } = await import(
    new URL("./diagram-preview.ts", import.meta.url).href
  );

  const markdown = `# QA 审查结论

## 边界场景与异常流程

### 初始化流程

- 用户在配置 CLI 时，CLI 已安装但未登录 / Token 失效 → 当前 PRD 没有区分这两种状态
- 用户输入的目标截止日期是过去日期或今天 → AI 如何生成路线？
- 用户完成初始化后想修改目标或时间 → 入口在哪？已生成的路线怎么处理？

### 每日任务生成

- 当日可用时间为 30 分钟，但 AI 生成了 3 小时任务 → 没有超时保护机制描述
- AI 返回的结构不符合预期格式 → UI 如何降级渲染？
- 用户在任务生成中途强制关闭应用 → 下次打开时处于什么状态？

## 最需要现在确认的开放问题

1. 遗留任务有没有上限？比如最多携带 N 张卡，超出的怎么处理？
2. 用户可以跳过某个步骤或某张任务卡吗？如果可以，对里程碑进度如何计算？
3. AI 返回格式非法时，如何处理？完全重试、部分渲染、还是整体报错？
4. 目标和时间参数能否事后修改？修改后已生成的路线和历史记录怎么处理？`;

  const sections = extractMarkdownDiagramSections(markdown);
  const initializationSection = sections.find(
    (section: SectionLookup) => section.title === "初始化流程"
  );
  const dailyTaskSection = sections.find(
    (section: SectionLookup) => section.title === "每日任务生成"
  );
  const openQuestionsSection = sections.find(
    (section: SectionLookup) => section.title === "最需要现在确认的开放问题"
  );

  assert.equal(initializationSection?.previewEligible, false);
  assert.equal(dailyTaskSection?.previewEligible, false);
  assert.equal(openQuestionsSection?.previewEligible, false);
});

test("user flow sections stay preview eligible when they describe actual sequential steps", async () => {
  const { extractMarkdownDiagramSections } = await import(
    new URL("./diagram-preview.ts", import.meta.url).href
  );

  const markdown = `## 用户流程

1. 用户打开应用并进入项目页
2. 系统展示今日任务和当前里程碑
3. 用户点击生成今日任务
4. 系统返回结构化任务卡并渲染结果`;

  const sections = extractMarkdownDiagramSections(markdown);

  assert.equal(sections[0]?.previewEligible, true);
});
