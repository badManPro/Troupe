# Task Plan: Claude CLI Bridge

## Goal
让 `claude` provider 在 Troupe 中可通过官方 Claude CLI 执行对话、文档生成和 Mermaid 预览，避免依赖仅支持官方 CLI 的第三方网关。

## Current Phase
Phase 5

## Phases
### Phase 1: Discovery
- [x] 确认当前 Claude 路径依赖 `@ai-sdk/anthropic` + 网关配置
- [x] 验证本机 `claude` CLI 已安装且已登录
- [x] 确认 `claude -p` 的 `json` / `stream-json` 输出可用于 bridge
- **Status:** complete

### Phase 2: Planning
- [x] 决定继续复用 `claude` provider，而不是新增独立 provider 类型
- [x] 决定新增 Claude CLI helper，并按执行模式在 CLI / API 间切换
- [x] 确定先用纯 helper 测试锁住解析逻辑和执行策略
- **Status:** complete

### Phase 3: Implementation
- [x] 新增 Claude CLI 运行时 helper、状态读取和执行模式解析
- [x] 更新 chat / document / diagram 路由，在 `claude` provider 下优先走 CLI
- [x] 更新设置页和 `/api/claude/status`，展示 CLI 状态与执行模式
- **Status:** complete

### Phase 4: Testing & Verification
- [x] 先跑新增的 `node:test` 用例并观察红灯
- [x] 跑实现后的 `node:test` 与 `tsc --noEmit`
- [x] 记录无法使用的仓库级 lint / residual risk
- **Status:** complete

### Phase 5: Delivery
- [x] 复查改动边界，确认未触碰无关变更
- [x] 总结行为变化、验证结果和未覆盖项
- **Status:** complete

## Key Questions
1. `claude` provider 是否保留 API fallback？
2. 设置页是否显式暴露 CLI / API / auto 执行模式？
3. 聊天流是否直接消费 CLI 的 text delta，而不是二次模拟打字？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 继续复用现有 `claude` provider | 避免新增 DB 设置、UI 入口和 provider 分支，最小改动即可解决可用性问题 |
| 默认增加 `claude_execution_mode=auto` | 有 CLI 时优先走 CLI；无 CLI 时仍可回退到现有 API 路径 |
| CLI 调用禁用工具 | Troupe 已自行拼好上下文，不需要 Claude CLI 再发起文件/命令权限流程 |
| 聊天场景使用 `stream-json` | 能直接消费 `content_block_delta.text`，比当前 Codex 模拟流更准确 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `claude -p` 直接从 stdin 读取失败 | 1 | 改为 prompt argument；后续 bridge 先按 argv 方式实现 |
| `stream-json` 未加 `--verbose` 会报错 | 1 | 聊天 bridge 固定附带 `--verbose` |
| 仓库已有 planning 文件来自前一任务 | 1 | 直接重写为本任务状态，保留新一轮执行轨迹 |

## Notes
- 需要兼容当前用户已保存的 `claude_model` 设置。
- `claude auth login` 暂不确定是否适合网页内发起，优先做状态检测和执行桥接。
