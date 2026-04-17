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

## 2026-04-17 需求定义阶段的 QA 存在感分析

- 需求定义阶段虽然声明了两个角色 `pm` 和 `qa`，但项目页进入该阶段时默认激活的是第一个角色 `pm`，因此用户天然先被带到 PM 线程，而不是一个带分步引导的联合流程。
- 顶部和输入区的“建议”都是按当前 role 各自计算的；PM 线程只会给 PM 动作，QA 线程只会给 QA 动作，不会在 PM 收口后主动把下一步升级成“切到 QA 做评审”。
- “剩余几个建议”本质上是当前角色下的快捷入口，不是阶段必做清单；建议是否消失，只取决于用户是否发过近似 prompt 并收到回复，不代表阶段标准已全部满足。
- 需求定义阶段的服务端门禁只校验当前阶段必交付文档是否存在；对于该阶段，唯一硬门槛是 `prd`，没有把 QA 评审、验收标准、边界场景或风险清单纳入 approve 必选条件。
- 前端的 `确认完成` 可点条件是“当前 role 的进度 readyToStop 且必交付文档齐了”。因此当用户停留在 PM tab 时，只要 PM 视角已经收口并且 PRD 已落地，就可以直接完成整个 requirements 阶段，QA 不构成硬阻塞。
- QA 在当前实现里更像“强推荐的第二视角”而不是“需求定义阶段的必经角色”，这正是用户会感到 QA 存在感归零、到底要不要点 QA 没有明确答案的根因。

## 2026-04-17 Requirements 标准顺序流改造方案

- `requirements` 阶段应拆成两步门：`PM 收口` 与 `QA 评审`。其中 PM 完成是进入 QA 的前置条件，QA 完成是整个阶段 approve 的前置条件。
- `phase_gates.checklist` 目前没有承担实际语义，适合复用为 requirements 的子流程持久化状态；至少需要记住“PM 收口已完成”，避免刷新后又回到并列角色语义。
- PM 是否可进入下一步，服务端至少要同时校验两件事：当前阶段 `prd` 已落地，以及 PM 视角的 checklist 已达到 `readyToStop`。否则“生成了 PRD 草稿”仍可能被误判为已收口。
- QA 是否允许最终 approve，不应只看文档，因为 requirements 阶段没有 QA 专属文档；应直接复用现有 QA checklist 语义分析结果，要求 `边界/异常`、`验收标准`、`风险/开放问题` 三项收齐。
- 为了把顺序流讲明白，QA tab 在 PM 完成前应处于禁用态，而不是仅靠 note 文案提示“先让 PM 收住再回来”。
- 顶部阶段卡的主按钮需要从单一“确认完成”改成随阶段子步骤变化的动作：PM 侧显示“进入 QA 评审”，QA 侧在满足条件后才显示“确认完成”。
- 需求定义阶段重新进入时，默认角色应该跟随子流程走：PM 未完成时默认进 PM，PM 已完成但阶段未 approve 时默认进 QA。

## 2026-04-17 Requirements 标准顺序流已实现

- 新增 `src/lib/workspace/requirements-phase.ts` 作为 requirements 子流程的唯一状态源，统一计算 `canStartQa`、`canApprove` 和 `pmStepCompleted`。
- `/api/projects/[id]` 现在会返回 `phaseWorkflow`，项目页不再只靠当前打开的单个对话去猜 requirements 阶段是否已进入 QA。
- `/api/projects/[id]/phase-gate` 新增 `complete_requirements_pm` 动作，并在 requirements 的最终 `approve` 前强制校验两层条件：PM 子步骤已完成，且 QA checklist 已收齐。
- QA tab 现在在 PM 收口完成前不可进入；阶段卡按钮在 requirements 中会按步骤切换成“进入 QA 评审 / 继续 QA 评审 / 确认完成”。
- requirements 阶段重新打开时，如果 PM 子步骤已经完成，会默认落到 QA 角色，而不是继续回到 PM。
- 这次改造仍然没有新增 QA 专属文档门槛；QA 的完成定义继续使用现有语义 checklist，这样能保持当前数据模型不变，只把流程门禁补严。
