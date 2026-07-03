import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuid } from "uuid"
import {
  type VelaDocument,
  type ChatMessage,
  type VelaSettings,
  type AgentToolCall,
  type AgentToolResult,
  type AgentToolName,
  DEFAULT_SETTINGS,
} from "./types"

const SAMPLE_DOC_CONTENT = `# Welcome to Vela

Vela is a **vibe-productive** word processor. The AI agent on the right can write, rewrite, and add tables to this document for you.

## Try asking the agent

- "Write a 3-paragraph product brief for a smart water bottle"
- "Rewrite the whole document in a more formal tone"
- "Insert a 3x4 table comparing three coffee blends"
- "Summarize this document into bullet points"

> Tip: open the **Settings** gear icon in the Agent panel to add your OpenRouter API key and pick a model.
`

function newDoc(title: string, content = ""): VelaDocument {
  const now = Date.now()
  return {
    id: uuid(),
    title,
    content,
    createdAt: now,
    updatedAt: now,
  }
}

interface VelaState {
  // Documents
  documents: VelaDocument[]
  activeDocId: string | null

  // Chat (per-document)
  /** keyed by document id */
  chats: Record<string, ChatMessage[]>

  // Settings
  settings: VelaSettings

  // UI
  isSettingsOpen: boolean
  isAgentBusy: boolean

  // ---- actions ----
  createDocument: (title?: string) => string
  deleteDocument: (id: string) => void
  selectDocument: (id: string) => void
  renameDocument: (id: string, title: string) => void
  updateDocumentContent: (id: string, content: string) => void
  getActiveDocument: () => VelaDocument | null

  // chat
  appendMessage: (docId: string, msg: ChatMessage) => void
  clearChat: (docId: string) => void

  // settings
  setSettings: (partial: Partial<VelaSettings>) => void
  setSettingsOpen: (open: boolean) => void
  setAgentBusy: (busy: boolean) => void

  // agent tools (executed against the active document)
  executeTool: (
    docId: string,
    call: AgentToolCall
  ) => Promise<AgentToolResult>
}

