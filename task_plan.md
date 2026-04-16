# Task Plan

## Goal
分析 Troupe 中“头脑风暴 -> 需求定义”的衔接问题，并在需求定义模块内加入明确指引，让用户一进入阶段就知道要做什么、需要商讨什么、应该产出什么。

## Phases
- [complete] 盘点项目工作流、需求定义阶段角色职责、聊天空态和文档生成逻辑，确认问题不在数据结构而在阶段引导缺失。
- [complete] 为 `requirements` 阶段设计首屏引导方案，明确模块目标、讨论主题、阶段产出和可直接开聊的起手问题。
- [complete] 实现需求定义引导卡、阶段化欢迎语和输入框提示文案，并增强 PM / QA 的阶段提示词。
- [complete] 运行类型校验，确认新增引导不影响现有聊天流和会话恢复逻辑。

## Errors Encountered
- `ChatTranscript` 中的 `agentId` 初始仍按 `string` 处理，导致传给 `RequirementsGuideCard` 时类型不匹配。收紧为 `AgentRole` 后解决。
