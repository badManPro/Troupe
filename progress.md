# Progress

- 2026-04-16: 读取现有聊天面板、需求定义引导卡和问卷/收敛度逻辑，确认“你可以这样开始”只在空态出现一次。
- 2026-04-16: 新增 `src/lib/chat/requirements-guide.ts`，把需求定义阶段的 guide 配置和 quick actions 抽成共享数据源，并加入基于历史消息的剩余建议计算逻辑。
- 2026-04-16: 新增 `src/components/chat/chat-prompt-suggestions.tsx`，在输入框上方渲染轻量建议条，展示剩余可执行建议。
- 2026-04-16: 更新 `src/components/chat/chat-panel.tsx`，让建议条只在需求定义阶段且 AI 空闲时显示，并在 AI 回复后自动移除已执行过的建议。
- 2026-04-16: 更新 `src/components/chat/requirements-guide-card.tsx`，保留阶段目标/讨论主题/产出物说明，把起手动作从空态大卡片移到输入框区域。
- 2026-04-16: `node node_modules/typescript/bin/tsc --noEmit --pretty false` 通过。
- 2026-04-16: `./node_modules/.bin/eslint ...` 失败，报错为 `TypeError: Converting circular structure to JSON`；已确认属于仓库现有 ESLint 配置问题。
