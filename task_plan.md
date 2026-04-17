# Task Plan: Requirements QA Artifact Alignment

## Goal
让 `requirements` 阶段的 QA 输出作为独立结构化文档落库并显示在右侧，同时保持 `delivery` 阶段继续使用 `test_plan`。

## Current Phase
Phase 5

## Phases
### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define technical approach
- [x] Decide new document type and its scope
- [x] Document decisions with rationale
- **Status:** complete

### Phase 3: Implementation
- [x] Add new requirements QA document type through shared types/catalog
- [x] Update QA prompting and sync logic for phase-specific output
- [x] Update right-side document panel and related guidance
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Verify requirements QA output now appears in the document panel
- [x] Verify delivery QA still maps to `test_plan`
- [x] Document results in progress.md
- **Status:** complete

### Phase 5: Delivery
- [x] Review touched files
- [x] Summarize behavior change and residual risks
- [x] Deliver to user
- **Status:** complete

## Key Questions
1. 新的 requirements QA 文档类型应该叫什么，才能和 `delivery` 的 `test_plan` 清晰区分？
2. 右侧“当前阶段”是只展示必交付，还是也展示当前阶段生成的非必交付结构化文档？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 为 requirements QA 新增独立文档类型，而不是复用 `test_plan` | 当前阶段的产物是评审补充物，不是交付阶段测试方案 |
| 保持 `requirements` 阶段必交付仍只有 `prd` | 避免打断现有 PM -> QA 两步 gate 流程 |
| 显式把 `phase` 注入聊天和文档生成 prompt | QA 现在需要根据阶段选择不同的结构化模板 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- 不改动现有 `delivery -> test_plan` 语义。
- 需要保证聊天结束后的自动刷新链路继续生效。
