# Task Plan

## Goal
修复当前产品里错误的 Codex OAuth / ChatGPT Plus 登录假设，重写为可用的 OpenAI 接入与对话调用链。

## Phases
- [complete] 盘点当前实现：登录、设置、provider、chat/conversation 路由。
- [complete] 核对官方支持的身份与调用方式，避免继续把 ChatGPT Plus 当成 API 凭证。
- [complete] 重写后端与前端接入逻辑。
- [complete] 运行校验并记录剩余风险。

## Errors Encountered
- `npm run build` 首次在沙箱内失败，原因是 Next/Turbopack 拉取 Google Fonts 时网络受限；切换到沙箱外重跑后构建通过。
