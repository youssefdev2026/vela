# Vela

**Vela** is a vibe-productive word processor with an AI agent that writes, rewrites, and inserts tables into your document for you. v1 ships with a rich-text Markdown editor and an OpenRouter-powered agent — no spreadsheet, no slides, just words.

The app runs as:

1. A **Next.js web app** (for preview / browser use), and
2. A **desktop app** packaged with Electron (real `.exe` / `.dmg` / `.AppImage`).

---

## What's inside (v1)

- **Markdown word processor** — headings, lists, bold/italic, blockquotes, code, links, tables, with a toolbar.
- **AI Agent panel** — chat with an agent that can edit the document via tools:
  - `set_title` — rename the document
  - `write_document` — replace the whole document with new Markdown
  - `append_content` — append Markdown at the end
  - `insert_table` — insert a Markdown table (with headers and data)
  - `clear_document` — wipe the body
  - `get_document` — read the current state
- **Bring-your-own model** — paste your **OpenRouter API key** and pick a **model ID** in Settings (gear icon in the Agent panel). Your key is stored locally and sent only to OpenRouter.
- **Multi-document** — sidebar with as many documents as you want, persisted to `localStorage`.
- **Light / dark theme**.

---

## Quick preview (web)

The sandbox runs the Next.js dev server automatically. Open the **Preview Panel** on the right to use Vela in the browser.

> Open the gear icon in the **Agent** panel to add your OpenRouter API key and pick a model. Until you do, the agent won't be able to act.

---

## Build the desktop app (real `.exe`)

Vela is packaged as a desktop binary with **Electron + electron-builder**. You build it on your own machine — the sandbox is just for previewing.

### 1. Prerequisites

- **Node.js 20+** and **npm** (or `bun`)
- **Windows**: nothing extra needed to build a Windows `.exe`
- **macOS**: Xcode command-line tools (`xcode-select --install`)
- **Linux** (to build a Linux AppImage): `sudo apt install libarchive-tools`

### 2. Install dependencies

```bash
npm install
# or
bun install
```

This installs `electron`, `electron-builder`, `concurrently`, `wait-on`, and `cross-env`.

### 3. Run the Electron app in dev mode (hot-reload)

```bash
npm run electron:dev
```

This starts Next.js on port 3000, waits for it to be ready, then launches the Electron window pointing at it. Useful for testing desktop-only behavior.

### 4. Build a Windows installer (`.exe`)

On **Windows** (or cross-compile from macOS/Linux with electron-builder — note: cross-compiling Windows from macOS requires Wine):

```bash
npm run dist:win
```

Output: `dist-electron/Vela-Setup-1.0.0.exe` — a standard NSIS installer.

### 5. Build a macOS disk image (`.dmg`)

```bash
npm run dist:mac
```

Output: `dist-electron/Vela-1.0.0.dmg` (and a `.zip`).

### 6. Build a Linux AppImage / `.deb`

```bash
npm run dist:linux
```

Output: `dist-electron/Vela-1.0.0.AppImage` and `dist-electron/Vela-1.0.0.deb`.

### 7. Build for the current platform (auto-detect)

```bash
npm run dist
```

---

## How the build works

| Script | What it does |
|---|---|
| `build:web` | Sets `BUILD_FOR_ELECTRON=1`, then runs `next build` with `output: "export"`, producing a static site in `out/`. |
| `build:electron` | Runs `electron-builder` using `electron-builder.yml`. Packs `electron/main.cjs`, `electron/preload.cjs`, and `out/` into an asar bundle. |
| `dist:*` | Runs both: builds the web export, then packages for the target platform. |

### Customizing

- **App icon**: drop a `icon.ico` (Windows) / `icon.icns` (macOS) / `icon.png` (Linux, 512×512+) into `electron/build-resources/`. electron-builder will pick it up automatically.
- **App ID / name**: edit `electron-builder.yml`.
- **Default window size**: edit `electron/main.cjs`.
- **Agent system prompt**: override it in Settings → "Custom system prompt".

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  electron/main.cjs — BrowserWindow, menus, file:// loader    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js Static Export (out/index.html + JS bundles)         │
│  ┌──────────────┐ ┌─────────────┐ ┌──────────────────────┐   │
│  │ Sidebar      │ │ MDXEditor   │ │ Agent Chat           │   │
│  │ (doc list)   │ │ (Markdown   │ │  ↳ calls OpenRouter  │   │
│  │              │ │  + tables)  │ │    directly w/ tools │   │
│  └──────────────┘ └─────────────┘ └──────────────────────┘   │
│         │                  ▲              │                   │
│         ▼                  │              ▼                   │
│      Zustand store (persisted in localStorage)                │
│      documents[], chats{}, settings{ apiKey, modelId }       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (HTTPS, only when agent acts)
                 ┌────────────────────────┐
                 │  OpenRouter API        │
                 │  /chat/completions     │
                 └────────────────────────┘
```

The agent loop is in `src/lib/agent.ts`:

1. Send the document state + chat history to OpenRouter with the Vela tools.
2. If the model returns tool calls, execute them locally against the document.
3. Feed the tool results back to the model.
4. Repeat (max 8 iterations) until the model answers with no tool call.

---

## Privacy

- Your **OpenRouter API key** is stored in `localStorage` in the Electron app's user-data folder.
- The key is sent **only** to `https://openrouter.ai/api/v1/chat/completions`.
- Your **documents** are stored in `localStorage` and never leave your machine.
- No analytics, no telemetry.

---

## Roadmap

- v1: word processor + agent (this)
- v1.1: agent tool for in-place find/replace, image insertion from URLs
- v2: spreadsheet (Vela Sheets)
- v2.5: slides (Vela Stage)
- v3: agent can chain across documents

---

## License

MIT — do whatever you want with it.
