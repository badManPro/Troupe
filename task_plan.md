# Task Plan

## Goal
把聊天区顶部的“对话建议”和“当前轮需产出材料/进度”做成所有阶段都可复用的统一模块，按 phase/role 动态适配，而不是只覆盖 `brainstorm` 和 `requirements`。

## Phases
- [complete] 盘点现有聊天引导、进度卡、阶段/角色/产出物配置，确认哪些信息适合收敛到统一 schema。
- [complete] 设计并实现统一的阶段聊天配置层，覆盖每个 phase/role 的目标、建议动作、讨论重点和应产出材料。
- [complete] 抽出通用顶部模块与建议条，让聊天面板按当前 phase/role 动态渲染，并保留头脑风暴专用进度分析能力。
- [complete] 运行类型检查，更新 findings/progress，并记录这次抽象的边界和后续可继续演进的点。

## Errors Encountered
- `node node_modules/typescript/bin/tsc --noEmit --pretty false` 首次失败，原因是新 checklist 进度分析里 `state` 被推断为普通 `string`。补上显式字面量类型后已解决。

## 2026-04-17 Current Investigation

### Goal
分析“需求定义阶段已显示可以收口/确认完成，但实际结构化产出未落地、右侧文档未同步、AI 文案仍提示继续产出”的体验错位，并形成细化优化方案。

### Phases
- [complete] 读取当前项目最近一次 requirements 对话、phase gate、文档记录，确认用户反馈是否与真实数据一致。
- [complete] 对照顶部阶段卡、聊天建议、右侧文档面板和文档同步逻辑，定位状态判断与文档落地链路的断点。
- [complete] 输出面向产品设计和实现的优化建议，覆盖状态机、文档同步、按钮 gating 和 AI 文案策略。
- [complete] 实现统一阶段产出状态、多会话 tab、底部产出建议新开独立对话、右侧文档即时同步，以及阶段审批服务端校验。

## 2026-04-17 Requirements Standard Flow Refactor

### Goal
把 `requirements` 阶段从“PM/QA 并列可选角色”重构为标准顺序流：先 PM 收口 PRD，再进入 QA 评审，最后才允许阶段完成。

### Phases
- [complete] 设计 requirements 子流程状态模型，明确哪些状态需要持久化，哪些状态可以动态计算。
- [complete] 实现服务端子流程 helper，并把 `/api/projects/[id]` 与 `/api/projects/[id]/phase-gate` 切到统一校验。
- [complete] 改造项目页、角色 tabs 和顶部阶段卡，让 QA 在 PM 完成前不可进入，且按钮文案按步骤变化。
- [complete] 运行类型检查，更新 findings/progress，记录这次从“推荐式 QA”切到“门禁式 QA”的边界。
