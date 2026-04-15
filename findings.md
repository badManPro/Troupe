# Findings

- 当前聊天前端 [src/components/chat/chat-panel.tsx](/Users/casper/Documents/try/Troupe/src/components/chat/chat-panel.tsx) 已基于 `useChat`，本身支持 UI stream；问题不在 transport，而在 Codex 分支的服务端返回方式。
- 当前 `Codex` 聊天分支 [src/app/api/chat/route.ts](/Users/casper/Documents/try/Troupe/src/app/api/chat/route.ts) 会先 `await runCodexPrompt(...)`，等完整文本拿到后再调用 `createStaticTextStreamResponse(...)`，因此首屏只有按钮 loading，没有 assistant 气泡或增量内容。
- 当前 `runCodexPrompt` [src/lib/ai/codex.ts](/Users/casper/Documents/try/Troupe/src/lib/ai/codex.ts) 只解析 `codex exec --json` 的最终 `item.completed` 事件，没有把中间生命周期事件暴露给上层。
- 本机在 2026-04-15 实测 `codex exec --json`，可稳定看到 `thread.started`、`turn.started`、最终 `item.completed`；未观测到消息级 text delta，因此在“保留 Codex CLI”的前提下做不到真正 token 级流式。
- `ai` SDK 的 `createUIMessageStream` 支持 `data-*` part，并允许同一 `id` 的数据 part 自动 reconcile 更新；这适合把“已发送 / 正在思考 / 正在组织回复 / 正在输出”作为 assistant 消息里的状态 part 推给前端。
- `ai` SDK 的 UI stream `error` chunk 会走客户端 `useChat().error`，因此即使改成即时流响应，也仍然可以保留现有错误展示和重试逻辑。
