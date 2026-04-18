# Progress Log

## Session: 2026-04-18

### Phase 1: Discovery
- **Status:** complete
- **Started:** 2026-04-18
- Actions taken:
  - 对照现有 `codex` bridge、`claude` provider 和设置页，确认 CLI bridge 的接入点。
  - 验证本机 `claude` CLI 可用且已登录。
  - 直接试跑 `json` / `stream-json` 两种输出格式，确认聊天和单次生成都能覆盖。
- Files created/modified:
  - `task_plan.md` (rewritten)
  - `findings.md` (rewritten)
  - `progress.md` (rewritten)

### Phase 2: Planning
- **Status:** complete
- Actions taken:
  - 决定保持 `claude` 作为单一 provider，并通过 `claude_execution_mode` 控制 CLI / API 选择。
  - 确定先写纯 helper 测试，锁住 CLI JSON 解析和执行策略，再写实现。
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 3: Implementation
- **Status:** complete
- Actions taken:
  - 新增 `src/lib/ai/claude-cli-utils.ts`，封装执行模式解析、auth 输出解析和 `stream-json` 事件提取。
  - 新增 `src/lib/ai/claude-cli.ts`，封装 Claude CLI 状态探测、单次执行和流式执行。
  - 更新 `src/lib/ai/claude.ts`，把 CLI 状态、实际 transport 和 execution error 合并进 `/api/claude/status`。
  - 更新 `chat` / `documents/generate` / `diagram-preview` 三个入口，在 `claude` provider 下优先走 CLI bridge。
  - 更新设置页，新增 Claude 执行模式选择、CLI 状态展示和即时刷新。
- Files created/modified:
  - `src/lib/ai/claude-cli-utils.ts`
  - `src/lib/ai/claude-cli.ts`
  - `src/lib/ai/claude.ts`
  - `src/app/api/chat/route.ts`
  - `src/app/api/documents/generate/route.ts`
  - `src/app/api/diagram-preview/route.ts`
  - `src/app/settings/page.tsx`

### Phase 4: Verification
- **Status:** complete
- Actions taken:
  - 按 TDD 先跑 `src/lib/ai/claude-cli.test.ts` 红灯，再补 helper 绿灯。
  - 运行 `node --test src/lib/ai/claude-cli.test.ts src/lib/ai/claude.test.ts`。
  - 运行 `npx tsc --noEmit --pretty false`。
  - 复核 `npm run lint` 失败仍是仓库现有脚本问题，不是本轮引入。
- Files created/modified:
  - `src/lib/ai/claude-cli.test.ts`
  - `progress.md`

### Phase 5: Delivery
- **Status:** complete
- Actions taken:
  - 复查 `git status`，确认存在用户/既有改动的其他文件未被回滚。
  - 整理 residual risk、验证结果和交付说明。
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Claude CLI JSON smoke test | `claude -p --output-format json "reply with exactly the word pong"` | 返回 `result=pong` | 已通过 | ✓ |
| Claude CLI stream-json smoke test | `claude -p --verbose --output-format stream-json --include-partial-messages ...` | 出现 `content_block_delta.text` | 已通过 | ✓ |
| Claude CLI auth status | `claude auth status --json` | 已登录状态可解析 | 已通过 | ✓ |
| Claude CLI helper tests | `node --test src/lib/ai/claude-cli.test.ts src/lib/ai/claude.test.ts` | 新旧 Claude helper 行为都通过 | 9 tests passed | ✓ |
| Type check | `npx tsc --noEmit --pretty false` | 所有改动可通过 TypeScript 校验 | 已通过 | ✓ |
| Repo lint | `npm run lint` | 若脚本正常，应完成 lint | 仍失败于 `next lint` 参数解析问题 | ! |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-04-18 | `claude -p` 普通 stdin 输入报 “Input must be provided...” | 1 | 先改用 prompt argument，不阻塞 bridge 实现 |
| 2026-04-18 | `stream-json` 缺少 `--verbose` 时直接报错 | 1 | 聊天 bridge 固定附带 `--verbose` |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 5: Delivery |
| Where am I going? | 无剩余实施步骤，准备交付变更说明 |
| What's the goal? | 让 Troupe 的 Claude provider 支持官方 Claude CLI bridge |
| What have I learned? | 官方 Claude CLI 已足够支撑 Troupe 的聊天与单次文档/图表生成桥接 |
| What have I done? | 已完成实现、跑通测试与 typecheck，并记录 lint 脚本现状 |
