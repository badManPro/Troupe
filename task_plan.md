# Task Plan

## Goal
实现 AI 输出 Markdown 章节的“预览图”能力：保留正文内容，在合适标题旁显示预览按钮，点击后将该章节按需转换为 Mermaid 流程图并在弹窗中展示，覆盖聊天消息与文档预览两条链路。

## Phases
- [complete] 盘点聊天与文档 Markdown 渲染链路，确定标题按钮挂载点。
- [complete] 设计章节抽取与候选判定规则，确保不是只支持单份 PRD。
- [complete] 新增后端接口，复用当前 AI provider 将章节即时转换为 Mermaid 流程图。
- [complete] 新增 Mermaid 渲染弹窗，并接入聊天与文档的标题预览按钮。
- [complete] 运行类型校验，确认新增功能不会破坏现有渲染链路。

## Errors Encountered
- `npm install mermaid` 命中 `better-sqlite3` 的 `ENOTDIR rename` 错误，改为使用 `pnpm add mermaid` 完成实际依赖安装。
