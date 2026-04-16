# Task Plan

## Goal
把需求定义阶段的“你可以这样开始”改成输入框上方的持续建议条，只在 AI 空闲时展示，并根据已执行过的建议自动收起剩余项。

## Phases
- [complete] 盘点需求定义阶段的引导卡、聊天输入区和历史消息结构，确认起手建议当前只会在空态出现一次。
- [complete] 抽离需求定义阶段的引导配置，补充“建议已执行”的判定逻辑，并确保只有在 AI 回复后才视为完成。
- [complete] 在输入框上方实现轻量建议条，AI 生成中隐藏，生成完成后仅展示尚未执行过的建议。
- [complete] 运行类型检查并记录验证结果，同时记录 ESLint 的仓库级配置异常。

## Errors Encountered
- `rg` 直接读取 `src/app/project/[id]/page.tsx` 时，`zsh` 把方括号当成了 glob。改成带引号的路径后解决。
- `./node_modules/.bin/eslint ...` 在仓库当前配置下报 `TypeError: Converting circular structure to JSON`，属于现有 ESLint 配置问题，不是这次改动引入的类型错误。
