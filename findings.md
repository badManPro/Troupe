# Findings

- 当前聊天区顶部能力分成三套：`BrainstormProgressCard` 只服务 `brainstorm`，`RequirementsGuideCard` 只服务 `requirements` 空态，`ChatPromptSuggestions` 只服务 `requirements` 输入区。
- 这三套能力的底层诉求其实一致：告诉用户“这个模块现在要做什么、可以怎么继续、完成后要沉淀什么、目前推进到什么程度”。
- 最稳定的配置维度是 `phase + role`，因为阶段决定主目标和文档产出，角色决定视角差异；像 `requirements` 的 PM / QA 就明显需要不同内容。
- “产出材料”已经有可复用信号源：`PHASE_DOCUMENT_TYPES`、agent `outputTemplates`、现有文档列表、聊天消息数和特定阶段分析器。
- 进度不能一刀切只用消息轮数。`brainstorm` 已有较强的语义分析，应保留为专用 analyzer；其它阶段更适合用“已讨论项 + 已生成文档”的轻量 checklist 进度。
- 最终实现采用了“统一 guide config + 通用顶部卡片 + 通用建议条 + 可插拔 analyzer”的结构，避免继续在组件层复制文案和逻辑。
- 头脑风暴阶段继续复用原有收敛度分析，其他阶段改为基于关键词/文档落地状态的 checklist 进度，这样动态性够用，同时复杂度可控。
- `availableDocumentTypes` 从项目页统一下发到聊天面板后，顶部卡片就能在所有阶段展示“关键材料是否已落地”，不需要每个模块自己查文档状态。
- 阶段控制入口也适合并到顶部进度卡，而不是留在底部独立 bar；这样“看进度 -> 判断是否可收口 -> 确认完成”会落在同一视觉区域。
- 当前这版的启用条件采用 `phaseProgress.readyToStop`，也就是只有当当前模块的进度分析达到“可以收口”时，`确认完成` 才可点击；未达到时只展示禁用态和提示文案。
