# Progress

- 2026-04-15: 新任务开始，目标是在保留 `Codex CLI` 的情况下改善聊天交互体感。
- 2026-04-15: 已确认前端 `useChat` 与 `OpenAI` 分支本身支持流式，卡点仅在 `Codex` 分支先等待完整文本再返回。
- 2026-04-15: 已确认 `codex exec --json` 仅提供生命周期事件和最终消息，没有消息级 delta；因此本轮策略改为“即时状态流 + 结果分块输出”的伪流式方案。
- 2026-04-15: 已将 `Codex` 聊天路由改成 `UIMessageStream`，在返回正文前先推送 assistant 状态 part，并在完整结果到达后按块输出文本。
- 2026-04-15: 已更新聊天面板，允许 assistant 在无 text 时先渲染状态卡片与等待点动画，不再只剩发送按钮 loading。
- 2026-04-15: `npx tsc --noEmit` 通过；`npm run build` 在沙箱内因 Google Fonts 网络受限失败，随后在沙箱外通过。
