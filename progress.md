# Progress

- 2026-04-16: 新任务开始，目标是优化 AI 对话框在长文本流式输出时出现的短暂卡顿。
- 2026-04-16: 已确认热点主要不在请求链路，而在前端渲染链路：长文本流式输出时会高频重复执行 Markdown 解析和章节映射。
- 2026-04-16: 已确认当前 `@ai-sdk/react` 版本支持 `experimental_throttle`，可直接降低消息更新派发频率。
- 2026-04-16: 已在 `ChatPanel` 上接入 `experimental_throttle`，并把“流式中的最后一条 assistant 消息”改成轻量纯文本预览，完成后再走正式 Markdown 渲染。
- 2026-04-16: `node node_modules/typescript/bin/tsc --noEmit --pretty false` 通过，聊天渲染链路改动未引入类型错误。
