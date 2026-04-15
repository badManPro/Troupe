# Findings

- 当前会话恢复链路已经存在：项目页 [src/app/project/[id]/page.tsx](/Users/casper/Documents/try/Troupe/src/app/project/[id]/page.tsx) 会按 `project + phase + role` 获取 conversation，再调用 [src/app/api/projects/[id]/messages/route.ts](/Users/casper/Documents/try/Troupe/src/app/api/projects/[id]/messages/route.ts) 拉取消息。
- 聊天消息已经真正落库：[src/app/api/chat/route.ts](/Users/casper/Documents/try/Troupe/src/app/api/chat/route.ts) 在用户发送和 assistant 完成回复时都会写入 `messages` 表；`conversations` 和 `messages` 表定义见 [src/lib/db/schema.ts](/Users/casper/Documents/try/Troupe/src/lib/db/schema.ts)。
- 丢失现象更像“换了数据库文件”而不是“没有保存消息”：数据库默认路径在 [src/lib/db/index.ts](/Users/casper/Documents/try/Troupe/src/lib/db/index.ts) 里取 `process.cwd()/troupe.db`。
- 迁移目录也同样依赖 `process.cwd()`：[src/lib/db/migrate.ts](/Users/casper/Documents/try/Troupe/src/lib/db/migrate.ts) 默认读取 `process.cwd()/drizzle`。
- 对桌面应用来说，重启后的工作目录不稳定是常见情况；一旦 `cwd` 变化，应用就会打开新的空 SQLite，前端虽然仍会执行恢复逻辑，但只能读到空项目/空会话，表现为“历史没了”。
- 仓库根目录当前已存在被忽略的旧库文件 `troupe.db`，因此修复时需要兼容已有数据，避免把开发期旧库直接“迁丢”；本轮实现会优先复用当前目录或检测到的项目根目录中的旧库。
- Next 的 `.next/standalone` 构建产物目录里也会复制出 `package.json`、`drizzle`，甚至可能带一份 `troupe.db`；数据库路径选择必须显式避开这个目录，否则会继续把构建产物当成真实用户数据源。
- 返回项目列表后再进入时，真正导致“记录没了”的更直接问题在 [src/app/project/[id]/page.tsx](/Users/casper/Documents/try/Troupe/src/app/project/[id]/page.tsx)：当前逻辑先 `setConversationId(conv.id)`，随后才异步拉取消息并 `setInitialMessages(...)`。
- [src/components/chat/chat-panel.tsx](/Users/casper/Documents/try/Troupe/src/components/chat/chat-panel.tsx) 使用 `useChat({ messages: seedMessages })`；`messages` 只在 `Chat` 实例初始化时作为初始值使用，后续 `initialMessages` prop 改变并不会自动把历史消息补回去。
- 这意味着页面在“会话 id 已有、消息还没回来”的瞬间就会挂载新的 `ChatPanel`，把聊天状态初始化为空，随后即使历史消息接口返回了，`useChat` 也不会自动同步，因此用户看到的是空白对话。
