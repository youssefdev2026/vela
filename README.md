# Vela

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Electron](https://img.shields.io/badge/Electron-33-47848F)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![License](https://img.shields.io/badge/license-MIT-green)

Vela is a desktop word processor with an embedded AI agent that writes, rewrites, and inserts tables directly into your document. You don't copy-paste generated text — the agent edits the document itself, through tool calls, while you talk to it in plain language.

Built as a Next.js 16 app wrapped in Electron, Vela ships as a real desktop app: `.exe` on Windows, `.dmg` on macOS, and `.AppImage`/`.deb` on Linux.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Agent Tools](#agent-tools)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Security Note](#security-note)
- [License](#license)

## Features

- **Agent-driven editing** — the AI renames, writes, appends, and tables-ifies your document directly via tool calls, not by generating text for you to paste in.
- **Full Markdown editor** — a `@mdxeditor/editor` instance with headings, lists, tables, code blocks, links, and blockquotes.
- **Multi-document workspace** — create, rename, search, and delete documents from the sidebar.
- **Bring your own model** — connects to OpenRouter, so you choose the model, temperature, and system prompt.
- **Local-first** — everything lives in `localStorage`; no backend, no database, no account.
- **Light/dark theme** via `next-themes`.

## Architecture
flowchart TD
    A["Electron — electron/main.cjs<br/>desktop shell, loads out/index.html"] --> B["Next.js Static Export — out/<br/>built with BUILD_FOR_ELECTRON=1"]
    B --> C["Single-page app at / — src/app/page.tsx"]
    C --> D["3-pane resizable layout"]
    D --> D1["Sidebar<br/>document list"]
    D --> D2["Markdown Editor<br/>@mdxeditor/editor"]
    D --> D3["Agent Chat<br/>OpenRouter"]
    D1 --> E["Zustand store — src/lib/store.ts<br/>persisted to localStorage"]
    D2 --> E
    D3 --> E
    E --> F["documents[], chats, settings<br/>(apiKey, modelId, temp, systemPrompt)"]
    D3 --> G["Agent loop — src/lib/agent.ts<br/>calls OpenRouter /chat/completions"]
    G --> H["Max 8 iterations:<br/>model proposes tool calls → execute locally → feed results back → repeat"]
