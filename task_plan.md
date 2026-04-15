# Task Plan

## Goal
在保留 `Codex CLI` 作为聊天执行后端的前提下，优化当前聊天交互：
- 用户发送后立刻出现 assistant 等待态，而不是只剩按钮 loading。
- 对 Codex 调用过程显示阶段状态。
- 在 Codex 返回完整结果后，使用分块输出提升“流式”体感。

## Phases
- [complete] 盘点当前聊天链路可扩展点，确定 `UIMessageStream` 与状态 part 的实现方式。
- [complete] 改造 Codex 聊天路由：即时返回流、推送状态更新、结果分块输出。
- [complete] 改造聊天面板：渲染 assistant 等待态、状态提示与更明确的生成中交互。
- [complete] 运行类型校验并记录剩余风险。

## Errors Encountered
- `npm run build` 曾在沙箱内失败，原因是 Next/Turbopack 拉取 Google Fonts 时网络受限；如本轮再次需要完整构建，可能仍需沙箱外执行。
