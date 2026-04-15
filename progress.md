# Progress

- 2026-04-15: 建立规划文件，开始检查当前 OAuth / provider / conversation 实现。
- 2026-04-15: 已确认现状是把 Codex OAuth token 当成 API key 走 `@ai-sdk/openai`，需要改成受支持的 API 凭证模式，并同步重写设置页文案与状态逻辑。
- 2026-04-15: 已将自定义 OAuth 改为官方 `codex login --device-auth`，并把 Codex 模式的聊天/文档生成改成通过 `codex exec` 执行。
- 2026-04-15: `npx tsc --noEmit` 通过；`npm run build` 在沙箱外通过。
