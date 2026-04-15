# Findings

- 仓库包含 `src/app/api/codex/*`、`src/lib/ai/*`、`src/app/api/chat/route.ts`、`src/app/api/projects/[id]/conversations/route.ts`，问题很可能集中在这些链路。
- `src/app/api/codex/login/route.ts` 直接实现了对 `https://auth.openai.com` 的 OAuth PKCE 登录，并把返回 token 落到 `~/.codex/auth.json`。
- `src/lib/ai/codex.ts` 会读取 `~/.codex/auth.json`，把 `access_token` 或 `OPENAI_API_KEY` 直接作为 `createOpenAI({ apiKey })` 的 `apiKey` 使用。
- `src/lib/ai/provider.ts` 在 `ai_provider === "codex"` 时，会走 `provider.responses(model)`；`/api/chat` 全量依赖这条 provider 链路。
- `src/app/settings/page.tsx` 当前文案和交互明确宣称 “Codex (OAuth) / 使用 ChatGPT 账号登录”，这是把 ChatGPT Plus 订阅和 API 使用权限混为一谈的源头。
- 本机已安装并登录官方 `codex` CLI；`codex exec --json` 能非交互返回结果，适合作为 Troupe 在 “只有 ChatGPT Plus/Pro、没有 API key” 场景下的真正执行后端。
- 官方帮助中心当前明确区分 ChatGPT 订阅与 API 计费/凭证；因此正确方案不是继续伪造 OAuth token 为 API key，而是复用官方 Codex CLI 登录态。
- 重写后的架构改为：
  - 登录：`/api/codex/login` 调官方 `codex login --device-auth`
  - 对话：`/api/chat` 在 Codex 模式下调用 `codex exec`
  - 文档生成：`/api/documents/generate` 在 Codex 模式下也调用 `codex exec`
  - UI：设置页明确区分 `OpenAI API` 与 `Codex CLI`
