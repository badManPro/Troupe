# Findings

- 聊天消息渲染入口在 [src/components/chat/chat-markdown.tsx](/Users/casper/Documents/try/Troupe/src/components/chat/chat-markdown.tsx)，文档渲染入口在 [src/components/documents/markdown-viewer.tsx](/Users/casper/Documents/try/Troupe/src/components/documents/markdown-viewer.tsx)；两者都基于 `react-markdown`，适合在标题节点上挂通用按钮。
- AI 生成的正式文档本来就包含明显章节标题，例如 [src/app/api/documents/generate/route.ts](/Users/casper/Documents/try/Troupe/src/app/api/documents/generate/route.ts) 对 `user_flow` 文档已要求输出流程相关内容，因此“标题旁按钮”方案与现有内容结构兼容。
- 新增的章节抽取逻辑基于 Markdown 标题分段，并通过“标题关键词 + 有序列表/箭头/流程词”判断是否显示预览按钮，不会给所有标题都加按钮。
- 新的 [src/app/api/diagram-preview/route.ts](/Users/casper/Documents/try/Troupe/src/app/api/diagram-preview/route.ts) 复用了当前激活的 AI provider；这意味着无论用户当前选的是 Codex 还是 OpenAI，预览图生成都会走同一套配置。
- 预览图是按需生成的，没有改动消息或文档原文；按钮点开时才请求生成 Mermaid，避免无意义地为每条 AI 输出预先生成图片。
- Mermaid 前端渲染依赖需要真实安装到当前 `pnpm` 风格的 `node_modules` 中，仅更新 `package.json/package-lock.json` 不够。
- 误判根因在于旧规则把“标题包含流程词”与“正文里有多个列表项”混在一起判断，导致像“产品概述”“用户故事”“功能清单”这种普通章节也被判成可视化候选。
- 真实内容验证后，新的筛选规则把同一条 AI 输出中的候选范围收敛到了 `业务流程` 章节；其他章节均不再显示按钮。
- 已通过本地运行中的 `Next` 接口直接验证 `/api/diagram-preview`，它可以返回有效 Mermaid JSON，不是后端完全没生成图。
- Mermaid 渲染组件改成了浏览器端动态 `import("mermaid")`，比静态顶层导入更稳，能减少客户端实际打开弹窗时不出图的风险；渲染失败时也会直接展示错误和 Mermaid 源码，便于继续排查。
- 用户截图对应的直接根因是 [src/components/markdown/section-diagram-preview-button.tsx](/Users/casper/Documents/try/Troupe/src/components/markdown/section-diagram-preview-button.tsx) 中“打开弹窗”和“发起预览请求”分离了：按钮只 `setOpen(true)`，请求却依赖 `onOpenChange`，在当前受控用法下不会触发，因此弹窗里既没有 loading 也没有 error，只剩空白主体。
