# Task Plan

## Goal
优化 AI 对话框在生成大量文字时的卡顿问题，降低流式输出阶段的主线程压力，同时保持现有聊天体验可用。

## Phases
- [complete] 盘点聊天流式更新、Markdown 渲染和消息列表刷新链路，确认长文本阶段的主线程热点。
- [complete] 调整聊天渲染策略，减少流式过程中高频且昂贵的整段 Markdown 解析。
- [complete] 运行类型校验，并整理本次优化带来的行为变化与后续余量。

## Errors Encountered
- 暂无。
