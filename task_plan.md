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
