# Findings

- [src/components/chat/chat-panel.tsx](/Users/casper/Documents/try/Troupe/src/components/chat/chat-panel.tsx) 当前会在 assistant 流式输出的每次消息刷新时重渲染最后一条消息；如果直接挂 [src/components/chat/chat-markdown.tsx](/Users/casper/Documents/try/Troupe/src/components/chat/chat-markdown.tsx)，就会重复执行整段 `react-markdown` 解析和章节映射。
- [src/components/chat/chat-markdown.tsx](/Users/casper/Documents/try/Troupe/src/components/chat/chat-markdown.tsx) 除了 Markdown AST 解析外，还会额外执行 `createMarkdownDiagramSectionMap(content)`；这意味着文本越长，每个流式 chunk 的渲染成本越高。
- `@ai-sdk/react` 当前版本支持 `experimental_throttle`，可以直接降低 `useChat` 在前端派发消息更新的频率，不需要额外改 SDK 或自行写节流容器。
- 当前本地数据库里 assistant 单条消息长度已经接近 3k 字符；在流式模式下如果每个小 chunk 都触发一次 Markdown 全量重算，用户就会感知到“生成到后半段时界面卡一下”。
- 对于流式中的最后一条 assistant 消息，用户最关心的是“文字持续出现”，并不依赖实时 Markdown 排版；把流式阶段降级为轻量纯文本预览，等结束后再一次性转成 Markdown，能明显减少主线程抖动。
