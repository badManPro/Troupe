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

## 2026-04-17 收口/产出错位分析

- 当前“确认完成”是否可点，完全由前端 `analyzeChecklistProgress` 的启发式规则决定；只要 assistant 回复里命中 checklist 关键词，就可能把条目标成 `done`，不要求真实文档已持久化。
- `requirements` 阶段的 checklist 把 `prd` 文档和 assistant 文本命中视作同等完成信号，这会把“已经聊清楚”与“已经正式产出”混成一个状态。
- `phase-gate` 接口在服务端不校验产出物是否真实存在，也不校验当前阶段 checklist，只要前端按钮可点就能直接审批通过。
- 项目页顶部进度卡读取的 `availableDocumentTypes` 来自 `/api/projects/[id]`，而这个接口不会触发 `syncDerivedDocuments`；右侧文档面板读取的是 `/api/documents`，它会先做一次同步。两边天然不是同一个数据源。
- `syncDerivedDocuments` 目前只按 `document.type` 判断“是否已存在”，已有同类型文档时直接跳过，因此 requirements 阶段聊天里新输出的 PRD 无法覆盖 brainstorm 阶段旧的 PRD。
- 当前项目数据库中最新 `requirements / pm` 对话最后一条 assistant 消息已经输出完整 `# 产品需求文档 (PRD)`，但 documents 表里仍只有一条 `phase=brainstorm` 的 `prd` 记录，说明“聊天已产出”和“右侧文档落地”确实发生了断裂。
- `DocumentPanel` 在 `documents` 更新后只在 `activeDoc.id` 变化时才刷新 `editContent/editTitle`；如果同一文档记录被更新为新版本，右侧面板可能继续显示旧内容。
- PM 系统提示要求在需求定义阶段持续提醒“这个阶段会产出什么”，而 assistant 在输出完整 PRD 后又继续建议“进入两块高价值产出”，会让用户同时收到“已完成”和“还没完成”的混合信号。
