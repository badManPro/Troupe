# Task Plan

## Goal
在产品经理的头脑风暴对话里加入“收敛度提示”，让用户能看到当前进度、可停线和理想线，并知道还差什么才适合停止继续聊天。

## Phases
- [complete] 盘点聊天页、阶段栏和现有流式状态，确认“脑暴收敛度”应挂载在聊天区顶部而不是复用模型状态条。
- [complete] 实现基于对话内容的轻量收敛度分析，并在 `brainstorm + pm` 场景展示当前进度、可停线、理想线和缺口项。
- [complete] 运行类型校验，确认新 UI 不影响现有聊天恢复和项目页刷新逻辑。

## Errors Encountered
- `src/app/project/[id]/page.tsx` 中 `handleDocumentGenerated` 引用了尚未声明的 `fetchProject`。调整回调声明顺序后解决。
- `src/lib/chat/brainstorm-progress.ts` 中使用了 `s` 正则标志，当前 TypeScript 目标不接受。改为 `[\s\S]` 跨行匹配后解决。
