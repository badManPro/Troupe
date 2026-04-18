# Troupe

**The Multi-Agent OS for Product Design.**

Troupe 是一个本地 AI 多智能体产品开发工作台，帮助独立开发者将模糊想法逐步推进为可交付的产品方案。

> Dedicated to the creators who have a galaxy in their heads but struggle to find the first brick on the ground.

## Features

- **7 个专业 AI 角色** — 产品经理、UI/UX 设计师、架构师、前端工程师、后端工程师、QA 工程师、项目协调员
- **6 阶段工作流** — 头脑风暴 → 需求定义 → 设计 → 架构 → 开发规划 → 交付准备
- **阶段门禁** — 每个阶段确认完成后才进入下一阶段，避免跳跃式开发
- **文档自动生成** — AI 自动生成 PRD、设计规范、架构文档等，支持编辑和导出
- **纯本地运行** — 数据存储在本地 SQLite，不出本机
- **深色模式** — 支持亮色/暗色/跟随系统

## Data Storage

- Database location priority:
  - `DATABASE_PATH` environment variable
  - legacy `troupe.db` found in the current working directory or detected project root
  - a stable per-user app data path:
    - macOS: `~/Library/Application Support/Troupe/troupe.db`
    - Windows: `%APPDATA%/Troupe/troupe.db`
    - Linux: `${XDG_DATA_HOME:-~/.local/share}/troupe/troupe.db`
- This keeps project, document, and chat history available across app restarts even when the desktop app launches with a different working directory.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui + Framer Motion
- **AI**: Vercel AI SDK + OpenAI API / Codex CLI
- **Database**: SQLite + Drizzle ORM
- **Desktop**: Tauri v2 (optional)

## Getting Started

### Prerequisites

- Node.js >= 18
- One of:
  - An OpenAI API key, or
  - A logged-in Codex CLI session (for ChatGPT Plus/Pro users without API keys)

### Install & Run

```bash
# Install dependencies
npm install

# Run database migrations
npx drizzle-kit migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configure

1. Go to **Settings** (gear icon in the top right)
2. Choose one provider:
   - `OpenAI API`: enter your API key and select a model
   - `Codex CLI`: install the official Codex CLI and complete device login in Settings
3. Start creating projects!

### Tauri Desktop App (Optional)

Desktop mode now boots through the project script and will try to补齐 missing Rust/Tauri CLI dependencies before startup.

```bash
# Run as desktop app
npm run tauri:dev
```

Notes:
- macOS/Linux: if `cargo` is missing, the bootstrap script installs Rust via `rustup`
- Windows: if `cargo` is missing, the bootstrap script tries `winget` first, then `Chocolatey`
- If your OS prompts for additional native build tools, complete that installer once and rerun the same command

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── page.tsx            # Dashboard
│   ├── project/[id]/       # Project workspace
│   ├── settings/           # Settings page
│   └── api/                # API endpoints
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── chat/               # Chat panel
│   ├── workspace/          # Workspace components
│   └── documents/          # Document viewer/editor
├── lib/
│   ├── agents/             # Agent engine (registry, context, roles)
│   ├── ai/                 # OpenAI provider
│   └── db/                 # Database (Drizzle + SQLite)
└── types/                  # TypeScript types
```

## License

MIT
