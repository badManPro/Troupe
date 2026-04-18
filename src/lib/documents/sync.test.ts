import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { eq } from "drizzle-orm";

test("syncDerivedDocuments extracts requirements review when QA uses alternate open-question headings", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "troupe-sync-"));
  process.env.DATABASE_PATH = path.join(tempDir, "troupe.db");

  try {
    const { ensureDb } = await import(new URL("../db/init.ts", import.meta.url).href);
    const { db, schema } = await import(new URL("../db/index.ts", import.meta.url).href);
    const { syncDerivedDocuments } = await import(
      new URL("./sync.ts", import.meta.url).href
    );

    ensureDb();

    db.insert(schema.projects)
      .values({
        id: "project-1",
        name: "AI 学习助手",
        description: "需求评审回归测试",
        phase: "requirements",
        createdAt: new Date("2026-04-18T17:30:00+08:00"),
        updatedAt: new Date("2026-04-18T17:30:00+08:00"),
      })
      .run();

    db.insert(schema.conversations)
      .values({
        id: "conversation-1",
        projectId: "project-1",
        role: "qa",
        phase: "requirements",
        createdAt: new Date("2026-04-18T17:59:00+08:00"),
      })
      .run();

    db.insert(schema.messages)
      .values({
        id: "message-1",
        conversationId: "conversation-1",
        role: "assistant",
        content: `# QA 审查结论

**结论**：当前 PRD 还需要补齐几个关键决策点，暂不建议直接进入设计阶段。

## 最优先补齐的缺口
- 任务状态流转未定义

## 关键边界场景与异常流程
- 用户连续缺席多天后重新打开应用时，遗留任务如何续接

## 验收标准建议
- 生成的任务总时长不得超过当日可用时间的 120%

## 核心风险
- AI 输出结构不稳定会直接影响前端渲染

## 还需要 PM 确认的问题
1. 遗留任务队列有没有上限？
2. 用户可以跳过某一步或某张任务卡吗？`,
        createdAt: new Date("2026-04-18T18:00:00+08:00"),
      })
      .run();

    syncDerivedDocuments("project-1");

    const document = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.type, "requirements_review"))
      .get();

    assert.ok(document);
    assert.match(document.content, /还需要 PM 确认的问题/);
    assert.match(document.content, /遗留任务队列有没有上限/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test("syncDerivedDocuments persists shared design spec and design mockup outputs", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "troupe-sync-design-"));
  process.env.DATABASE_PATH = path.join(tempDir, "troupe.db");

  try {
    const { ensureDb } = await import(new URL("../db/init.ts", import.meta.url).href);
    const { db, schema } = await import(new URL("../db/index.ts", import.meta.url).href);
    const { syncDerivedDocuments } = await import(
      new URL("./sync.ts", import.meta.url).href
    );

    ensureDb();

    db.insert(schema.projects)
      .values({
        id: "project-2",
        name: "AI 学习助手",
        description: "设计阶段回归测试",
        phase: "design",
        createdAt: new Date("2026-04-18T18:00:00+08:00"),
        updatedAt: new Date("2026-04-18T18:00:00+08:00"),
      })
      .run();

    db.insert(schema.conversations)
      .values({
        id: "conversation-2",
        projectId: "project-2",
        role: "designer",
        phase: "design",
        createdAt: new Date("2026-04-18T18:10:00+08:00"),
      })
      .run();

    db.insert(schema.messages)
      .values([
        {
          id: "message-2-1",
          conversationId: "conversation-2",
          role: "assistant",
          content: `# UI/UX 设计方案

## 设计理念
- 保持信息架构清晰，优先支撑日常学习主路径

## 用户流程图
- 首次启动先完成 Provider 配置，再进入每日学习循环

## 页面清单
### 页面 1：每日看板
- 展示今日任务、连续打卡和桌宠反馈

## 设计规范
- 配色以深色底 + 高亮强调色为主`,
          createdAt: new Date("2026-04-18T18:11:00+08:00"),
        },
        {
          id: "message-2-2",
          conversationId: "conversation-2",
          role: "assistant",
          content: `四个核心页面全部设计完成，效果一致且完整。

## 设计产出总览

### 🎨 设计系统
- 已建立颜色、圆角、阴影和状态变量

### 📱 四个核心页面
- 每日看板
- 任务执行详情
- Onboarding
- AI 路线生成中`,
          createdAt: new Date("2026-04-18T18:12:00+08:00"),
        },
      ])
      .run();

    syncDerivedDocuments("project-2");

    const designSpec = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.type, "design_spec"))
      .get();
    const designMockup = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.type, "design_mockup"))
      .get();
    const userFlow = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.type, "user_flow"))
      .get();
    const wireframe = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.type, "wireframe"))
      .get();

    assert.ok(designSpec);
    assert.match(designSpec.content, /# UI\/UX 设计方案/);

    assert.ok(designMockup);
    assert.match(designMockup.content, /## 设计产出总览/);
    assert.match(designMockup.content, /四个核心页面/);

    assert.ok(userFlow);
    assert.match(userFlow.content, /用户流程图/);

    assert.ok(wireframe);
    assert.match(wireframe.content, /页面清单/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});