export const useVela = create<VelaState>()(
  persist(
    (set, get) => ({
      documents: [newDoc("Untitled document", SAMPLE_DOC_CONTENT)],
      activeDocId: null,
      chats: {},
      settings: DEFAULT_SETTINGS,
      isSettingsOpen: false,
      isAgentBusy: false,

      createDocument: (title = "Untitled document") => {
        const doc = newDoc(title, "")
        set((s) => ({
          documents: [...s.documents, doc],
          activeDocId: doc.id,
        }))
        return doc.id
      },

      deleteDocument: (id) => {
        set((s) => {
          const remaining = s.documents.filter((d) => d.id !== id)
          const newActive =
            s.activeDocId === id
              ? remaining[0]?.id ?? null
              : s.activeDocId
          const newChats = { ...s.chats }
          delete newChats[id]
          return {
            documents: remaining.length
              ? remaining
              : [newDoc("Untitled document", "")],
            activeDocId:
              newActive ??
              (remaining.length
                ? remaining[0].id
                : get().documents[0]?.id ?? null),
            chats: newChats,
          }
        })
      },

      selectDocument: (id) => set({ activeDocId: id }),

      renameDocument: (id, title) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, title, updatedAt: Date.now() } : d
          ),
        })),

      updateDocumentContent: (id, content) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, content, updatedAt: Date.now() } : d
          ),
        })),

      getActiveDocument: () => {
        const { documents, activeDocId } = get()
        if (!activeDocId) return documents[0] ?? null
        return documents.find((d) => d.id === activeDocId) ?? null
      },

      appendMessage: (docId, msg) =>
        set((s) => ({
          chats: {
            ...s.chats,
            [docId]: [...(s.chats[docId] ?? []), msg],
          },
        })),

      clearChat: (docId) =>
        set((s) => ({
          chats: { ...s.chats, [docId]: [] },
        })),

      setSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      setSettingsOpen: (open) => set({ isSettingsOpen: open }),

      setAgentBusy: (busy) => set({ isAgentBusy: busy }),

      executeTool: async (docId, call) => {
        const state = get()
        const doc = state.documents.find((d) => d.id === docId)
        if (!doc) {
          return {
            toolCallId: call.id,
            ok: false,
            message: "Document not found",
          }
        }

        const name = call.name as AgentToolName
        const args = call.args ?? {}

        try {
          switch (name) {
            case "set_title": {
              const title = String(args.title ?? "").trim()
              if (!title)
                return {
                  toolCallId: call.id,
                  ok: false,
                  message: "title is required",
                }
              get().renameDocument(docId, title)
              return {
                toolCallId: call.id,
                ok: true,
                message: `Title set to "${title}"`,
              }
            }
            case "write_document": {
              const content = String(args.content ?? "")
              get().updateDocumentContent(docId, content)
              return {
                toolCallId: call.id,
                ok: true,
                message: "Document replaced",
              }
            }
            case "append_content": {
              const content = String(args.content ?? "")
              const sep =
                doc.content && !doc.content.endsWith("\n") ? "\n\n" : ""
              get().updateDocumentContent(docId, doc.content + sep + content)
              return {
                toolCallId: call.id,
                ok: true,
                message: "Content appended",
              }
            }
            case "insert_table": {
              const rows = Number(args.rows ?? 0)
              const cols = Number(args.cols ?? 0)
              const headers = Array.isArray(args.headers)
                ? (args.headers as string[]).map(String)
                : []
              const data = Array.isArray(args.data)
                ? (args.data as unknown[][]).map((r) =>
                    r.map((c) => String(c))
                  )
                : []

              if (rows < 1 || cols < 1) {
                return {
                  toolCallId: call.id,
                  ok: false,
                  message: "rows and cols must be >= 1",
                }
              }

              const headerRow =
                headers.length === cols
                  ? headers
                  : Array.from({ length: cols }, (_, i) =>
                      headers[i] ?? `Column ${i + 1}`
                    )

              const bodyRows =
                data.length > 0
                  ? data
                  : Array.from({ length: Math.max(rows - 1, 0) }, () =>
                      Array.from({ length: cols }, () => "")
                    )

              const md =
                `| ${headerRow.join(" | ")} |\n` +
                `| ${headerRow.map(() => "---").join(" | ")} |\n` +
                bodyRows
                  .map(
                    (r) =>
                      `| ${Array.from({ length: cols }, (_, i) => r[i] ?? "").join(" | ")} |`
                  )
                  .join("\n")

              const sep =
                doc.content && !doc.content.endsWith("\n") ? "\n\n" : ""
              get().updateDocumentContent(docId, doc.content + sep + md)
              return {
                toolCallId: call.id,
                ok: true,
                message: `Inserted ${rows}x${cols} table`,
              }
            }
            case "clear_document": {
              get().updateDocumentContent(docId, "")
              return {
                toolCallId: call.id,
                ok: true,
                message: "Document cleared",
              }
            }
            case "get_document": {
              return {
                toolCallId: call.id,
                ok: true,
                message: `Title: ${doc.title}\n\n${doc.content}`,
              }
            }
            default:
              return {
                toolCallId: call.id,
                ok: false,
                message: `Unknown tool: ${name}`,
              }
          }
        } catch (err) {
          return {
            toolCallId: call.id,
            ok: false,
            message: `Error: ${(err as Error).message}`,
          }
        }
      },
    }),
    {
      name: "vela-store-v1",
      // Persist documents, chats, and settings (NOT transient UI flags)
      partialize: (s) => ({
        documents: s.documents,
        activeDocId: s.activeDocId,
        chats: s.chats,
        settings: s.settings,
      }),
      // Ensure there's always a valid active doc on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!state.documents || state.documents.length === 0) {
          const doc = newDoc("Untitled document", SAMPLE_DOC_CONTENT)
          state.documents = [doc]
          state.activeDocId = doc.id
        } else if (
          !state.activeDocId ||
          !state.documents.find((d) => d.id === state.activeDocId)
        ) {
          state.activeDocId = state.documents[0].id
        }
      },
    }
  )
)
