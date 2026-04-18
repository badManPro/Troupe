# Findings & Decisions

## Requirements
- 用户希望把 Claude 集成改成官方 CLI bridge，而不是继续依赖 Anthropic-compatible HTTP 网关。
- 新桥接至少要覆盖三个现有 Claude 入口：聊天、文档生成、Mermaid 预览。
- 现有 `claude` provider 仍需保留模型选择体验，尽量避免新增一个平行 provider。

## Research Findings
- 当前 `claude` provider 只走 `@ai-sdk/anthropic`，聊天和文档接口没有 CLI 分支。
- 本机 `claude` CLI 已安装，版本是 `2.1.98 (Claude Code)`。
- `claude auth status --json` 返回：
  - `loggedIn: true`
  - `authMethod: "oauth_token"`
  - `apiProvider: "firstParty"`
- `claude -p --output-format json "..."` 可稳定返回 `result` 字段。
- `claude -p --verbose --output-format stream-json --include-partial-messages "..."` 会输出 JSONL 事件流：
  - `stream_event -> content_block_delta -> delta.text`
  - `assistant -> message.content[].text`
  - `result -> result`
- `stream-json` 必须配合 `--verbose`。
- `--tools ""` 可成功禁用工具执行，避免 CLI 进入权限/工具分支。
- `claude -p` 当前未能直接消费普通 stdin 文本；bridge 先按 prompt argument 方式实现更稳妥。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 新增 `src/lib/ai/claude-cli.ts` 承载 CLI 状态、JSONL 解析和执行 | 让 CLI 逻辑与 `claude.ts` 的网关/API 配置分离 |
| 新增 `claude_execution_mode` 设置：`auto` / `cli` / `api` | 允许渐进迁移；默认 `auto` 解决当前用户问题 |
| `auto` 模式优先 CLI，CLI 不可用时回退 API | 对已配置 Anthropic key / 网关的用户保持兼容 |
| 聊天路由使用自定义 `createUIMessageStream` | Claude CLI 不是 AI SDK model，不能直接塞给 `streamText` |
| 文档与图表生成使用 CLI 的单次 `json` 输出 | 这两处不需要 token 级流式，优先简化实现 |
| 设置页只展示 CLI 状态，不内嵌网页登录按钮 | `claude auth login` 的可编排设备流未验证，本轮避免做半成品登录 UX |

## Open Risks
- 大 prompt 通过 argv 传给 `claude -p` 有长度上限风险，但短中等项目上下文应可接受；如果后续遇到真实超限，再升级为 `stream-json` 输入模式。
- `claude auth login` 是否适合 web 内发起还未验证，本轮先不做网页登录按钮，只做状态展示和桥接。
- 仓库当前 `npm run lint` 脚本本身异常，不能作为此次改动的有效验证手段。
- Chat 路由当前把完整对话历史拼成单个 prompt 传给 CLI，与原先 API 路径的 message 数组语义不完全一致，但对现有 Troupe 角色对话应足够稳定。

## Implementation Summary
- 新增 `claude-cli-utils.ts` 和 `claude-cli.ts`，封装执行模式、CLI 状态、JSON/JSONL 解析及 prompt 执行。
- `chat` / `documents/generate` / `diagram-preview` 在 `claude` provider 下会先解析执行模式；若命中 CLI，则通过官方 `claude -p` 路径执行。
- 设置页现在展示 Claude CLI 安装/登录状态、当前实际 transport 和执行模式选择；保存后会立即刷新 Claude 状态。

## Resources
- `/Users/casper/Documents/project/Troupe/src/lib/ai/codex.ts`
- `/Users/casper/Documents/project/Troupe/src/lib/ai/claude.ts`
- `/Users/casper/Documents/project/Troupe/src/lib/ai/provider.ts`
- `/Users/casper/Documents/project/Troupe/src/app/api/chat/route.ts`
- `/Users/casper/Documents/project/Troupe/src/app/api/documents/generate/route.ts`
- `/Users/casper/Documents/project/Troupe/src/app/api/diagram-preview/route.ts`
- `/Users/casper/Documents/project/Troupe/src/app/settings/page.tsx`

## Command Evidence
- `claude --version` -> `2.1.98 (Claude Code)`
- `claude auth status --json` -> logged-in first-party OAuth
- `claude -p --output-format json "reply with exactly the word pong"` -> `result: "pong"`
- `claude -p --verbose --output-format stream-json --include-partial-messages "reply with exactly the word pong"` -> incremental `text_delta` events
