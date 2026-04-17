# Findings & Decisions

## Requirements
- 为 `requirements` 阶段 QA 增加独立结构化文档类型。
- 让 QA 这阶段的输出能被同步进 `documents` 表，并显示在项目页右侧。
- 保持 `delivery` 阶段 QA 的 `test_plan` 逻辑不变。
- 尽量让阶段文案、同步规则、文档展示和建议动作保持一致。

## Research Findings
- `requirements` 阶段 QA 指南当前定义的 deliverables 是“需求缺口/边界异常/验收标准/风险点”，且 `materialDocumentTypes` 为空，不要求正式测试方案文档。
- 右侧文档面板的“当前阶段必交付”在 `requirements` 只认 `prd`，但会额外列出 `phaseDocs` 中属于当前阶段的任何文档。
- 自动同步逻辑当前只会把 QA 输出识别成 `test_plan`，识别条件是 `# 测试方案` + `## 测试策略`。
- 项目页刷新会触发 `/api/projects/[id]`，而这个接口会先执行 `syncDerivedDocuments(id)`，所以问题不是没刷新，而是没同步出文档。
- 当前数据库里的 requirements QA 历史输出已经稳定使用 `# QA 审查结论` 结构，并带有缺口、边界、验收标准、风险和开放问题等章节，适合直接回填成结构化文档。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 新增 `requirements_review` 文档类型 | 名称直接表达 requirements 阶段 QA 评审结论，避免和 `test_plan` 混淆 |
| 让 QA agent system prompt 按 phase 输出不同模板 | 一个统一的 `# 测试方案` 模板会污染 requirements 阶段行为 |
| 保持 `requirements` 阶段必交付仍只有 `prd` | 这次先修“右侧不更新”和“产物语义错位”，不同时改变阶段 gate 规则 |
| `syncDerivedDocuments` 兼容识别现有 `# QA 审查结论` 文本 | 改完后无需用户重跑历史对话，旧项目刷新即可回填文档 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| `git status` 显示 `troupe.db-shm` 已被修改 | 视为运行态数据库文件，避免触碰 |

## Resources
- `/Users/casper/Documents/try/Troupe/src/lib/chat/phase-chat-guidance.ts`
- `/Users/casper/Documents/try/Troupe/src/lib/documents/sync.ts`
- `/Users/casper/Documents/try/Troupe/src/components/documents/document-panel.tsx`
- `/Users/casper/Documents/try/Troupe/src/lib/agents/roles/qa.ts`

## Visual/Browser Findings
- 无。
